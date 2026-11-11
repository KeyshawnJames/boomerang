import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlmodel import select

from app.api.deps import SessionDep, require_approved_driver
from app.api.uploads import photo_url
from app.core.i18n import api_error, request_locale
from app.models import Payment, PaymentStatus, ReturnRequest, ReturnStatus, User
from app.models.base import utcnow
from app.schemas.driver_job import DriverCurrentJobRead, DriverJobRead
from app.services import jobs, status

router = APIRouter()

ApprovedDriver = Annotated[User, Depends(require_approved_driver)]


@router.get(
    "/driver/jobs",
    response_model=list[DriverJobRead],
    dependencies=[Depends(require_approved_driver)],
)
def list_jobs(session: SessionDep) -> list[DriverJobRead]:
    """Every paid job no driver has taken whose window hasn't ended, soonest first (ADR 0019)."""
    rows = session.exec(
        select(ReturnRequest, Payment)
        .join(Payment, Payment.return_id == ReturnRequest.id)
        .where(
            ReturnRequest.status == ReturnStatus.requested,
            Payment.status == PaymentStatus.succeeded,
            ReturnRequest.pickup_window_end > utcnow(),
        )
        .order_by(ReturnRequest.pickup_window_start)
    ).all()
    return [
        DriverJobRead(
            id=job.id,
            postal_area=jobs.postal_area(job.pickup_address),
            pickup_window_start=job.pickup_window_start,
            pickup_window_end=job.pickup_window_end,
            carrier=job.carrier,
            label_type=job.label_type,
            driver_payout=payment.driver_payout,
        )
        for job, payment in rows
    ]


@router.get("/driver/jobs/mine", response_model=list[DriverCurrentJobRead])
def my_jobs(
    driver: ApprovedDriver, request: Request, session: SessionDep
) -> list[DriverCurrentJobRead]:
    """The caller's jobs in progress: one in M6, a list so batch pickups fit later."""
    rows = session.exec(
        select(ReturnRequest, User)
        .join(User, User.id == ReturnRequest.client_id)
        .where(ReturnRequest.driver_id == driver.id, ReturnRequest.status.in_(jobs.IN_PROGRESS))
        .order_by(ReturnRequest.pickup_window_start)
    ).all()
    return [
        DriverCurrentJobRead(
            id=job.id,
            status=job.status,
            pickup_address=job.pickup_address,
            pickup_notes=job.pickup_notes,
            client_first_name=next(iter(customer.name.split()), ""),
            client_phone=customer.phone,
            pickup_window_start=job.pickup_window_start,
            pickup_window_end=job.pickup_window_end,
            carrier=job.carrier,
            label_type=job.label_type,
            carrier_tracking_number=job.carrier_tracking_number,
            arrived_at=job.arrived_at,
            label_image_url=photo_url(request, job.label_image_url),
            package_photo_url=job.package_photo_url and photo_url(request, job.package_photo_url),
        )
        for job, customer in rows
    ]


@router.post("/driver/jobs/{job_id}/accept", status_code=204)
def accept_job(
    job_id: uuid.UUID, driver: ApprovedDriver, request: Request, session: SessionDep
) -> None:
    locale = request_locale(request)
    try:
        jobs.accept(session, job_id, driver.id)
    except LookupError:
        raise api_error(404, "return_not_found", locale) from None
    except status.InvalidTransition:
        raise api_error(409, "job_taken", locale) from None
    except jobs.AlreadyOnJob:
        raise api_error(409, "already_on_job", locale) from None
    session.commit()


@router.post("/driver/jobs/{job_id}/arrived", status_code=204)
def mark_arrived(
    job_id: uuid.UUID, driver: ApprovedDriver, request: Request, session: SessionDep
) -> None:
    """The driver is at the door. A second tap keeps the first time."""
    locale = request_locale(request)
    try:
        jobs.arrive(session, job_id, driver.id)
    except LookupError:
        raise api_error(404, "return_not_found", locale) from None
    except status.InvalidTransition:
        raise api_error(409, "job_not_waiting_pickup", locale) from None
    session.commit()


@router.post("/driver/jobs/{job_id}/release", status_code=204)
def release_job(
    job_id: uuid.UUID, driver: ApprovedDriver, request: Request, session: SessionDep
) -> None:
    """Hands the job back before pickup; it goes back to the open list."""
    locale = request_locale(request)
    try:
        jobs.release(session, job_id, driver.id)
    except LookupError:
        raise api_error(404, "return_not_found", locale) from None
    except status.InvalidTransition:
        raise api_error(409, "job_not_waiting_pickup", locale) from None
    session.commit()
