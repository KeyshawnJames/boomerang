"""Drivers finding and accepting jobs (ADR 0019)."""

import re
import uuid

from sqlalchemy import func
from sqlmodel import Session, select

from app.core.config import settings
from app.models import DriverProfile, ReturnRequest, ReturnStatus
from app.models.base import utcnow
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
    if job.pickup_window_end <= utcnow():
        raise status.InvalidTransition("pickup window has ended")
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


def _my_job(session: Session, return_id: uuid.UUID, driver_id: uuid.UUID) -> ReturnRequest:
    """The driver's job, locked until commit. Raises LookupError if it isn't theirs."""
    # Locked before checking driver_id, so a late second hand-back can't unassign a driver
    # who took the job in between.
    job = session.get(ReturnRequest, return_id, with_for_update=True, populate_existing=True)
    if job is None or job.driver_id != driver_id:
        raise LookupError(return_id)
    return job


def arrive(session: Session, return_id: uuid.UUID, driver_id: uuid.UUID) -> None:
    """Saves when the driver got to the door; a second tap keeps the first time. Raises
    LookupError if it isn't their job, status.InvalidTransition if it's past driver_assigned."""
    job = _my_job(session, return_id, driver_id)
    if job.status != ReturnStatus.driver_assigned:
        raise status.InvalidTransition(f"{job.status}: not waiting for pickup")
    if job.arrived_at is None:
        job.arrived_at = utcnow()
        session.add(job)


def release(session: Session, return_id: uuid.UUID, driver_id: uuid.UUID) -> None:
    """Hands the job back before pickup, reopening it for every driver; no money moves
    (ADR 0019). Raises like arrive()."""
    job = _my_job(session, return_id, driver_id)
    # arrived_at is cleared for the next driver, so the history keeps it.
    note = "handed back" + (f"; arrived {job.arrived_at.isoformat()}" if job.arrived_at else "")
    status.transition(session, job, ReturnStatus.requested, actor_id=driver_id, note=note)
    job.driver_id = None
    job.arrived_at = None
    session.add(job)
