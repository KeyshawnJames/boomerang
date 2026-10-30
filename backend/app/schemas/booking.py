import uuid
from datetime import datetime

from sqlmodel import SQLModel

from app.models import AnswerOutcome


class RetailerRead(SQLModel):
    id: uuid.UUID
    name: str
    logo_url: str | None
    return_policy_url: str | None


class QuestionOption(SQLModel):
    value: str
    label: str
    outcome: AnswerOutcome


class EligibilityQuestionRead(SQLModel):
    code: str
    prompt: str
    help: str | None
    options: list[QuestionOption]


class EligibilityQuestions(SQLModel):
    policy_version: int
    questions: list[EligibilityQuestionRead]


class PickupSlot(SQLModel):
    start: datetime
    end: datetime
    asap: bool


class BookingOptions(SQLModel):
    pickup_fee: int  # cents, all fees included, before GST/QST (ADR 0012)
    slots: list[PickupSlot]
