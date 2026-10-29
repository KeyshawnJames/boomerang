import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.base import TIMESTAMPTZ, utcnow


class Rating(SQLModel, table=True):
    __tablename__ = "ratings"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    return_id: uuid.UUID = Field(foreign_key="return_requests.id", unique=True)  # one per return
    driver_id: uuid.UUID = Field(foreign_key="driver_profiles.user_id", index=True)
    client_id: uuid.UUID = Field(foreign_key="users.id")
    stars: int  # 1 to 5, checked by the API
    comment: str | None = None
    created_at: datetime = Field(default_factory=utcnow, sa_type=TIMESTAMPTZ)
