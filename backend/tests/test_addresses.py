import json
import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import httpx
import jwt
import pytest
from fastapi.testclient import TestClient

from app.api.addresses import get_places
from app.core.config import settings
from app.core.security import create_address_token, decode_address_token
from app.main import app
from app.services.addresses import GooglePlaces
from tests.test_auth import bearer, token_for

SESSION = str(uuid.uuid4())
PLACE_VILLE_MARIE = {"latitude": 45.5017, "longitude": -73.5690}
QUEBEC_CITY = {"latitude": 46.8131, "longitude": -71.2075}


class FakeGoogle:
    """Stands in for Places API (New) and records what we sent it."""

    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []
        self.location = PLACE_VILLE_MARIE
        self.status = 200

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if request.url.path == "/v1/places:autocomplete":
            body = {
                "suggestions": [
                    {
                        "placePrediction": {
                            "placeId": "pvm",
                            "text": {"text": "1 Place Ville Marie, Montréal, QC, Canada"},
                        }
                    }
                ]
            }
        else:
            body = {"formattedAddress": "1 Place Ville-Marie, Montréal, QC H3B 2B6, Canada"}
            body["location"] = self.location
        return httpx.Response(self.status, json=body)


@pytest.fixture
def google(client: TestClient) -> Iterator[FakeGoogle]:
    fake = FakeGoogle()
    app.dependency_overrides[get_places] = lambda: GooglePlaces(httpx.MockTransport(fake))
    yield fake
    del app.dependency_overrides[get_places]


def client_token(client: TestClient, locale: str = "fr") -> str:
    return token_for(client, f"{uuid.uuid4()}@example.com", locale=locale)


def test_autocomplete_returns_suggestions(client: TestClient, google: FakeGoogle):
    response = client.get(
        "/addresses/autocomplete",
        params={"q": "1 place ville", "session": SESSION},
        headers=bearer(client_token(client, locale="en")),
    )

    assert response.status_code == 200
    assert response.json() == [
        {"place_id": "pvm", "text": "1 Place Ville Marie, Montréal, QC, Canada"}
    ]
    sent = google.requests[0]
    assert sent.headers["x-goog-api-key"] == settings.google_maps_api_key.get_secret_value()
    body = json.loads(sent.content)
    assert body["input"] == "1 place ville"
    assert body["sessionToken"] == SESSION
    assert body["includedRegionCodes"] == ["ca"]
    assert body["languageCode"] == "en"
    assert "circle" in body["locationBias"]


def test_resolve_returns_address_and_token(client: TestClient, google: FakeGoogle):
    token = client_token(client)
    response = client.get(
        "/addresses/resolve", params={"place_id": "pvm", "session": SESSION}, headers=bearer(token)
    )

    assert response.status_code == 200
    assert response.json()["address"] == "1 Place Ville-Marie, Montréal, QC H3B 2B6, Canada"
    sent = google.requests[0]
    assert sent.url.path == "/v1/places/pvm"
    # Same session token as the suggestions, and Essentials fields only, so it's billed as one.
    assert sent.url.params["sessionToken"] == SESSION
    assert sent.headers["x-goog-fieldmask"] == "formattedAddress,location"

    user_id = uuid.UUID(client.get("/me", headers=bearer(token)).json()["id"])
    pickup = decode_address_token(response.json()["token"], user_id)
    assert pickup == {
        "address": "1 Place Ville-Marie, Montréal, QC H3B 2B6, Canada",
        "latitude": 45.5017,
        "longitude": -73.5690,
    }


@pytest.mark.parametrize(
    "locale, message",
    [
        ("en", "We don't pick up at this address yet. For now, we only serve Montreal."),
        (
            "fr",
            "Nous ne desservons pas encore cette adresse. Pour l'instant, seulement Montréal.",
        ),
    ],
)
def test_resolve_refuses_address_outside_montreal(
    client: TestClient, google: FakeGoogle, locale: str, message: str
):
    google.location = QUEBEC_CITY

    response = client.get(
        "/addresses/resolve",
        params={"place_id": "qc", "session": SESSION},
        headers=bearer(client_token(client, locale=locale)),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == message


def test_google_failure_is_a_bilingual_502(client: TestClient, google: FakeGoogle):
    google.status = 500

    response = client.get(
        "/addresses/autocomplete",
        params={"q": "1 place", "session": SESSION},
        headers=bearer(client_token(client, locale="en")),
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "Address search isn't working right now. Try again."


@pytest.mark.parametrize(
    "path, params",
    [
        ("/addresses/autocomplete", {"q": "1 place", "session": SESSION}),
        ("/addresses/resolve", {"place_id": "pvm", "session": SESSION}),
    ],
)
def test_address_lookup_needs_a_signed_in_client(
    client: TestClient, google: FakeGoogle, path: str, params: dict[str, str]
):
    assert client.get(path, params=params).status_code == 401

    driver = token_for(client, "addr-driver@example.com", role="driver")
    assert client.get(path, params=params, headers=bearer(driver)).status_code == 403
    assert google.requests == []


USER = uuid.uuid4()
PICKUP = {"address": "1 Place Ville-Marie", "latitude": 45.5017, "longitude": -73.5690}


def test_address_token_round_trips():
    assert decode_address_token(create_address_token(USER, **PICKUP), USER) == PICKUP


def tampered() -> str:
    header, _, signature = create_address_token(USER, **PICKUP).split(".")
    moved = {"aud": "address", "sub": str(USER), **PICKUP, "latitude": 46.8131}
    payload = jwt.encode(moved, "any-key-at-all-long-enough-for-hs256", "HS256").split(".")[1]
    return f"{header}.{payload}.{signature}"


def expired() -> str:
    claims = {
        "aud": "address",
        "sub": str(USER),
        **PICKUP,
        "exp": datetime.now(UTC) - timedelta(seconds=1),
    }
    return jwt.encode(claims, settings.jwt_secret.get_secret_value(), "HS256")


@pytest.mark.parametrize(
    "token, user",
    [
        pytest.param(tampered, USER, id="tampered"),
        pytest.param(expired, USER, id="expired"),
        pytest.param(lambda: create_address_token(USER, **PICKUP), uuid.uuid4(), id="other-user"),
        pytest.param(lambda: "not-a-jwt", USER, id="garbage"),
    ],
)
def test_address_token_rejects(token, user: uuid.UUID):
    assert decode_address_token(token(), user) is None


def test_address_token_is_not_a_login(client: TestClient):
    user_id = uuid.UUID(client.get("/me", headers=bearer(client_token(client))).json()["id"])
    address_token = create_address_token(user_id, **PICKUP)

    assert client.get("/me", headers=bearer(address_token)).status_code == 401
