from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from tests.test_auth import bearer, token_for

JPEG = b"\xff\xd8\xff\xe0 not really a photo"


@pytest.fixture(autouse=True)
def upload_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(settings, "upload_dir", tmp_path)
    return tmp_path


def presign(client: TestClient, token: str, kind: str = "label", content_type: str = "image/jpeg"):
    return client.post(
        "/uploads/presign",
        json={"kind": kind, "content_type": content_type},
        headers=bearer(token),
    )


def put(client: TestClient, url: str, body: bytes = JPEG, content_type: str = "image/jpeg"):
    return client.put(url, content=body, headers={"Content-Type": content_type})


def with_token(url: str, token: str) -> str:
    return url.split("?")[0] + "?token=" + token


def token_of(url: str) -> str:
    return parse_qs(urlsplit(url).query)["token"][0]


def test_upload_with_signed_url_stores_the_file(client: TestClient, upload_dir: Path):
    me = client.get("/me", headers=bearer(token := token_for(client, "a@example.com")))
    signed = presign(client, token, kind="package", content_type="image/heic")
    assert signed.status_code == 200
    key, url = signed.json()["key"], signed.json()["url"]

    assert key.startswith(f"{me.json()['id']}/package/")
    assert key.endswith(".heic")
    assert put(client, url, content_type="image/heic").status_code == 204
    assert (upload_dir / key).read_bytes() == JPEG


def test_presign_without_auth_is_401(client: TestClient):
    response = client.post("/uploads/presign", json={"kind": "label", "content_type": "image/jpeg"})
    assert response.status_code == 401


def test_presign_refuses_other_content_types(client: TestClient):
    token = token_for(client, "a@example.com")
    assert presign(client, token, content_type="application/pdf").status_code == 422
    assert presign(client, token, kind="selfie").status_code == 422


def test_drivers_cannot_presign(client: TestClient):
    token = token_for(client, "d@example.com", role="driver")
    assert presign(client, token).status_code == 403


def test_expired_signature_is_refused(client: TestClient, upload_dir: Path):
    url = presign(client, token_for(client, "a@example.com")).json()["url"]
    payload = jwt.decode(token_of(url), options={"verify_signature": False})
    payload["exp"] = datetime.now(UTC) - timedelta(seconds=1)
    expired = jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm="HS256")

    assert put(client, with_token(url, expired)).status_code == 403
    assert not any(upload_dir.rglob("*.jpg"))


def test_tampered_signature_is_refused(client: TestClient):
    url = presign(client, token_for(client, "a@example.com")).json()["url"]
    payload = jwt.decode(token_of(url), options={"verify_signature": False})
    payload["max_bytes"] = 10**12
    forged = jwt.encode(payload, "x" * 32, algorithm="HS256")

    assert put(client, with_token(url, forged)).status_code == 403


def test_signature_only_fits_its_own_key(client: TestClient):
    token = token_for(client, "a@example.com")
    first = presign(client, token).json()
    second = presign(client, token).json()

    assert put(client, with_token(second["url"], token_of(first["url"]))).status_code == 403


def test_login_token_is_not_an_upload_signature(client: TestClient):
    token = token_for(client, "a@example.com")
    url = presign(client, token).json()["url"]

    assert put(client, with_token(url, token)).status_code == 403


def test_wrong_content_type_is_refused(client: TestClient):
    url = presign(client, token_for(client, "a@example.com")).json()["url"]
    assert put(client, url, content_type="image/png").status_code == 415


def test_oversized_file_is_refused(
    client: TestClient, upload_dir: Path, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "upload_max_bytes", 10)
    url = presign(client, token_for(client, "a@example.com")).json()["url"]

    assert put(client, url, body=b"x" * 11).status_code == 413
    assert not any(upload_dir.rglob("*.jpg"))
    assert put(client, url, body=b"x" * 10).status_code == 204


def test_missing_signature_is_refused(client: TestClient):
    url = presign(client, token_for(client, "a@example.com")).json()["url"]
    response = put(client, url.split("?")[0])

    assert response.status_code == 403
    assert "lien" in response.json()["detail"]  # French by default (ADR 0007)


def test_content_type_parameters_are_ignored(client: TestClient):
    url = presign(client, token_for(client, "a@example.com")).json()["url"]
    assert put(client, url, content_type="Image/JPEG; charset=binary").status_code == 204


def test_signed_url_uploads_only_once(client: TestClient, upload_dir: Path):
    signed = presign(client, token_for(client, "a@example.com")).json()
    assert put(client, signed["url"]).status_code == 204

    assert put(client, signed["url"], body=b"replaced").status_code == 403
    assert (upload_dir / signed["key"]).read_bytes() == JPEG
