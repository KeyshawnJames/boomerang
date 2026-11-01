import uuid
from datetime import timedelta
from typing import Annotated

import stripe
from fastapi import APIRouter, Depends, Request
from sqlmodel import select

from app.api.deps import SessionDep, require_role
from app.core.config import settings
from app.core.i18n import api_error, request_locale
from app.models import ReturnRequest, ReturnStatus, User, UserRole
from app.models.base import utcnow
from app.schemas.payment import PaymentIntentRead, PayRequest
from app.services import payments

router = APIRouter()

ClientUser = Annotated[User, Depends(require_role(UserRole.client))]


def get_stripe() -> stripe.StripeClient:
    return stripe.StripeClient(settings.stripe_secret_key.get_secret_value())


StripeDep = Annotated[stripe.StripeClient, Depends(get_stripe)]


@router.post("/returns/{return_id}/pay", response_model=PaymentIntentRead)
def pay_for_return(
    return_id: uuid.UUID,
    body: PayRequest,
    user: ClientUser,
    request: Request,
    session: SessionDep,
    stripe_client: StripeDep,
) -> PaymentIntentRead:
    locale = request_locale(request)
    # Locked until commit, so two taps on Pay can't start two payments.
    return_request = session.exec(
        select(ReturnRequest).where(ReturnRequest.id == return_id).with_for_update()
    ).first()
    # 404, not 403, so a client can't learn which ids exist.
    if return_request is None or return_request.client_id != user.id:
        raise api_error(404, "return_not_found", locale)
    if return_request.status != ReturnStatus.awaiting_payment:
        raise api_error(409, "payment_closed", locale)
    if utcnow() - return_request.created_at >= timedelta(minutes=settings.payment_window_minutes):
        raise api_error(409, "payment_expired", locale)

    try:
        client_secret = payments.start(session, stripe_client, return_request, body.tip)
    except stripe.InvalidRequestError as e:
        # The card is already being charged; the webhook finishes the booking (#64).
        if e.code == "payment_intent_unexpected_state":
            raise api_error(409, "payment_in_progress", locale) from None
        raise api_error(502, "payment_unavailable", locale) from e
    except stripe.StripeError as e:
        raise api_error(502, "payment_unavailable", locale) from e
    session.commit()
    return PaymentIntentRead(
        client_secret=client_secret, total=return_request.pickup_fee + body.tip
    )
