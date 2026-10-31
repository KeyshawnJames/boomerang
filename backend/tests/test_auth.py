import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.api.deps import require_role
from app.core.config import settings
from app.core.db import get_session
from app.main import app
from app.models import DriverProfile, User, UserRole

PASSWORD = "correct horse battery"


def register(client: TestClient, email: str, role: str = "client", **extra):
    body = {"role": role, "name": "Test", "email": email, "password": PASSWORD, **extra}
    return client.post("/auth/register", json=body)


def login(client: TestClient, email: str, password: str = PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def token_for(client: TestClient, email: str, role: str = "client", **extra) -> str:
    assert register(client, email, role, **extra).status_code == 201
    return login(client, email).json()["access_token"]


def test_register_login_then_me(client: TestClient):
    registered = register(client, "Alice@Example.com", locale="en")
    assert registered.status_code == 201
    assert registered.json()["email"] == "alice@example.com"
    assert "password_hash" not in registered.json()

    logged_in = login(client, "ALICE@example.com")
    assert logged_in.status_code == 200
    assert logged_in.json()["token_type"] == "bearer"

    me = client.get("/me", headers=bearer(logged_in.json()["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "alice@example.com"
    assert me.json()["role"] == "client"
    assert me.json()["locale"] == "en"
    assert "password_hash" not in me.json()


def test_register_stores_a_hash_not_the_password(client: TestClient, session: Session):
    user_id = register(client, "bob@example.com").json()["id"]

    user = session.get(User, uuid.UUID(user_id))
    assert user.password_hash.startswith("$argon2")
    assert PASSWORD not in user.password_hash


def test_register_driver_creates_driver_profile(client: TestClient, session: Session):
    user_id = register(client, "dina@example.com", role="driver").json()["id"]

    assert session.get(DriverProfile, uuid.UUID(user_id)) is not None


def test_register_rejects_duplicate_email_in_any_case(client: TestClient):
    assert register(client, "carl@example.com").status_code == 201

    response = register(client, "Carl@Example.com", locale="en")
    assert response.status_code == 409
    assert response.json()["detail"] == "An account with this email already exists."


def test_register_cannot_create_admin(client: TestClient):
    assert register(client, "eve@example.com", role="admin").status_code == 422


def test_register_rejects_short_password(client: TestClient):
    response = client.post(
        "/auth/register",
        json={"role": "client", "name": "T", "email": "s@example.com", "password": "short"},
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "email, password", [("fay@example.com", "wrong password"), ("nobody@example.com", PASSWORD)]
)
def test_login_failure_is_the_same_for_wrong_password_and_unknown_email(
    client: TestClient, email: str, password: str
):
    register(client, "fay@example.com")

    response = login(client, email, password)
    assert response.status_code == 401
    # French is the fallback when the device language is not English (ADR 0007).
    assert response.json()["detail"] == "Courriel ou mot de passe incorrect."


def test_error_follows_device_language_before_sign_in(client: TestClient):
    response = client.get("/me", headers={"Accept-Language": "en-CA,fr;q=0.8"})
    assert response.status_code == 401
    assert response.json()["detail"] == "You are not signed in, or your session has expired."


def _token(secret: str, sub: str, expires_in: timedelta) -> str:
    return jwt.encode({"sub": sub, "exp": datetime.now(UTC) + expires_in}, secret, "HS256")


SECRET = settings.jwt_secret.get_secret_value()


@pytest.mark.parametrize(
    "headers",
    [
        {},
        bearer("not-a-jwt"),
        bearer(
            _token("another-secret-that-is-long-enough!!", str(uuid.uuid4()), timedelta(hours=1))
        ),
        bearer(_token(SECRET, str(uuid.uuid4()), timedelta(hours=1))),  # no such user
        bearer(_token(SECRET, "not-a-uuid", timedelta(hours=1))),
        bearer(jwt.encode({"sub": str(uuid.uuid4())}, SECRET, "HS256")),  # no expiry
        {"Authorization": "Basic dXNlcjpwYXNz"},
    ],
)
def test_me_rejects_bad_tokens(client: TestClient, headers: dict[str, str]):
    response = client.get("/me", headers=headers)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_rejects_expired_token(client: TestClient):
    user_id = register(client, "gus@example.com").json()["id"]

    response = client.get("/me", headers=bearer(_token(SECRET, user_id, timedelta(seconds=-1))))
    assert response.status_code == 401


# A stand-in for the real driver routes that come later.
role_app = FastAPI()


@role_app.get("/driver-only")
def driver_only(user: Annotated[User, Depends(require_role(UserRole.driver))]) -> dict[str, str]:
    return {"id": str(user.id)}


@pytest.fixture
def role_client(client: TestClient) -> Iterator[TestClient]:
    role_app.dependency_overrides[get_session] = app.dependency_overrides[get_session]
    yield TestClient(role_app)
    role_app.dependency_overrides.clear()


def test_require_role_allows_matching_role(client: TestClient, role_client: TestClient):
    token = token_for(client, "hal@example.com", role="driver")

    assert role_client.get("/driver-only", headers=bearer(token)).status_code == 200


def test_require_role_rejects_wrong_role_in_app_language(
    client: TestClient, role_client: TestClient
):
    # The profile says French; the app's language wins.
    assert register(client, "ida@example.com", locale="fr").status_code == 201
    token = login(client, "ida@example.com").json()["access_token"]

    response = role_client.get("/driver-only", headers={**bearer(token), "Accept-Language": "en"})
    assert response.status_code == 403
    assert response.json()["detail"] == "You don't have access to this."


def test_require_role_rejects_missing_token(role_client: TestClient):
    assert role_client.get("/driver-only").status_code == 401


def test_update_me_stores_phone_as_e164(client: TestClient):
    token = token_for(client, "jo@example.com")

    response = client.patch("/me", json={"phone": "(514) 555-0123"}, headers=bearer(token))
    assert response.status_code == 200
    assert response.json()["phone"] == "+15145550123"
    assert client.get("/me", headers=bearer(token)).json()["phone"] == "+15145550123"


@pytest.mark.parametrize(
    "locale, message",
    [
        ("en", "Enter a valid phone number."),
        ("fr", "Entrez un numéro de téléphone valide."),
    ],
)
@pytest.mark.parametrize("phone", ["123", "514-123-4567", "not a phone"])
def test_update_me_rejects_invalid_phone_in_app_language(
    client: TestClient, phone: str, locale: str, message: str
):
    assert register(client, "kim@example.com").status_code == 201
    token = login(client, "kim@example.com").json()["access_token"]

    response = client.patch(
        "/me", json={"phone": phone}, headers={**bearer(token), "Accept-Language": locale}
    )
    assert response.status_code == 422
    assert response.json()["detail"] == message


def test_update_me_rejects_missing_token(client: TestClient):
    assert client.patch("/me", json={"phone": "514 555 0123"}).status_code == 401


def test_register_stores_phone_as_e164(client: TestClient):
    response = register(client, "lu@example.com", phone="514 555 0123")
    assert response.json()["phone"] == "+15145550123"


def test_register_rejects_empty_phone(client: TestClient):
    assert register(client, "mo@example.com", phone="").status_code == 422
