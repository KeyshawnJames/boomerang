import uuid
from datetime import datetime
from enum import StrEnum

from sqlmodel import Field, SQLModel

from app.models.base import TIMESTAMPTZ, utcnow


class PaymentStatus(StrEnum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    return_id: uuid.UUID = Field(foreign_key="return_requests.id", index=True)
    client_id: uuid.UUID = Field(foreign_key="users.id")
    # All amounts in cents. amount is the all-in pickup fee; the tip is on top of it.
    amount: int
    tip: int = 0
    platform_fee: int
    driver_payout: int
    stripe_payment_intent_id: str = Field(unique=True)
    status: PaymentStatus = PaymentStatus.pending
    created_at: datetime = Field(default_factory=utcnow, sa_type=TIMESTAMPTZ)
