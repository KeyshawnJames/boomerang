import uuid
from datetime import datetime
from typing import Literal

from pydantic import AwareDatetime
from sqlmodel import Field, SQLModel

from app.models import Carrier, EligibilityOutcome, LabelType, ReturnStatus


class CreateReturnRequest(SQLModel):
    retailer_id: uuid.UUID
    # The carriers drivers drop off at for the MVP.
    carrier: Literal[Carrier.canada_post, Carrier.ups, Carrier.purolator]
    label_type: LabelType
    order_number: str | None = Field(default=None, max_length=100)
    # Keys from POST /uploads/presign, once the upload has worked.
    label_photo_key: str = Field(max_length=200)
    package_photo_key: str = Field(max_length=200)
    # From GET /addresses/resolve.
    address_token: str = Field(max_length=2000)
    pickup_notes: str | None = Field(default=None, max_length=500)
    # The "as soon as possible" window, or else the start of one from GET /booking/options.
    asap: bool = False
    pickup_window_start: AwareDatetime | None = None
    # Question code → the chosen option's value, one per active question.
    answers: dict[str, str]
    # From GET /eligibility/questions: the question set the client answered and attests to.
    policy_version: int
    acknowledged_warnings: bool = False
    attested: bool = False


class ReturnRead(SQLModel):
    id: uuid.UUID
    status: ReturnStatus
    retailer_id: uuid.UUID
    carrier: Carrier
    label_type: LabelType
    order_number: str | None
    pickup_address: str
    pickup_notes: str | None
    pickup_window_start: datetime
    pickup_window_end: datetime
    pickup_fee: int  # cents, all fees included, before GST/QST (ADR 0012)
    eligibility_outcome: EligibilityOutcome
    created_at: datetime
