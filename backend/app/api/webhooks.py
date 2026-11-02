from typing import Annotated

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request

from app.api.deps import SessionDep
from app.api.payments import StripeDep
from app.core.config import settings
from app.services import payments

router = APIRouter()


async def raw_body(request: Request) -> bytes:
    # The signature covers the exact bytes Stripe sent, so read them before any parsing.
    return await request.body()


# Hidden from the app's API client: only Stripe calls this. Errors are for Stripe, not people.
@router.post("/webhooks/stripe", include_in_schema=False)
def stripe_webhook(
    body: Annotated[bytes, Depends(raw_body)],
    session: SessionDep,
    stripe_client: StripeDep,
    stripe_signature: Annotated[str | None, Header()] = None,
) -> None:
    try:
        event = stripe_client.construct_event(
            body, stripe_signature, settings.stripe_webhook_secret.get_secret_value()
        )
    except (stripe.SignatureVerificationError, ValueError):
        raise HTTPException(400, "Invalid signature") from None

    try:
        if event.type == "payment_intent.succeeded":
            payments.succeeded(session, stripe_client, event.data.object)
        elif event.type == "payment_intent.payment_failed":
            payments.failed(session, event.data.object)
    except stripe.StripeError as e:
        # Not 2xx, so Stripe sends the message again later.
        raise HTTPException(503, "Stripe unavailable") from e
    session.commit()
