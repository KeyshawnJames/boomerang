import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlmodel import Field, SQLModel

from app.models.base import TIMESTAMPTZ, point_column, utcnow
from app.models.dropoff import Carrier


class ReturnStatus(StrEnum):
    requested = "requested"
    driver_assigned = "driver_assigned"
    picked_up = "picked_up"
    dropped_off = "dropped_off"
    completed = "completed"
    cancelled = "cancelled"
    failed_dropoff = "failed_dropoff"


class LabelType(StrEnum):
    qr_code = "qr_code"
    printed_label = "printed_label"


class EligibilityOutcome(StrEnum):
    eligible = "eligible"
    eligible_with_warnings = "eligible_with_warnings"


class ReturnRequest(SQLModel, table=True):
    __tablename__ = "return_requests"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    retailer_id: uuid.UUID = Field(foreign_key="retailers.id")
    driver_id: uuid.UUID | None = Field(
        default=None, foreign_key="driver_profiles.user_id", index=True
    )
    dropoff_location_id: uuid.UUID | None = Field(default=None, foreign_key="dropoff_locations.id")

    # Only the status-machine service changes this, and it writes a ReturnStatusEvent each time.
    status: ReturnStatus = Field(default=ReturnStatus.requested, index=True)
    pickup_fee: int  # cents, all fees included (ADR 0007)

    pickup_address: str
    pickup_location: Any = Field(sa_column=point_column(nullable=False))
    pickup_window_start: datetime = Field(sa_type=TIMESTAMPTZ)
    pickup_window_end: datetime = Field(sa_type=TIMESTAMPTZ)

    label_type: LabelType
    label_image_url: str
    carrier: Carrier
    order_number: str | None = None
    package_photo_url: str | None = None

    carrier_tracking_number: str | None = None

    eligibility_outcome: EligibilityOutcome
    eligibility_attested_at: datetime = Field(sa_type=TIMESTAMPTZ)
    eligibility_policy_version: int

    created_at: datetime = Field(default_factory=utcnow, sa_type=TIMESTAMPTZ)
    updated_at: datetime = Field(
        default_factory=utcnow, sa_type=TIMESTAMPTZ, sa_column_kwargs={"onupdate": utcnow}
    )


class ReturnStatusEvent(SQLModel, table=True):
    __tablename__ = "return_status_events"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    return_id: uuid.UUID = Field(foreign_key="return_requests.id", index=True)
    status: ReturnStatus
    actor_id: uuid.UUID | None = Field(default=None, foreign_key="users.id")  # None: system
    photo_url: str | None = None  # custody proof
    note: str | None = None
    created_at: datetime = Field(default_factory=utcnow, sa_type=TIMESTAMPTZ)
