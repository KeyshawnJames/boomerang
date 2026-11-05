import uuid
from datetime import datetime

from sqlmodel import SQLModel

from app.models import Carrier, LabelType


class DriverJobRead(SQLModel):
    """An open job as drivers see it before accepting: nothing that identifies the client."""

    id: uuid.UUID
    postal_area: str  # H2T, or "" when the address has no postal code
    pickup_window_start: datetime
    pickup_window_end: datetime
    carrier: Carrier
    label_type: LabelType
    driver_payout: int  # cents: the driver's share of the fee plus the whole tip (ADR 0018)
