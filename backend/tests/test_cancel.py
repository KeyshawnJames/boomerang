import uuid

import stripe
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import ReturnRequest, ReturnStatus
from app.services import status
from tests.test_auth import bearer
from tests.test_payments import new_return, pay, payments
from tests.test_returns import setup as setup  # noqa: F401  the seed and an always-open counter
from tests.test_returns import sign_in
from tests.test_webhooks import SUCCEEDED, FakeRefunds, deliver, events, return_status
from tests.test_webhooks import refunds as refunds  # noqa: F401  Stripe faked, signatures real

REFUND = ({"payment_intent": "pi_1"}, {"idempotency_key": "refund-pi_1"})


def cancel(client: TestClient, token: str, return_id: str, language: str = "en"):
    headers = {**bearer(token), "Accept-Language": language}
    return client.post(f"/returns/{return_id}/cancel", headers=headers)


def booked_return(client: TestClient) -> tuple[str, str]:
    """A return paid $4.99 + $2 tip through PaymentIntent pi_1, so it's requested."""
    token, _, return_id = new_return(client)
    assert pay(client, token, return_id, {"tip": 200}).status_code == 200
    assert deliver(client, SUCCEEDED).status_code == 200
    return token, return_id


def test_cancel_unpaid_return(client: TestClient, session: Session, refunds: FakeRefunds):
    token, user_id, return_id = new_return(client)

    response = cancel(client, token, return_id)

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "cancelled"
    assert refunds.created == []
    assert events(session, return_id)[-1].actor_id == user_id


def test_cancel_paid_return_refunds_fee_and_tip(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    token, return_id = booked_return(client)
    assert return_status(session, return_id) == ReturnStatus.requested

    response = cancel(client, token, return_id)

    assert response.status_code == 200, response.text
    # The whole PaymentIntent ($6.99), not just the fee.
    assert refunds.created == [REFUND]
    [payment] = payments(session, return_id)
    assert payment.status == "refunded"
    assert return_status(session, return_id) == ReturnStatus.cancelled


def test_cannot_cancel_someone_elses_return(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    _, return_id = booked_return(client)
    stranger, _ = sign_in(client)

    assert cancel(client, stranger, return_id).status_code == 404
    assert refunds.created == []
    assert return_status(session, return_id) == ReturnStatus.requested


def test_cannot_cancel_after_driver_accepts(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    # M6 builds this case: the tip comes back, the fee is kept (ADR 0018).
    token, return_id = booked_return(client)
    return_request = session.get(ReturnRequest, uuid.UUID(return_id))
    status.transition(session, return_request, ReturnStatus.driver_assigned, actor_id=None)
    session.flush()

    response = cancel(client, token, return_id, language="fr")

    assert response.status_code == 409
    assert response.json()["detail"] == "Ce retour est déjà annulé ou un chauffeur l'a accepté."
    assert refunds.created == []


def test_cancel_twice_refunds_once(client: TestClient, session: Session, refunds: FakeRefunds):
    token, return_id = booked_return(client)
    assert cancel(client, token, return_id).status_code == 200

    response = cancel(client, token, return_id)

    assert response.status_code == 409
    assert (
        response.json()["detail"] == "This return is already cancelled or a driver has accepted it."
    )
    assert refunds.created == [REFUND]


def test_refund_failure_changes_nothing(client: TestClient, session: Session, refunds: FakeRefunds):
    token, return_id = booked_return(client)
    refunds.error = stripe.APIConnectionError("no network")

    response = cancel(client, token, return_id)

    assert response.status_code == 502
    assert response.json()["detail"] == "Cancelling isn't working right now. Try again."
    [payment] = payments(session, return_id)
    assert payment.status == "succeeded"
    assert return_status(session, return_id) == ReturnStatus.requested


def test_already_refunded_counts_as_done(
    client: TestClient, session: Session, refunds: FakeRefunds
):
    # An earlier cancel refunded, then failed to save, and Stripe forgot the idempotency key.
    token, return_id = booked_return(client)
    refunds.error = stripe.InvalidRequestError(
        "already refunded", "charge", code="charge_already_refunded"
    )

    assert cancel(client, token, return_id).status_code == 200

    [payment] = payments(session, return_id)
    assert payment.status == "refunded"
    assert return_status(session, return_id) == ReturnStatus.cancelled
