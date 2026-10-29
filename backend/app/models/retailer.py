import uuid

from sqlmodel import Field, SQLModel


class Retailer(SQLModel, table=True):
    __tablename__ = "retailers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    logo_url: str | None = None
    return_policy_url: str | None = None
