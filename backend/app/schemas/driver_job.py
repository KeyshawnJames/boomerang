import uuid
from datetime import datetime

from sqlmodel import SQLModel

from app.models import Carrier, LabelType, ReturnStatus


class DriverJobRead(SQLModel):
    """An open job as drivers see it before accepting: nothing that identifies the client."""

    id: uuid.UUID
    postal_area: str  # H2T, or "" when the address has no postal code
    pickup_window_start: datetime
    pickup_window_end: datetime
    carrier: Carrier
    label_type: LabelType
    driver_payout: int  # cents: the driver's share of the fee plus the whole tip (ADR 0018)


class DriverCurrentJobRead(SQLModel):
    """A job the driver accepted: only that driver gets the client's details (ADR 0019)."""

    id: uuid.UUID
    status: ReturnStatus
    pickup_address: str
    pickup_notes: str | None
    client_first_name: str
    client_phone: str | None
    pickup_window_start: datetime
    pickup_window_end: datetime
    carrier: Carrier
    label_type: LabelType
    carrier_tracking_number: str | None
    arrived_at: datetime | None
    # Links to view the photos, valid 15 minutes: fetch the job again for fresh ones.
    label_image_url: str
    package_photo_url: str | None
