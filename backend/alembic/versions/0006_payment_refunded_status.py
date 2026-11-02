"""payment refunded status

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-02 10:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006"
down_revision: str | Sequence[str] | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Autogenerate doesn't see enum value changes, so this one is written by hand.
OLD_VALUES = ("pending", "succeeded", "failed")


def upgrade() -> None:
    """Upgrade schema."""
    # Committed on its own: Postgres won't use a new enum value inside the transaction that
    # added it.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE paymentstatus ADD VALUE 'refunded'")


def downgrade() -> None:
    """Downgrade schema."""
    # Postgres can't drop an enum value, so rebuild the type. Refunded payments become failed.
    op.execute("UPDATE payments SET status = 'failed' WHERE status = 'refunded'")
    op.execute("ALTER TYPE paymentstatus RENAME TO paymentstatus_old")
    op.execute(f"CREATE TYPE paymentstatus AS ENUM {OLD_VALUES!r}")
    op.execute(
        "ALTER TABLE payments ALTER COLUMN status TYPE paymentstatus "
        "USING status::text::paymentstatus"
    )
    op.execute("DROP TYPE paymentstatus_old")
