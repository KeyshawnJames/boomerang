import uuid
from collections.abc import Iterator
from datetime import timedelta
from types import SimpleNamespace

import pytest
import stripe
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api.payments import get_stripe
from app.main import app
from app.models import Payment, PaymentStatus, ReturnRequest, ReturnStatus
from app.models.base import utcnow
from app.services import status
from tests.test_auth import bearer
from tests.test_returns import PHONE, booking, post, sign_in
from tests.test_returns import setup as setup  # noqa: F401  the seed and an always-open counter


class FakePaymentIntents:
    # Records what we ask Stripe for, so no test ever reaches the network.
    def __init__(self) -> None:
        self.created: list[dict] = []
        self.updated: list[tuple[str, dict]] = []
        self.error: stripe.StripeError | None = None

    def create(self, params: dict) -> SimpleNamespace:
        if self.error:
            raise self.error
        self.created.append(params)
        n = len(self.created)
        return SimpleNamespace(id=f"pi_{n}", client_secret=f"pi_{n}_secret")

    def update(self, intent_id: str, params: dict) -> SimpleNamespace:
        if self.error:
            raise self.error
        self.updated.append((intent_id, params))
        return SimpleNamespace(id=intent_id, client_secret=f"{intent_id}_secret")


@pytest.fixture
def intents(client: TestClient) -> Iterator[FakePaymentIntents]:
    fake = FakePaymentIntents()
    app.dependency_overrides[get_stripe] = lambda: SimpleNamespace(
        v1=SimpleNamespace(payment_intents=fake)
    )
    yield fake


def new_return(client: TestClient) -> tuple[str, uuid.UUID, str]:
    token, user_id = sign_in(client, phone=PHONE)
    created = post(client, token, booking(client, token, user_id))
    assert created.status_code == 201, created.text
    return token, user_id, created.json()["id"]


def pay(client: TestClient, token: str, return_id: str, body: dict, language: str = "en"):
    headers = {**bearer(token), "Accept-Language": language}
    return client.post(f"/returns/{return_id}/pay", json=body, headers=headers)


def payments(session: Session, return_id: str) -> list[Payment]:
    query = select(Payment).where(Payment.return_id == uuid.UUID(return_id))
    return list(session.exec(query).all())


def test_pay_creates_payment_intent_from_server_amount(
    client: TestClient, session: Session, intents: FakePaymentIntents
):
    token, user_id, return_id = new_return(client)

    response = pay(client, token, return_id, {"tip": 200, "amount": 1})  # amount is ignored

    assert response.status_code == 200, response.text
    assert response.json() == {"client_secret": "pi_1_secret", "total": 699}
    assert intents.created == [
        {
            "amount": 699,
            "currency": "cad",
            "allowed_payment_method_types": ["card"],
            "transfer_group": return_id,
            "metadata": {"return_id": return_id},
        }
    ]
    [payment] = payments(session, return_id)
    assert payment.client_id == user_id
    assert payment.stripe_payment_intent_id == "pi_1"
    assert payment.status == "pending"
    # ADR 0018: the driver gets 75% of the $4.99 fee plus the tip, Boomerang the rest of the fee.
    assert (payment.amount, payment.tip, payment.driver_payout, payment.platform_fee) == (
        499,
        200,
        574,
        125,
    )


def test_second_call_reuses_payment_and_updates_tip(
    client: TestClient, session: Session, intents: FakePaymentIntents
):
    token, _, return_id = new_return(client)
    assert pay(client, token, return_id, {"tip": 200}).status_code == 200

    response = pay(client, token, return_id, {"tip": 300})

    assert response.status_code == 200, response.text
    assert response.json() == {"client_secret": "pi_1_secret", "total": 799}
    assert len(intents.created) == 1
    assert intents.updated == [("pi_1", {"amount": 799})]
    [payment] = payments(session, return_id)
    assert (payment.tip, payment.driver_payout, payment.platform_fee) == (300, 674, 125)


