import uuid

import httpx
from sqlalchemy import func
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Locale
from app.schemas.address import AddressSuggestion

# Downtown Montreal, the centre of the service area (ADR 0013).
MONTREAL_LATITUDE, MONTREAL_LONGITUDE = 45.5017, -73.5673


class PlacesUnavailable(Exception):
    """Google didn't answer, or answered with an error."""


class GooglePlaces:
    """Places API (New), called from the server so the key never ships in the app."""

    def __init__(self, transport: httpx.BaseTransport | None = None) -> None:
        self.http = httpx.Client(
            base_url="https://places.googleapis.com/v1",
            headers={"X-Goog-Api-Key": settings.google_maps_api_key.get_secret_value()},
            timeout=5,
            transport=transport,
        )

    def _send(self, request: httpx.Request) -> dict:
        try:
            response = self.http.send(request)
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise PlacesUnavailable from error
        return response.json()

    def autocomplete(
        self, text: str, session: uuid.UUID, locale: Locale
    ) -> list[AddressSuggestion]:
        center = {"latitude": MONTREAL_LATITUDE, "longitude": MONTREAL_LONGITUDE}
        body = {
            "input": text,
            "sessionToken": str(session),
            "includedRegionCodes": ["ca"],
            "locationBias": {
                "circle": {"center": center, "radius": settings.service_area_radius_m}
            },
            "languageCode": locale.value,
        }
        data = self._send(self.http.build_request("POST", "/places:autocomplete", json=body))
        return [
            AddressSuggestion(place_id=p["placeId"], text=p["text"]["text"])
            for s in data.get("suggestions", [])
            if (p := s.get("placePrediction"))
        ]

    def details(
        self, place_id: str, session: uuid.UUID, locale: Locale
    ) -> tuple[str, float, float]:
        # Essentials fields only, sent with the autocomplete session token: Google bills the
        # session as one lookup.
        request = self.http.build_request(
            "GET",
            f"/places/{place_id}",
            params={"sessionToken": str(session), "languageCode": locale.value},
            headers={"X-Goog-FieldMask": "formattedAddress,location"},
        )
        data = self._send(request)
        location = data["location"]
        return data["formattedAddress"], location["latitude"], location["longitude"]


def point(latitude: float, longitude: float) -> str:
    return f"SRID=4326;POINT({longitude} {latitude})"


def in_service_area(session: Session, latitude: float, longitude: float) -> bool:
    here = func.ST_GeogFromText(point(latitude, longitude))
    downtown = func.ST_GeogFromText(point(MONTREAL_LATITUDE, MONTREAL_LONGITUDE))
    return session.exec(
        select(func.ST_DWithin(here, downtown, settings.service_area_radius_m))
    ).one()
