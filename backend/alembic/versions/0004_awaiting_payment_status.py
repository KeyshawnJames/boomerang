"""awaiting payment status

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-29 22:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: str | Sequence[str] | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Autogenerate doesn't see enum value changes, so this one is written by hand.
OLD_VALUES = (
    "requested",
    "driver_assigned",
    "picked_up",
    "dropped_off",
    "completed",
    "cancelled",
    "failed_dropoff",
)


def upgrade() -> None:
    """Upgrade schema."""
    # Committed on its own: Postgres won't use a new enum value inside the transaction that
    # added it, which would break any later migration in the same run that uses it.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE returnstatus ADD VALUE 'awaiting_payment' BEFORE 'requested'")


def downgrade() -> None:
    """Downgrade schema."""
    # Postgres can't drop an enum value, so rebuild the type. Unpaid returns become cancelled.
    op.execute("UPDATE return_requests SET status = 'cancelled' WHERE status = 'awaiting_payment'")
    op.execute("DELETE FROM return_status_events WHERE status = 'awaiting_payment'")
    op.execute("ALTER TYPE returnstatus RENAME TO returnstatus_old")
    op.execute(f"CREATE TYPE returnstatus AS ENUM {OLD_VALUES!r}")
    for table in ("return_requests", "return_status_events"):
        op.execute(
            f"ALTER TABLE {table} ALTER COLUMN status TYPE returnstatus "
            "USING status::text::returnstatus"
        )
    op.execute("DROP TYPE returnstatus_old")
