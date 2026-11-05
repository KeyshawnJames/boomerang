"""Drivers finding and accepting jobs (ADR 0019)."""

import re
import uuid

from sqlalchemy import func
from sqlmodel import Session, select

from app.core.config import settings
from app.models import DriverProfile, ReturnRequest, ReturnStatus
from app.services import status

# A Canadian postal code: H2T 1A1, with or without the space.
POSTAL_CODE = re.compile(r"([A-Z]\d[A-Z])\s?\d[A-Z]\d", re.IGNORECASE)


def postal_area(address: str) -> str:
    """The first three characters of the address's postal code (H2T), or "" if it has none."""
    matches = POSTAL_CODE.findall(address)
    return matches[-1].upper() if matches else ""


class AlreadyOnJob(Exception):
    pass


# Jobs a driver still has to finish. failed_dropoff is an end state (ADR 0019).
IN_PROGRESS = (ReturnStatus.driver_assigned, ReturnStatus.picked_up)


def accept(session: Session, return_id: uuid.UUID, driver_id: uuid.UUID) -> None:
    """Gives the job to the driver. Raises LookupError for an unknown job,
    status.InvalidTransition if it's no longer open, AlreadyOnJob if the driver is full."""
    # Locked until commit, so the same driver accepting two jobs at once is counted once.
    session.get(DriverProfile, driver_id, with_for_update=True)
    job = session.get(ReturnRequest, return_id)
    if job is None:
        raise LookupError(return_id)
    if job.driver_id == driver_id:
        return  # a double tap: it's already theirs
    in_progress = session.exec(
        select(func.count())
        .select_from(ReturnRequest)
        .where(ReturnRequest.driver_id == driver_id, ReturnRequest.status.in_(IN_PROGRESS))
    ).one()
    if in_progress >= settings.driver_max_jobs:
        raise AlreadyOnJob
    # Locks the job, so of two drivers accepting at once, the second sees it taken.
    status.transition(session, job, ReturnStatus.driver_assigned, actor_id=driver_id)
    job.driver_id = driver_id
    session.add(job)
