"""The only place a return's status changes (ADR 0011). Every change writes a ReturnStatusEvent."""

import uuid

from sqlmodel import Session

from app.models import ReturnRequest, ReturnStatus, ReturnStatusEvent

S = ReturnStatus
TRANSITIONS: dict[ReturnStatus, set[ReturnStatus]] = {
    S.awaiting_payment: {S.requested, S.cancelled},
    S.requested: {S.driver_assigned, S.cancelled},
    S.driver_assigned: {S.picked_up, S.cancelled},
    S.picked_up: {S.dropped_off, S.failed_dropoff},
    S.dropped_off: {S.completed},
}


class InvalidTransition(Exception):
    pass


def create(
    session: Session, return_request: ReturnRequest, actor_id: uuid.UUID
) -> ReturnStatusEvent:
    return_request.status = S.awaiting_payment
    event = ReturnStatusEvent(
        return_id=return_request.id, status=S.awaiting_payment, actor_id=actor_id
    )
    session.add_all([return_request, event])
    return event


def transition(
    session: Session,
    return_request: ReturnRequest,
    to: ReturnStatus,
    actor_id: uuid.UUID | None,
    *,
    photo_url: str | None = None,
    note: str | None = None,
) -> ReturnStatusEvent:
    # Lock the row and reload it, so two requests racing on the same return (two drivers
    # accepting it) can't both pass the check. Reloading drops unflushed changes to
    # return_request: make other changes (driver_id…) after this call, not before.
    session.get(ReturnRequest, return_request.id, with_for_update=True, populate_existing=True)
    if to not in TRANSITIONS.get(return_request.status, set()):
        raise InvalidTransition(f"{return_request.status} -> {to}")

    return_request.status = to
    event = ReturnStatusEvent(
        return_id=return_request.id, status=to, actor_id=actor_id, photo_url=photo_url, note=note
    )
    session.add_all([return_request, event])
    return event
