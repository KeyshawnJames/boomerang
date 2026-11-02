import json
import uuid
from collections.abc import Iterator
from datetime import timedelta
from types import SimpleNamespace

import pytest
import stripe
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlmodel import Session, select

from app.api.payments import get_stripe
from app.core.config import settings
from app.main import app
from app.models import ReturnRequest, ReturnStatus, ReturnStatusEvent
from app.models.base import utcnow
from app.services import status
from tests.test_payments import FakePaymentIntents, new_return, pay, payments
from tests.test_returns import setup as setup  # noqa: F401  the seed and an always-open counter

SECRET = "whsec_test"
SUCCEEDED = "payment_intent.succeeded"
FAILED = "payment_intent.payment_failed"


class FakeRefunds:
    def __init__(self) -> None:
        self.created: list[tuple[dict, dict]] = []
        self.error: stripe.StripeError | None = None

    def create(self, params: dict, options: dict) -> SimpleNamespace:
        if self.error:
            raise self.error
        self.created.append((params, options))
        return SimpleNamespace(id=f"re_{len(self.created)}")


@pytest.fixture
def refunds(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> Iterator[FakeRefunds]:
    monkeypatch.setattr(settings, "stripe_webhook_secret", SecretStr(SECRET))
    fake = FakeRefunds()
    app.dependency_overrides[get_stripe] = lambda: SimpleNamespace(
        # Real signature checking; only the network calls are faked.
        construct_event=stripe.StripeClient("sk_test_unused").construct_event,
        v1=SimpleNamespace(payment_intents=FakePaymentIntents(), refunds=fake),
    )
    yield fake


def deliver(
    client: TestClient,
    event_type: str,
    intent_id: str = "pi_1",
    amount_received: int = 699,
    secret: str = SECRET,
    headers: dict | None = None,
):
    payload = json.dumps(
        {
            "id": f"evt_{uuid.uuid4().hex}",
            "object": "event",
            "type": event_type,
            "data": {
                "object": {
                    "id": intent_id,
                    "object": "payment_intent",
                    "amount_received": amount_received,
                    "currency": "cad",
                }
            },
        }
    )
    if headers is None:
        headers = {
            "Stripe-Signature": stripe.WebhookSignature.generate_signature_header(payload, secret)
        }
    return client.post("/webhooks/stripe", content=payload, headers=headers)


def paid_return(client: TestClient) -> str:
    """A return with a pending $4.99 + $2 tip payment, PaymentIntent pi_1."""
    token, _, return_id = new_return(client)
    assert pay(client, token, return_id, {"tip": 200}).status_code == 200
    return return_id


def return_status(session: Session, return_id: str) -> ReturnStatus:
    return session.get(ReturnRequest, uuid.UUID(return_id), populate_existing=True).status


def events(session: Session, return_id: str) -> list[ReturnStatusEvent]:
    query = select(ReturnStatusEvent).where(ReturnStatusEvent.return_id == uuid.UUID(return_id))
    return list(session.exec(query).all())


def cancel(session: Session, return_id: str) -> None:
    return_request = session.get(ReturnRequest, uuid.UUID(return_id))
    status.transition(session, return_request, ReturnStatus.cancelled, return_request.client_id)
    session.flush()


@pytest.mark.parametrize(
    "kwargs",
    [
        {"secret": "whsec_someone_else"},
        {"headers": {}},
        {"headers": {"Stripe-Signature": "garbage"}},
    ],
)
def test_bad_signature_is_400(
    client: TestClient, session: Session, refunds: FakeRefunds, kwargs: dict
):
    return_id = paid_return(client)

    assert deliver(client, SUCCEEDED, **kwargs).status_code == 400
    [payment] = payments(session, return_id)
    assert payment.status == "pending"
    assert return_status(session, return_id) == ReturnStatus.awaiting_payment


def test_no_webhook_secret_refuses_everything(
    client: TestClient, session: Session, refunds: FakeRefunds, monkeypatch: pytest.MonkeyPatch
):
    return_id = paid_return(client)
    monkeypatch.setattr(settings, "stripe_webhook_secret", SecretStr(""))

    assert deliver(client, SUCCEEDED, secret="").status_code == 400
    assert return_status(session, return_id) == ReturnStatus.awaiting_payment


def test_succeeded_books_the_return_even_after_the_window(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    return_id = paid_return(client)
    return_request = session.get(ReturnRequest, uuid.UUID(return_id))
    return_request.created_at = utcnow() - timedelta(minutes=31)
    session.add(return_request)
    session.flush()

    assert deliver(client, SUCCEEDED).status_code == 200

    [payment] = payments(session, return_id)
    assert payment.status == "succeeded"
    assert return_status(session, return_id) == ReturnStatus.requested
    booked = [e for e in events(session, return_id) if e.status == ReturnStatus.requested]
    assert len(booked) == 1
    assert booked[0].actor_id is None  # Stripe, not a person
    assert refunds.created == []


def test_failed_keeps_the_return_waiting(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    return_id = paid_return(client)

    assert deliver(client, FAILED, amount_received=0).status_code == 200

    [payment] = payments(session, return_id)
    assert payment.status == "failed"
    assert return_status(session, return_id) == ReturnStatus.awaiting_payment


def test_duplicate_succeeded_changes_nothing(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    return_id = paid_return(client)
    assert deliver(client, SUCCEEDED).status_code == 200

    assert deliver(client, SUCCEEDED).status_code == 200

    assert len(events(session, return_id)) == 2  # awaiting_payment, requested
    assert refunds.created == []


def test_failed_then_succeeded_books(client: TestClient, session: Session, refunds: FakeRefunds):
    # The client's first card is declined and they try another in the same payment sheet.
    return_id = paid_return(client)
    assert deliver(client, FAILED, amount_received=0).status_code == 200

    assert deliver(client, SUCCEEDED).status_code == 200

    [payment] = payments(session, return_id)
    assert payment.status == "succeeded"
    assert return_status(session, return_id) == ReturnStatus.requested


def test_failed_arriving_after_succeeded_is_ignored(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    # Stripe doesn't promise to deliver events in order.
    return_id = paid_return(client)
    assert deliver(client, SUCCEEDED).status_code == 200

    assert deliver(client, FAILED, amount_received=0).status_code == 200

    [payment] = payments(session, return_id)
    assert payment.status == "succeeded"


def test_succeeded_for_a_cancelled_return_is_refunded(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    return_id = paid_return(client)
    cancel(session, return_id)

    assert deliver(client, SUCCEEDED).status_code == 200

    assert refunds.created == [({"payment_intent": "pi_1"}, {"idempotency_key": "refund-pi_1"})]
    [payment] = payments(session, return_id)
    assert payment.status == "refunded"
    assert return_status(session, return_id) == ReturnStatus.cancelled
    # A second delivery doesn't refund twice.
    assert deliver(client, SUCCEEDED).status_code == 200
    assert len(refunds.created) == 1


def test_wrong_amount_is_refunded_and_not_booked(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    return_id = paid_return(client)

    assert deliver(client, SUCCEEDED, amount_received=499).status_code == 200  # tip missing

    assert len(refunds.created) == 1
    [payment] = payments(session, return_id)
    assert payment.status == "refunded"
    assert return_status(session, return_id) == ReturnStatus.awaiting_payment


def test_refund_already_made_counts_as_refunded(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    # We refunded, then failed to save it; Stripe retries after its 24-hour duplicate guard.
    return_id = paid_return(client)
    cancel(session, return_id)
    refunds.error = stripe.InvalidRequestError(
        "already refunded", "charge", code="charge_already_refunded"
    )

    assert deliver(client, SUCCEEDED).status_code == 200

    [payment] = payments(session, return_id)
    assert payment.status == "refunded"


def test_refund_failure_is_503_and_writes_nothing(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    # Stripe sends the message again later, and the refund happens then.
    return_id = paid_return(client)
    cancel(session, return_id)
    refunds.error = stripe.APIConnectionError("no network")

    assert deliver(client, SUCCEEDED).status_code == 503

    [payment] = payments(session, return_id)
    assert payment.status == "pending"


def test_unknown_intents_and_other_events_are_ignored(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    return_id = paid_return(client)

    assert deliver(client, SUCCEEDED, intent_id="pi_not_ours").status_code == 200
    assert deliver(client, "payment_intent.created").status_code == 200

    [payment] = payments(session, return_id)
    assert payment.status == "pending"
    assert refunds.created == []
