from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import EligibilityQuestion, Retailer
from app.seed import seed
from app.services.booking import MONTREAL, pickup_slots
from tests.test_auth import bearer, login, register


def token(client: TestClient, email: str, role: str = "client", locale: str = "fr") -> str:
    assert register(client, email, role, locale=locale).status_code == 201
    return login(client, email).json()["access_token"]


def mtl(day: int, hour: int, minute: int = 0, month: int = 11) -> datetime:
    return datetime(2026, month, day, hour, minute, tzinfo=MONTREAL)


def windows(now: datetime) -> list[tuple[datetime, datetime, bool]]:
    return [(slot.start, slot.end, slot.asap) for slot in pickup_slots(now)]


def two_hour_blocks(day: int, hours: range) -> list[tuple[datetime, datetime, bool]]:
    return [(mtl(day, h), mtl(day, h + 2), False) for h in hours]


# Service hours default to 9:00–21:00 (config).
def test_open_offers_asap_then_blocks_up_to_24_hours_ahead():
    assert windows(mtl(2, 10, 15)) == [
        (mtl(2, 10, 15), mtl(2, 12, 15), True),
        *two_hour_blocks(2, range(11, 21, 2)),
        *two_hour_blocks(3, range(9, 10)),  # 9:00 tomorrow is within 24h; 11:00 is not
    ]


def test_closed_in_the_morning_offers_todays_blocks_without_asap():
    assert windows(mtl(2, 6)) == two_hour_blocks(2, range(9, 21, 2))


def test_late_evening_offers_no_asap_that_would_run_past_closing():
    # Open until 21:00, but an ASAP window would end at 22:00.
    assert windows(mtl(2, 20)) == two_hour_blocks(3, range(9, 21, 2))


def test_after_closing_offers_tomorrows_blocks():
    assert windows(mtl(2, 23, 30)) == two_hour_blocks(3, range(9, 21, 2))


def test_horizon_is_24_real_hours_across_a_clock_change():
    # Clocks fall back on Nov 1, 2026: 24h after 19:30 EDT is 18:30 EST, so 19:00 is out.
    assert windows(mtl(31, 19, 30, month=10)) == two_hour_blocks(1, range(9, 19, 2))


def test_booking_options_has_fee_and_slots(client: TestClient):
    response = client.get("/booking/options", headers=bearer(token(client, "bo@example.com")))

    assert response.status_code == 200
    assert response.json()["pickup_fee"] == 499
    slots = response.json()["slots"]
    assert slots
    assert all(
        datetime.fromisoformat(s["end"]) - datetime.fromisoformat(s["start"]) == timedelta(hours=2)
        for s in slots
    )


def test_retailers_sorted_by_name(client: TestClient, session: Session):
    session.add_all([Retailer(name="Simons"), Retailer(name="Aldo")])
    session.flush()

    response = client.get("/retailers", headers=bearer(token(client, "re@example.com")))

    assert response.status_code == 200
    assert [r["name"] for r in response.json()] == ["Aldo", "Simons"]


@pytest.mark.parametrize(
    "locale, prompt, label",
    [
        ("en", "Has the retailer approved this return?", "Not sure"),
        ("fr", "Le détaillant a-t-il approuvé ce retour?", "Je ne sais pas"),
    ],
)
def test_eligibility_questions_in_user_language(
    client: TestClient, session: Session, locale: str, prompt: str, label: str
):
    seed(session)
    session.add(
        EligibilityQuestion(
            code="retired", prompt_en="Old?", prompt_fr="Vieux?", options=[], active=False
        )
    )
    session.flush()

    response = client.get(
        "/eligibility/questions", headers=bearer(token(client, "eq@example.com", locale=locale))
    )

    assert response.status_code == 200
    body = response.json()
    assert body["policy_version"] == 1
    assert "retired" not in [q["code"] for q in body["questions"]]
    first = body["questions"][0]
    assert first["code"] == "merchant_approved"
    assert first["prompt"] == prompt
    # The app previews the outcome; POST /returns re-checks it.
    assert first["options"][2] == {"value": "not_sure", "label": label, "outcome": "warn"}


@pytest.mark.parametrize("path", ["/retailers", "/eligibility/questions", "/booking/options"])
def test_booking_reference_needs_a_signed_in_client(client: TestClient, path: str):
    assert client.get(path).status_code == 401

    driver = token(client, "dr@example.com", role="driver")
    assert client.get(path, headers=bearer(driver)).status_code == 403
