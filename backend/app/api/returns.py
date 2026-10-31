import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import or_
from sqlmodel import select

from app.api.deps import SessionDep, require_role
from app.api.uploads import is_uploaded
from app.core.config import settings
from app.core.i18n import MESSAGES, api_error, request_locale
from app.core.security import decode_address_token
from app.models import (
    AnswerOutcome,
    BlockedRequestLog,
    EligibilityOutcome,
    Retailer,
    ReturnRequest,
    User,
    UserRole,
)
from app.schemas.return_request import CreateReturnRequest, ReturnRead
from app.services import status
from app.services.addresses import point
from app.services.booking import MONTREAL, pickup_slots
from app.services.eligibility import InvalidAnswers, active_questions, evaluate, policy_version

router = APIRouter()

ClientUser = Annotated[User, Depends(require_role(UserRole.client))]


@router.post("/returns", status_code=201, response_model=ReturnRead)
def create_return(
    body: CreateReturnRequest, user: ClientUser, request: Request, session: SessionDep
) -> ReturnRequest | JSONResponse:
    # Snapshots copy the wording in the app's language: what the client read.
    locale = request_locale(request)
    if session.get(Retailer, body.retailer_id) is None:
        raise api_error(422, "retailer_not_found", locale)

    # The server re-evaluates every answer: the app is not a trust boundary.
    questions = active_questions(session)
    # Same codes can hide changed wording or outcomes, so the version must match too.
    if body.policy_version != policy_version(questions):
        raise api_error(422, "invalid_answers", locale)
    try:
        answers = evaluate(questions, body.answers, locale)
    except InvalidAnswers:
        raise api_error(422, "invalid_answers", locale) from None
    outcomes = {a.outcome for a in answers}
    if blocking := [a.question_code for a in answers if a.outcome == AnswerOutcome.block]:
        session.add(
            BlockedRequestLog(
                client_id=user.id, retailer_id=body.retailer_id, blocking_question_codes=blocking
            )
        )
        session.commit()
        # Returned, not raised, so the log above is kept and the codes sit next to `detail`.
        return JSONResponse(
            status_code=422,
            content={"detail": MESSAGES["return_blocked"][locale], "blocking_codes": blocking},
        )
    if AnswerOutcome.warn in outcomes and not body.acknowledged_warnings:
        raise api_error(422, "warnings_not_acknowledged", locale)
    if not body.attested:
        raise api_error(422, "attestation_required", locale)

    if user.phone is None:
        raise api_error(422, "phone_required", locale)
    # ASAP starts at "now", which has moved on since the app fetched it, so it isn't matched.
    slot = next(
        (
            s
            for s in pickup_slots(datetime.now(MONTREAL))
            if s.asap == body.asap and (s.asap or s.start == body.pickup_window_start)
        ),
        None,
    )
    if slot is None:
        raise api_error(422, "slot_unavailable", locale)
    address = decode_address_token(body.address_token, user.id)
    if address is None:
        raise api_error(422, "address_expired", locale)
    if not (
        is_uploaded(user, "label", body.label_photo_key)
        and is_uploaded(user, "package", body.package_photo_key)
    ):
        raise api_error(422, "photo_missing", locale)
    # One photo is proof for one return only.
    # shortcut: two simultaneous requests could both pass; a unique index if that ever matters.
    reused = select(ReturnRequest.id).where(
        or_(
            ReturnRequest.label_image_url == body.label_photo_key,
            ReturnRequest.package_photo_url == body.package_photo_key,
        )
    )
    if session.exec(reused).first() is not None:
        raise api_error(422, "photo_missing", locale)

    return_request = ReturnRequest(
        client_id=user.id,
        retailer_id=body.retailer_id,
        pickup_fee=settings.pickup_fee,  # set here, never read from the request
        pickup_address=address["address"],
        pickup_location=point(address["latitude"], address["longitude"]),
        pickup_notes=body.pickup_notes,
        pickup_window_start=slot.start,
        pickup_window_end=slot.end,
        label_type=body.label_type,
        label_image_url=body.label_photo_key,
        carrier=body.carrier,
        order_number=body.order_number,
        package_photo_url=body.package_photo_key,
        eligibility_outcome=EligibilityOutcome.eligible_with_warnings
        if AnswerOutcome.warn in outcomes
        else EligibilityOutcome.eligible,
        eligibility_attested_at=datetime.now(UTC),
        eligibility_policy_version=policy_version(questions),
    )
    status.create(session, return_request, actor_id=user.id)
    session.flush()  # the answers' foreign key needs the return row first
    for answer in answers:
        answer.return_id = return_request.id
    session.add_all(answers)
    session.commit()
    session.refresh(return_request)
    return return_request


@router.get("/returns/{return_id}", response_model=ReturnRead)
def get_return(
    return_id: uuid.UUID, user: ClientUser, request: Request, session: SessionDep
) -> ReturnRequest:
    return_request = session.get(ReturnRequest, return_id)
    # 404, not 403, so a client can't learn which ids exist.
    if return_request is None or return_request.client_id != user.id:
        raise api_error(404, "return_not_found", request_locale(request))
    return return_request
