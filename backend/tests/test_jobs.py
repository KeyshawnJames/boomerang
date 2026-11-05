import threading
import uuid
from collections.abc import Iterator
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, delete
from sqlmodel import Session

from app.dev import make_job
from app.drivers import approve
from app.models import (
    DriverProfile,
    Payment,
    PaymentStatus,
    Retailer,
    ReturnRequest,
    ReturnStatus,
    ReturnStatusEvent,
    User,
    UserRole,
)
from app.services import jobs, status
from app.services.jobs import postal_area
from tests.test_auth import bearer, token_for
from tests.test_payments import new_return, payments
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
    return client.get("/me", headers=bearer(token)).json()["email"]


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


def driver(client: TestClient, session: Session, approved: bool = True) -> tuple[str, uuid.UUID]:
    email = f"{uuid.uuid4()}@example.com"
    token = token_for(client, email, role="driver")
    if approved:
        approve(session, email)
        session.flush()
    return token, uuid.UUID(client.get("/me", headers=bearer(token)).json()["id"])


def open_job(client: TestClient, session: Session) -> ReturnRequest:
    job = make_job(session, client_email(client))
    session.flush()
    return job


def accept(client: TestClient, token: str, job_id: uuid.UUID, language: str = "en"):
    headers = {**bearer(token), "Accept-Language": language}
    return client.post(f"/driver/jobs/{job_id}/accept", headers=headers)


def list_jobs(client: TestClient, token: str):
    return client.get("/driver/jobs", headers=bearer(token))


def driver_of(session: Session, job_id: uuid.UUID) -> uuid.UUID | None:
    return session.get(ReturnRequest, job_id, populate_existing=True).driver_id


def test_unapproved_driver_and_client_are_refused(client: TestClient, session: Session):
    job = open_job(client, session)
    waiting, _ = driver(client, session, approved=False)
    client_token, _ = sign_in(client)

    for token in (waiting, client_token):
        assert list_jobs(client, token).status_code == 403
        assert accept(client, token, job.id).status_code == 403
    assert driver_of(session, job.id) is None


def test_list_shows_only_open_paid_jobs_soonest_first(client: TestClient, session: Session):
    later = open_job(client, session)
    sooner = open_job(client, session)
    sooner.pickup_window_start -= timedelta(hours=1)
    taken = open_job(client, session)
    status.transition(session, taken, ReturnStatus.driver_assigned, actor_id=None)
    session.flush()
    new_return(client)  # booked but not paid
    token, _ = driver(client, session)

    response = list_jobs(client, token)

    assert response.status_code == 200, response.text
    body = response.json()
    assert [j["id"] for j in body] == [str(sooner.id), str(later.id)]
    # Only these: never the address, name, phone, notes or photos (ADR 0019).
    assert set(body[0]) == {
        "id",
        "postal_area",
        "pickup_window_start",
        "pickup_window_end",
        "carrier",
        "label_type",
        "driver_payout",
    }
    first = body[0]
    assert (first["postal_area"], first["carrier"], first["label_type"]) == (
        "H3B",
        "canada_post",
        "qr_code",
    )
    assert first["driver_payout"] == 374


def test_list_hides_requested_return_without_succeeded_payment(
    client: TestClient, session: Session
):
    job = open_job(client, session)
    [payment] = payments(session, str(job.id))
    payment.status = PaymentStatus.pending
    session.add(payment)
    session.flush()
    token, _ = driver(client, session)

    assert list_jobs(client, token).json() == []


def test_accept_assigns_driver(client: TestClient, session: Session):
    job = open_job(client, session)
    token, driver_id = driver(client, session)

    response = accept(client, token, job.id)

    assert response.status_code == 204, response.text
    assert driver_of(session, job.id) == driver_id
    last = events(session, str(job.id))[-1]
    assert (last.status, last.actor_id) == (ReturnStatus.driver_assigned, driver_id)
    assert list_jobs(client, token).json() == []


def test_accept_taken_job_is_409_job_taken(client: TestClient, session: Session):
    job = open_job(client, session)
    first, first_id = driver(client, session)
    second, _ = driver(client, session)
    assert accept(client, first, job.id).status_code == 204

    en = accept(client, second, job.id)
    fr = accept(client, second, job.id, language="fr")

    assert (en.status_code, en.json()["detail"]) == (409, "This job was just taken.")
    assert fr.json()["detail"] == "Cette collecte vient d'être prise par un autre chauffeur."
    assert driver_of(session, job.id) == first_id


