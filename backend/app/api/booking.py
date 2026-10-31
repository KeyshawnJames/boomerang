from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlmodel import select

from app.api.deps import SessionDep, require_role
from app.core.config import settings
from app.core.i18n import request_locale
from app.models import Locale, Retailer, User, UserRole
from app.schemas.booking import (
    BookingOptions,
    EligibilityQuestionRead,
    EligibilityQuestions,
    QuestionOption,
    RetailerRead,
)
from app.services.booking import MONTREAL, pickup_slots
from app.services.eligibility import active_questions, policy_version

router = APIRouter()

ClientUser = Annotated[User, Depends(require_role(UserRole.client))]


@router.get("/retailers", response_model=list[RetailerRead])
def list_retailers(_: ClientUser, session: SessionDep) -> list[Retailer]:
    return session.exec(select(Retailer).order_by(Retailer.name)).all()


@router.get("/eligibility/questions")
def eligibility_questions(
    _: ClientUser, request: Request, session: SessionDep
) -> EligibilityQuestions:
    rows = active_questions(session)
    en = request_locale(request) == Locale.en
    return EligibilityQuestions(
        policy_version=policy_version(rows),
        questions=[
            EligibilityQuestionRead(
                code=q.code,
                prompt=q.prompt_en if en else q.prompt_fr,
                help=q.help_en if en else q.help_fr,
                options=[
                    QuestionOption(
                        value=o["value"],
                        label=o["label_en"] if en else o["label_fr"],
                        outcome=o["outcome"],
                    )
                    for o in q.options
                ],
            )
            for q in rows
        ],
    )


@router.get("/booking/options")
def booking_options(_: ClientUser) -> BookingOptions:
    return BookingOptions(
        pickup_fee=settings.pickup_fee, slots=pickup_slots(datetime.now(MONTREAL))
    )
