"""enable postgis

Revision ID: 0001
Revises:
Create Date: 2026-10-29 17:21:19.225923

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")


def downgrade() -> None:
    """Downgrade schema."""
    # No-op: PostGIS belongs to the database (preinstalled in Docker, enabled in Supabase),
    # and other extensions depend on it.
    pass