def test_accept_again_by_same_driver_is_204(client: TestClient, session: Session):
    # A double tap on Accept.
    job = open_job(client, session)
    token, _ = driver(client, session)
    assert accept(client, token, job.id).status_code == 204

    assert accept(client, token, job.id).status_code == 204
    assigned = [e for e in events(session, str(job.id)) if e.status == "driver_assigned"]
    assert len(assigned) == 1


def test_unknown_job_is_404(client: TestClient, session: Session):
    token, _ = driver(client, session)

    assert accept(client, token, uuid.uuid4()).status_code == 404


def test_second_job_is_409_already_on_job(client: TestClient, session: Session):
    first_job, second_job = open_job(client, session), open_job(client, session)
    token, _ = driver(client, session)
    assert accept(client, token, first_job.id).status_code == 204

    en = accept(client, token, second_job.id)
    fr = accept(client, token, second_job.id, language="fr")

    assert (en.status_code, en.json()["detail"]) == (
        409,
        "Finish your current job before accepting another.",
    )
    assert fr.json()["detail"] == "Terminez votre collecte en cours avant d'en accepter une autre."
    assert driver_of(session, second_job.id) is None


# The tests above share one connection, so nothing in them runs at the same time. These use
# rows committed for real and separate connections, to check the row locks.


@pytest.fixture
def race(engine: Engine) -> Iterator[tuple[list[uuid.UUID], list[uuid.UUID]]]:
    """Two open jobs and two approved drivers, committed; deleted afterwards."""
    with Session(engine) as s:
        users = [
            User(role=role, name="Race", email=f"{uuid.uuid4()}@example.com", password_hash="x")
            for role in (UserRole.client, UserRole.driver, UserRole.driver)
        ]
        retailer = Retailer(name="Race")
        s.add_all([*users, retailer])
        s.flush()
        s.add_all([DriverProfile(user_id=u.id, is_approved=True) for u in users[1:]])
        job_ids = [make_job(s, users[0].email).id for _ in range(2)]
        user_ids, retailer_id = [u.id for u in users], retailer.id
        s.commit()
    yield job_ids, user_ids[1:]
    with Session(engine) as s:
        s.exec(delete(ReturnStatusEvent).where(ReturnStatusEvent.return_id.in_(job_ids)))
        s.exec(delete(Payment).where(Payment.return_id.in_(job_ids)))
        s.exec(delete(ReturnRequest).where(ReturnRequest.id.in_(job_ids)))
        s.exec(delete(DriverProfile).where(DriverProfile.user_id.in_(user_ids)))
        s.exec(delete(User).where(User.id.in_(user_ids)))
        s.exec(delete(Retailer).where(Retailer.id == retailer_id))
        s.commit()


def accept_while_locked(engine: Engine, first: tuple, second: tuple) -> Exception | None:
    """Accepts `first` and holds its locks while `second` tries. Returns what `second` raised."""
    raised: list[Exception | None] = []

    def try_second() -> None:
        with Session(engine) as s:
            try:
                jobs.accept(s, *second)
                s.commit()
                raised.append(None)
            except Exception as e:
                raised.append(e)

    with Session(engine) as s:
        jobs.accept(s, *first)
        other = threading.Thread(target=try_second)
        other.start()
        other.join(timeout=0.5)
        assert other.is_alive(), "the second accept should wait for the first one's lock"
        s.commit()
    other.join(timeout=10)
    return raised[0]


def test_two_drivers_accepting_at_once_one_wins(engine: Engine, race):
    [job_id, _], [driver_a, driver_b] = race

    raised = accept_while_locked(engine, (job_id, driver_a), (job_id, driver_b))

    assert isinstance(raised, status.InvalidTransition)
    with Session(engine) as s:
        assert s.get(ReturnRequest, job_id).driver_id == driver_a


def test_one_driver_two_jobs_at_once(engine: Engine, race):
    [first_job, second_job], [driver_a, _] = race

    raised = accept_while_locked(engine, (first_job, driver_a), (second_job, driver_a))

    assert isinstance(raised, jobs.AlreadyOnJob)
    with Session(engine) as s:
        assert s.get(ReturnRequest, second_job).driver_id is None
