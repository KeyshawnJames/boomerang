import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlmodel import Field, SQLModel

from app.models.base import TIMESTAMPTZ, point_column, utcnow


class UserRole(StrEnum):
    client = "client"
    driver = "driver"
    admin = "admin"


class Locale(StrEnum):
    fr = "fr"
    en = "en"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    role: UserRole
    name: str
    email: str = Field(unique=True)
    phone: str | None = None
    password_hash: str
    locale: Locale = Locale.fr
    created_at: datetime = Field(default_factory=utcnow, sa_type=TIMESTAMPTZ)


class DriverProfile(SQLModel, table=True):
    __tablename__ = "driver_profiles"

    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    vehicle_description: str | None = None
    is_available: bool = False
    # Set only during an active job (ADR 0007).
    location: Any = Field(default=None, sa_column=point_column(nullable=True))
    location_updated_at: datetime | None = Field(default=None, sa_type=TIMESTAMPTZ)
    rating_avg: float = 0
    rating_count: int = 0
    stripe_account_id: str | None = None
