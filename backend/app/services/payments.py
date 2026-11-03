import uuid

from sqlmodel import Session, select
from stripe import InvalidRequestError, PaymentIntent, StripeClient

from app.core.config import settings
from app.models import Payment, PaymentStatus, ReturnRequest, ReturnStatus
from app.services import status


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
            Payment.return_id == return_request.id,
            # A declined payment is tried again, so a return never has two live PaymentIntents.
            Payment.status.in_([PaymentStatus.pending, PaymentStatus.failed]),
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
    payment.status = PaymentStatus.pending
    payment.tip = tip
    payment.driver_payout, payment.platform_fee = split(return_request.pickup_fee, tip)
    session.add(payment)
    return intent.client_secret


def _refund(stripe: StripeClient, intent_id: str) -> None:
    """Gives the whole PaymentIntent back to the same card. Safe to call again."""
    try:
        stripe.v1.refunds.create(
            {"payment_intent": intent_id}, {"idempotency_key": f"refund-{intent_id}"}
        )
    except InvalidRequestError as e:
        # Refunded on an earlier try whose save failed, after Stripe forgot the key (24 h).
        if e.code != "charge_already_refunded":
            raise


def _payment_for(session: Session, intent_id: str) -> Payment | None:
    """The payment, locked until commit along with its return, so deliveries go one at a time."""
    payment = session.exec(
        select(Payment).where(Payment.stripe_payment_intent_id == intent_id)
    ).first()
    if payment is not None:
        # Return first, then payment: the pay endpoint's order, so the two can't deadlock.
        session.get(ReturnRequest, payment.return_id, with_for_update=True)
        session.refresh(payment, with_for_update=True)
    return payment


def succeeded(session: Session, stripe: StripeClient, intent: PaymentIntent) -> None:
    """Stripe took the money: book the return, or refund it all if we can't.

    Honoured even past the payment window (ADR 0018). Raises stripe.StripeError if a needed
    refund fails, having written nothing, so Stripe sends the message again.
    """
    payment = _payment_for(session, intent.id)
    if payment is None or payment.status in (PaymentStatus.succeeded, PaymentStatus.refunded):
        return  # not ours, or already handled
    return_request = session.get(ReturnRequest, payment.return_id)
    paid_in_full = (
        intent.currency == "cad" and intent.amount_received == payment.amount + payment.tip
    )
    # Cancelled meanwhile, already paid by another payment, or not the amount we asked for.
    if return_request.status != ReturnStatus.awaiting_payment or not paid_in_full:
        _refund(stripe, intent.id)
        payment.status = PaymentStatus.refunded
        session.add(payment)
        return
    payment.status = PaymentStatus.succeeded
    session.add(payment)
    status.transition(session, return_request, ReturnStatus.requested, actor_id=None)


def failed(session: Session, intent: PaymentIntent) -> None:
    """The card was declined. The return keeps waiting, so the client can try again."""
    payment = _payment_for(session, intent.id)
    # Only a pending payment: Stripe may deliver this after the success.
    if payment is not None and payment.status == PaymentStatus.pending:
        payment.status = PaymentStatus.failed
        session.add(payment)


def cancel(
    session: Session, stripe: StripeClient, return_request: ReturnRequest, actor_id: uuid.UUID
) -> None:
    """Cancels a return no driver has accepted, refunding fee and tip in full (ADR 0018).

    The caller holds the return's lock. Raises status.InvalidTransition once a driver has
    accepted it (M6), or stripe.StripeError if the refund fails, having written nothing.
    """
    if return_request.status not in (ReturnStatus.awaiting_payment, ReturnStatus.requested):
        raise status.InvalidTransition(f"{return_request.status} -> cancelled")
    # An unpaid return has nothing to refund. A payment still going through is refunded by
    # the webhook when it lands, since the return is no longer waiting for it.
    if return_request.status == ReturnStatus.requested:
        payment = session.exec(
            select(Payment)
            .where(
                Payment.return_id == return_request.id,
                Payment.status == PaymentStatus.succeeded,
            )
            .with_for_update()
        ).one()
        _refund(stripe, payment.stripe_payment_intent_id)
        payment.status = PaymentStatus.refunded
        session.add(payment)
    status.transition(session, return_request, ReturnStatus.cancelled, actor_id)
