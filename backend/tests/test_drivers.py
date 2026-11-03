import uuid

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.drivers import approve
from app.models import DriverProfile, User
from tests.test_auth import register


def test_approve_approves_an_existing_driver(client: TestClient, session: Session):
    driver_id = register(client, "Kim@Example.com", role="driver").json()["id"]

    approve(session, "kim@EXAMPLE.com")
    session.commit()

    assert session.get(DriverProfile, uuid.UUID(driver_id)).is_approved is True


def test_approve_refuses_unknown_email(session: Session):
    with pytest.raises(SystemExit, match="nobody@example.com"):
        approve(session, "nobody@example.com")


def test_approve_refuses_a_client(client: TestClient, session: Session):
    register(client, "pat@example.com")

    with pytest.raises(SystemExit, match="pat@example.com"):
        approve(session, "pat@example.com")

    user = session.exec(select(User).where(User.email == "pat@example.com")).one()
    assert session.get(DriverProfile, user.id) is None
