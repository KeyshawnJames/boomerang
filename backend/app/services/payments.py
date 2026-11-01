from sqlmodel import Session, select
from stripe import StripeClient

from app.core.config import settings
from app.models import Payment, PaymentStatus, ReturnRequest


def split(fee: int, tip: int) -> tuple[int, int]:
    """(driver_payout, platform_fee) in cents (ADR 0018). Boomerang keeps the rounding cent."""
    share = fee * settings.driver_fee_share_percent // 100
    return share + tip, fee - share


def start(session: Session, stripe: StripeClient, return_request: ReturnRequest, tip: int) -> str:
    """Starts the return's card payment, or updates the tip on the one already started.

    Returns the PaymentIntent's client secret. Raises stripe.StripeError, having written nothing.
    """
    total = return_request.pickup_fee + tip
    payment = session.exec(
        select(Payment).where(
            Payment.return_id == return_request.id, Payment.status == PaymentStatus.pending
        )
    ).first()
    if payment is None:
        intent = stripe.v1.payment_intents.create(
            {
                "amount": total,
                "currency": "cad",
                "allowed_payment_method_types": ["card"],
                # Ties the driver's later transfer to this charge (separate charges and transfers).
                "transfer_group": str(return_request.id),
                "metadata": {"return_id": str(return_request.id)},
            }
        )
        payment = Payment(
            return_id=return_request.id,
            client_id=return_request.client_id,
            amount=return_request.pickup_fee,
            stripe_payment_intent_id=intent.id,
        )
    else:
        intent = stripe.v1.payment_intents.update(
            payment.stripe_payment_intent_id, {"amount": total}
        )
    # Recorded now, so a later change to the share never changes what's owed for this job.
    payment.tip = tip
    payment.driver_payout, payment.platform_fee = split(return_request.pickup_fee, tip)
    session.add(payment)
    return intent.client_secret
