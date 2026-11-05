import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.dev import make_job
from app.models import PaymentStatus, ReturnStatus
from app.services.jobs import postal_area
from tests.test_payments import payments
from tests.test_returns import setup as setup  # noqa: F401  the seed and an always-open counter
from tests.test_returns import sign_in
from tests.test_webhooks import events


@pytest.mark.parametrize(
    ("address", "area"),
    [
        ("1 Place Ville-Marie, Montréal, QC H3B 2B6, Canada", "H3B"),
        ("1 Place Ville-Marie, Montréal (Québec) H3B 2B6, Canada", "H3B"),
        ("5 rue Saint-Viateur O, Montréal h2t1a1", "H2T"),
        ("1 Place Ville-Marie, Montréal, QC, Canada", ""),
    ],
)
def test_postal_area(address: str, area: str):
    assert postal_area(address) == area


def client_email(client: TestClient) -> str:
    token, _ = sign_in(client)
    return client.get("/me", headers={"Authorization": f"Bearer {token}"}).json()["email"]


def test_make_job_creates_a_paid_requested_return(client: TestClient, session: Session):
    job = make_job(session, client_email(client))
    session.flush()

    assert job.status == ReturnStatus.requested
    assert [e.status for e in events(session, str(job.id))] == [
        ReturnStatus.awaiting_payment,
        ReturnStatus.requested,
    ]
    [payment] = payments(session, str(job.id))
    assert payment.status == PaymentStatus.succeeded
    assert payment.stripe_payment_intent_id.startswith("pi_dev_")
    # ADR 0018: 75% of the $4.99 fee, no tip.
    assert (payment.tip, payment.driver_payout) == (0, 374)


def test_make_job_refuses_unknown_client(session: Session):
    with pytest.raises(SystemExit, match="nobody@example.com"):
        make_job(session, "nobody@example.com")
