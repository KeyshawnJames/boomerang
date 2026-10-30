import pytest
from sqlalchemy import Engine, delete, text, update
from sqlalchemy.exc import OperationalError
from sqlmodel import Session, select

from app.models import Retailer, ReturnRequest, ReturnStatus, ReturnStatusEvent, User
from app.services import status
from tests.test_models import make_return

S = ReturnStatus
ALLOWED = [
    (S.awaiting_payment, S.requested),
    (S.awaiting_payment, S.cancelled),
    (S.requested, S.driver_assigned),
    (S.requested, S.cancelled),
    (S.driver_assigned, S.picked_up),
    (S.driver_assigned, S.cancelled),
    (S.picked_up, S.dropped_off),
    (S.picked_up, S.failed_dropoff),
    (S.dropped_off, S.completed),
]
ILLEGAL = [
    (from_, to) for from_ in ReturnStatus for to in ReturnStatus if (from_, to) not in ALLOWED
]


def events(session: Session, return_request: ReturnRequest) -> list[ReturnStatusEvent]:
    return list(
        session.exec(
            select(ReturnStatusEvent).where(ReturnStatusEvent.return_id == return_request.id)
        )
    )


def test_create_starts_awaiting_payment_with_a_first_event(session: Session):
    return_request = make_return(session)

    event = status.create(session, return_request, actor_id=return_request.client_id)
    session.flush()

    assert return_request.status == S.awaiting_payment
    assert events(session, return_request) == [event]
    assert (event.status, event.actor_id) == (S.awaiting_payment, return_request.client_id)


@pytest.mark.parametrize(("from_", "to"), ALLOWED)
def test_allowed_transition_sets_status_and_writes_event(session: Session, from_, to):
    return_request = make_return(session, status=from_)

    status.transition(session, return_request, to, actor_id=None, photo_url="p.jpg", note="n")
    session.flush()

    [event] = events(session, return_request)
    assert return_request.status == to
    assert (event.status, event.photo_url, event.note) == (to, "p.jpg", "n")


@pytest.mark.parametrize(("from_", "to"), ILLEGAL)
def test_illegal_transition_is_refused_and_changes_nothing(session: Session, from_, to):
    return_request = make_return(session, status=from_)

    with pytest.raises(status.InvalidTransition):
        status.transition(session, return_request, to, actor_id=None)
    session.flush()

    assert return_request.status == from_
    assert events(session, return_request) == []


def test_transition_checks_the_database_not_a_stale_copy(session: Session):
    # Another request cancelled the return after this one loaded it (test-only direct write).
    return_request = make_return(session, status=S.requested)
    session.exec(
        update(ReturnRequest)
        .where(ReturnRequest.id == return_request.id)
        .values(status=S.cancelled)
        .execution_options(synchronize_session=False)
    )

    with pytest.raises(status.InvalidTransition):
        status.transition(session, return_request, S.driver_assigned, actor_id=None)


def test_transition_locks_the_return_until_commit(engine: Engine):
    # Two real connections need committed rows, so this can't use the rolled-back fixture.
    with Session(engine) as setup:
        return_request = make_return(setup, status=S.requested)
        setup.commit()
        ids = (return_request.id, return_request.client_id, return_request.retailer_id)
    try:
        with Session(engine) as first, Session(engine) as second:
            status.transition(first, first.get(ReturnRequest, ids[0]), S.driver_assigned, None)
            second.exec(text("SET lock_timeout = '200ms'"))
            with pytest.raises(OperationalError, match="lock timeout"):
                status.transition(second, second.get(ReturnRequest, ids[0]), S.cancelled, None)
            first.rollback()
    finally:
        with Session(engine) as cleanup:
            cleanup.exec(delete(ReturnRequest).where(ReturnRequest.id == ids[0]))
            cleanup.exec(delete(User).where(User.id == ids[1]))
            cleanup.exec(delete(Retailer).where(Retailer.id == ids[2]))
            cleanup.commit()
