"""Development helpers. Never run against production.

`uv run python -m app.dev job <client-email>` makes a paid pickup that drivers can accept,
without Stripe or a booking slot. Its payment is fake, so cancelling it fails (the refund does).
"""

import argparse
import uuid
from datetime import timedelta

from sqlalchemy.engine import make_url
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models import (
    Carrier,
    EligibilityOutcome,
    LabelType,
    Payment,
    PaymentStatus,
    Retailer,
    ReturnRequest,
    ReturnStatus,
    User,
    UserRole,
)
from app.models.base import utcnow
from app.services import status
from app.services.addresses import point
from app.services.payments import split


def make_job(session: Session, client_email: str) -> ReturnRequest:
    client = session.exec(
        select(User).where(User.email == client_email.lower(), User.role == UserRole.client)
    ).first()
    if client is None:
        raise SystemExit(f"No client account with the email {client_email}.")
    retailer = session.exec(select(Retailer)).first()
    if retailer is None:
        raise SystemExit("No retailers yet. Run `uv run python -m app.seed` first.")

    now = utcnow()
    start = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    job = ReturnRequest(
        client_id=client.id,
        retailer_id=retailer.id,
        pickup_fee=settings.pickup_fee,
        pickup_address="1 Place Ville-Marie, Montréal, QC H3B 2B6, Canada",
        pickup_location=point(45.5017, -73.5690),
        pickup_window_start=start,
        pickup_window_end=start + timedelta(hours=2),
        label_type=LabelType.qr_code,
        label_image_url="dev/label.jpg",
        carrier=Carrier.canada_post,
        eligibility_outcome=EligibilityOutcome.eligible,
        eligibility_attested_at=now,
        eligibility_policy_version=0,
    )
    status.create(session, job, actor_id=client.id)
    session.flush()
    driver_payout, platform_fee = split(job.pickup_fee, 0)
    session.add(
        Payment(
            return_id=job.id,
            client_id=client.id,
            amount=job.pickup_fee,
            platform_fee=platform_fee,
            driver_payout=driver_payout,
            stripe_payment_intent_id=f"pi_dev_{uuid.uuid4().hex}",
            status=PaymentStatus.succeeded,
        )
    )
    status.transition(session, job, ReturnStatus.requested, actor_id=None)
    return job


if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog="python -m app.dev")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("job", help="make a paid pickup drivers can accept").add_argument("email")
    args = parser.parse_args()
    if make_url(settings.database_url).host not in ("localhost", "127.0.0.1"):
        raise SystemExit("app.dev only runs against a local database.")
    with Session(engine) as session:
        job = make_job(session, args.email)
        session.commit()
        print(f"Made job {job.id}.")
