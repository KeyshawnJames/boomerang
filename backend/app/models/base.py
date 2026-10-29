from datetime import UTC, datetime

from geoalchemy2 import Geography
from sqlalchemy import Column, DateTime

TIMESTAMPTZ = DateTime(timezone=True)


def utcnow() -> datetime:
    return datetime.now(UTC)


def point_column(nullable: bool) -> Column:
    # A fresh Column per model: SQLAlchemy can't attach one Column to two tables.
    return Column(Geography("POINT", srid=4326), nullable=nullable)
