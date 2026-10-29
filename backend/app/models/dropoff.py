import uuid
from enum import StrEnum
from typing import Any

from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from app.models.base import point_column


class Carrier(StrEnum):
    canada_post = "canada_post"
    ups = "ups"
    purolator = "purolator"
    fedex = "fedex"
    other = "other"


class DropOffLocation(SQLModel, table=True):
    __tablename__ = "dropoff_locations"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    carrier: Carrier
    name: str
    address: str
    location: Any = Field(sa_column=point_column(nullable=False))
    hours: dict | None = Field(default=None, sa_type=JSONB)