def test_no_tip_is_the_default(client: TestClient, session: Session, intents: FakePaymentIntents):
    token, _, return_id = new_return(client)

    assert pay(client, token, return_id, {}).json()["total"] == 499
    [payment] = payments(session, return_id)
    assert (payment.tip, payment.driver_payout, payment.platform_fee) == (0, 374, 125)


def test_someone_elses_return_is_404(client: TestClient, intents: FakePaymentIntents):
    _, _, return_id = new_return(client)
    other, _ = sign_in(client)

    assert pay(client, other, return_id, {}).status_code == 404
    assert pay(client, other, str(uuid.uuid4()), {}).status_code == 404
    assert intents.created == []


def test_expired_return_is_refused(
    client: TestClient, session: Session, intents: FakePaymentIntents
):
    token, _, return_id = new_return(client)
    return_request = session.get(ReturnRequest, uuid.UUID(return_id))
    return_request.created_at = utcnow() - timedelta(minutes=31)
    session.add(return_request)
    session.flush()

    response = pay(client, token, return_id, {}, language="fr")

    # 410, not 409, so the app can tell it apart from a payment already going through.
    assert response.status_code == 410
    assert response.json()["detail"].startswith("Cette réservation a expiré")
    assert intents.created == []


def test_paid_return_is_refused(client: TestClient, session: Session, intents: FakePaymentIntents):
    token, user_id, return_id = new_return(client)
    status.transition(
        session, session.get(ReturnRequest, uuid.UUID(return_id)), ReturnStatus.requested, user_id
    )
    session.flush()

    assert pay(client, token, return_id, {}).status_code == 409
    assert intents.created == []


@pytest.mark.parametrize("tip", [-1, 5001])
def test_tip_out_of_range(client: TestClient, intents: FakePaymentIntents, tip: int):
    token, _, return_id = new_return(client)

    assert pay(client, token, return_id, {"tip": tip}).status_code == 422
    assert intents.created == []


def test_payment_already_going_through_is_409(
    client: TestClient, session: Session, intents: FakePaymentIntents
):
    # The card went through but the webhook hasn't arrived yet: Stripe won't change the amount.
    token, _, return_id = new_return(client)
    assert pay(client, token, return_id, {"tip": 100}).status_code == 200
    intents.error = stripe.InvalidRequestError(
        "unexpected state", "amount", code="payment_intent_unexpected_state"
    )

    response = pay(client, token, return_id, {"tip": 300})

    assert response.status_code == 409
    [payment] = payments(session, return_id)
    assert payment.tip == 100


def test_stripe_down_is_502_and_writes_nothing(
    client: TestClient, session: Session, intents: FakePaymentIntents
):
    token, _, return_id = new_return(client)
    intents.error = stripe.APIConnectionError("no network")

    response = pay(client, token, return_id, {}, language="fr")

    assert response.status_code == 502
    assert "paiement" in response.json()["detail"]
    assert payments(session, return_id) == []


def test_pay_needs_a_signed_in_client(client: TestClient, intents: FakePaymentIntents):
    assert client.post(f"/returns/{uuid.uuid4()}/pay", json={}).status_code == 401


def test_pay_after_a_decline_reuses_the_same_payment(
    client: TestClient, session: Session, intents: FakePaymentIntents
):
    # A second PaymentIntent could be charged alongside the first one.
    token, _, return_id = new_return(client)
    assert pay(client, token, return_id, {"tip": 100}).status_code == 200
    [payment] = payments(session, return_id)
    payment.status = PaymentStatus.failed
    session.add(payment)
    session.flush()

    response = pay(client, token, return_id, {"tip": 300})

    assert response.status_code == 200, response.text
    assert len(intents.created) == 1
    assert intents.updated == [("pi_1", {"amount": 799})]
    session.refresh(payment)
    assert (payment.status, payment.tip) == ("pending", 300)
