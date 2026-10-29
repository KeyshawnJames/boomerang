from collections.abc import Iterator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlmodel import Session

from app.core.db import get_session
from app.main import app


def test_health_returns_ok(client: TestClient):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_health_reports_unreachable_database():
    unreachable = create_engine("postgresql+psycopg://nobody:nothing@127.0.0.1:1/none")

    def broken_session() -> Iterator[Session]:
        with Session(unreachable) as session:
            yield session

    app.dependency_overrides[get_session] = broken_session
    try:
        response = TestClient(app).get("/health")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "unreachable"}


def test_cors_allows_expo_dev_origin(client: TestClient):
    response = client.options(
        "/health",
        headers={"Origin": "http://localhost:8081", "Access-Control-Request-Method": "GET"},
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:8081"


def test_cors_rejects_unknown_origin(client: TestClient):
    response = client.options(
        "/health",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )

    assert "access-control-allow-origin" not in response.headers
