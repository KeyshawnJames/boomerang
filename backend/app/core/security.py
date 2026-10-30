import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

# Fixed, never read from config, so a token can't pick its own algorithm.
ALGORITHM = "HS256"
# Only address tokens carry this audience, so neither kind of token passes for the other.
ADDRESS_AUDIENCE = "address"
ADDRESS_TOKEN_TTL = timedelta(hours=1)

password_hasher = PasswordHash.recommended()
# Checked when the email is unknown, so login takes as long whether or not the account exists.
DUMMY_HASH = password_hasher.hash("not-a-real-password")


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(UTC)
    expires = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "iat": now, "exp": expires}
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID | None:
    """The user id in a valid, unexpired token, or None."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        return uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None


def create_address_token(
    user_id: uuid.UUID, address: str, latitude: float, longitude: float
) -> str:
    """Vouches that the server looked up this pickup address for this user (ADR 0013)."""
    now = datetime.now(UTC)
    payload = {
        "aud": ADDRESS_AUDIENCE,
        "sub": str(user_id),
        "address": address,
        "latitude": latitude,
        "longitude": longitude,
        "iat": now,
        "exp": now + ADDRESS_TOKEN_TTL,
    }
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=ALGORITHM)


def decode_address_token(token: str, user_id: uuid.UUID) -> dict[str, Any] | None:
    """The address, latitude and longitude in a valid token issued to this user, or None."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[ALGORITHM],
            audience=ADDRESS_AUDIENCE,
            options={"require": ["exp", "sub", "aud"]},
        )
    except jwt.InvalidTokenError:
        return None
    if payload["sub"] != str(user_id):
        return None
    return {key: payload[key] for key in ("address", "latitude", "longitude")}
