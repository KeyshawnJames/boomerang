import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlmodel import select

from app.api.deps import SessionDep, require_approved_driver
from app.core.i18n import api_error, request_locale
from app.models import Payment, PaymentStatus, ReturnRequest, ReturnStatus, User
from app.schemas.driver_job import DriverJobRead
from app.services import jobs, status

router = APIRouter()

ApprovedDriver = Annotated[User, Depends(require_approved_driver)]


@router.get(
    "/driver/jobs",
    response_model=list[DriverJobRead],
    dependencies=[Depends(require_approved_driver)],
)
def list_jobs(session: SessionDep) -> list[DriverJobRead]:
    """Every paid job no driver has taken, soonest pickup first (ADR 0019)."""
    rows = session.exec(
        select(ReturnRequest, Payment)
        .join(Payment, Payment.return_id == ReturnRequest.id)
        .where(
            ReturnRequest.status == ReturnStatus.requested,
            Payment.status == PaymentStatus.succeeded,
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
