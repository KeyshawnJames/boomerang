import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import Enum, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlmodel import Field, SQLModel

from app.models.base import TIMESTAMPTZ, utcnow


class AnswerOutcome(StrEnum):
    pass_ = "pass"  # `pass` is a Python keyword
    warn = "warn"
    block = "block"


class EligibilityQuestion(SQLModel, table=True):
    __tablename__ = "eligibility_questions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(unique=True)  # stable slug, e.g. "label_ready"
    prompt_en: str
    prompt_fr: str
    help_en: str | None = None
    help_fr: str | None = None
    # [{"value", "label_en", "label_fr", "outcome": "pass" | "warn" | "block"}]
    options: list[dict] = Field(sa_type=JSONB)
    sort_order: int = 0
    active: bool = True
    version: int = 1


class ReturnEligibilityAnswer(SQLModel, table=True):
    __tablename__ = "return_eligibility_answers"
    __table_args__ = (UniqueConstraint("return_id", "question_code"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    return_id: uuid.UUID = Field(foreign_key="return_requests.id", index=True)
    # Text is copied, not linked, so editing a question never rewrites past answers.
    question_code: str
    prompt_snapshot: str
    answer_value: str
    answer_label_snapshot: str
    outcome: AnswerOutcome = Field(
        sa_type=Enum(AnswerOutcome, values_callable=lambda e: [m.value for m in e])
    )
    created_at: datetime = Field(default_factory=utcnow, sa_type=TIMESTAMPTZ)


class BlockedRequestLog(SQLModel, table=True):
    __tablename__ = "blocked_request_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="users.id")
    retailer_id: uuid.UUID = Field(foreign_key="retailers.id")
    blocking_question_codes: list[str] = Field(sa_type=ARRAY(String))
    created_at: datetime = Field(default_factory=utcnow, sa_type=TIMESTAMPTZ)
