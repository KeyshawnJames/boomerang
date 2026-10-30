import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import SessionDep, require_role
from app.core.i18n import api_error
from app.core.security import create_address_token
from app.models import User, UserRole
from app.schemas.address import AddressSuggestion, ResolvedAddress
from app.services.addresses import (
    GooglePlaces,
    NotAStreetAddress,
    PlacesUnavailable,
    in_service_area,
)

router = APIRouter()

ClientUser = Annotated[User, Depends(require_role(UserRole.client))]


# One client for the whole app, so calls reuse open connections to Google.
google_places = GooglePlaces()


def get_places() -> GooglePlaces:
    return google_places


Places = Annotated[GooglePlaces, Depends(get_places)]
# The app makes one per address search and sends it with every call (Google session billing).
SessionToken = Annotated[uuid.UUID, Query(alias="session")]


@router.get("/addresses/autocomplete")
def autocomplete_address(
    user: ClientUser,
    places: Places,
    session_token: SessionToken,
    q: Annotated[str, Query(min_length=1, max_length=200)],
) -> list[AddressSuggestion]:
    try:
        return places.autocomplete(q, session_token, user.locale)
    except PlacesUnavailable:
        raise api_error(502, "address_lookup_failed", user.locale) from None


@router.get("/addresses/resolve")
def resolve_address(
    user: ClientUser,
    places: Places,
    session: SessionDep,
    session_token: SessionToken,
    # Google place IDs are URL-safe; the pattern keeps the value from rewriting the URL path.
    place_id: Annotated[str, Query(max_length=300, pattern=r"^[A-Za-z0-9_-]+$")],
) -> ResolvedAddress:
    try:
        address, latitude, longitude = places.details(place_id, session_token, user.locale)
    except PlacesUnavailable:
        raise api_error(502, "address_lookup_failed", user.locale) from None
    except NotAStreetAddress:
        raise api_error(422, "not_a_street_address", user.locale) from None
    if not in_service_area(session, latitude, longitude):
        raise api_error(422, "outside_service_area", user.locale)
    return ResolvedAddress(
        address=address, token=create_address_token(user.id, address, latitude, longitude)
    )
