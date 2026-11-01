from datetime import date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlmodel import Session

from app.core.config import Settings, settings
from app.models import EligibilityQuestion, Retailer
from app.seed import seed
from app.services.booking import MONTREAL, pickup_slots
from tests.test_auth import bearer, token_for


def mtl(day: int, hour: int, minute: int = 0, month: int = 11) -> datetime:
    return datetime(2026, month, day, hour, minute, tzinfo=MONTREAL)


DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
ALWAYS = {day: [["00:00", "24:00"]] for day in DAYS}


def windows(
    now: datetime, counters: list[dict] | None = None
) -> list[tuple[datetime, datetime, bool]]:
    return [
        (s.start, s.end, s.asap)
        for s in pickup_slots(now, [ALWAYS] if counters is None else counters)
    ]


def two_hour_blocks(day: int, hours: range) -> list[tuple[datetime, datetime, bool]]:
    return [(mtl(day, h), mtl(day, h + 2), False) for h in hours]


# Service hours default to 9:00–21:00 (config). Nov 2, 2026 is a Monday.
def test_open_offers_asap_then_the_rest_of_today_and_all_of_tomorrow():
    assert windows(mtl(2, 10, 15)) == [
        (mtl(2, 10, 15), mtl(2, 12, 15), True),
        *two_hour_blocks(2, range(11, 21, 2)),
        *two_hour_blocks(3, range(9, 21, 2)),
    ]


def test_evening_still_offers_all_of_tomorrow():
    # At 6:43 PM the old 24-hour limit hid tomorrow's 7 to 9 PM window.
    assert windows(mtl(2, 18, 43)) == [
        (mtl(2, 18, 43), mtl(2, 20, 43), True),
        (mtl(2, 19), mtl(2, 21), False),
        *two_hour_blocks(3, range(9, 21, 2)),
    ]


def test_closed_in_the_morning_offers_today_and_tomorrow_without_asap():
    assert windows(mtl(2, 6)) == [
        *two_hour_blocks(2, range(9, 21, 2)),
        *two_hour_blocks(3, range(9, 21, 2)),
    ]


def test_late_evening_offers_no_asap_that_would_run_past_closing():
    # Open until 21:00, but an ASAP window would end at 22:00.
    assert windows(mtl(2, 20)) == two_hour_blocks(3, range(9, 21, 2))


def test_after_closing_offers_tomorrows_blocks():
    assert windows(mtl(2, 23, 30)) == two_hour_blocks(3, range(9, 21, 2))


def test_window_needs_a_counter_open_45_minutes_after_it_ends():
    counter = {day: [["09:00", "17:30"]] for day in DAYS[:5]}
    # 15–17 arrives at 17:45, after closing.
    assert windows(mtl(2, 6), [counter]) == [
        *two_hour_blocks(2, range(9, 15, 2)),
        *two_hour_blocks(3, range(9, 15, 2)),
    ]


def test_arriving_at_closing_time_is_too_late():
    counter = {"mon": [["09:00", "17:45"]]}
    assert (mtl(2, 15), mtl(2, 17), False) not in windows(mtl(2, 6), [counter])


def test_sunday_counter_hours():
    # Saturday Nov 7 after the last window; Sunday's counter opens noon to 5 PM.
    sunday = {"sun": [["12:00", "17:00"]]}
    assert windows(mtl(7, 20), [sunday]) == two_hour_blocks(8, range(11, 15, 2))


def test_asap_needs_an_open_counter():
    counter = {"mon": [["09:00", "17:30"]]}
    assert not any(asap for *_, asap in windows(mtl(2, 15, 30), [counter]))


def test_two_counters_either_can_take_it():
    morning = {"mon": [["09:00", "13:00"]]}
    evening = {"mon": [["15:00", "21:00"]]}
    # 11–13 arrives at 13:45, between the two; 19–21 arrives at 21:45, after both.
    assert windows(mtl(2, 6), [morning, evening]) == [
        (mtl(2, 9), mtl(2, 11), False),
        *two_hour_blocks(2, range(13, 19, 2)),
    ]


def test_lunch_closure():
    counter = {"mon": [["09:00", "12:00"], ["13:00", "17:00"]]}
    # ASAP 10:00–12:00 arrives 12:45, during lunch.
    assert windows(mtl(2, 10), [counter]) == two_hour_blocks(2, range(11, 15, 2))


def test_no_windows_on_a_holiday(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "holidays", [date(2026, 11, 3)])
    assert windows(mtl(2, 22)) == []


def test_no_counters_no_windows():
    assert windows(mtl(2, 6), []) == []
    assert windows(mtl(2, 6), [None]) == []


def test_booking_options_has_fee_and_slots(client: TestClient):
    response = client.get("/booking/options", headers=bearer(token_for(client, "bo@example.com")))

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

    response = client.get("/retailers", headers=bearer(token_for(client, "re@example.com")))

    assert response.status_code == 200
    assert [r["name"] for r in response.json()] == ["Aldo", "Simons"]


@pytest.mark.parametrize(
    "locale, prompt, label",
    [
        ("en", "Has the retailer approved this return?", "Not sure"),
        ("fr", "Le détaillant a-t-il approuvé ce retour?", "Je ne sais pas"),
    ],
)
def test_eligibility_questions_in_app_language(
    client: TestClient, session: Session, locale: str, prompt: str, label: str
):
    seed(session)
    session.add(
        EligibilityQuestion(
            code="retired", prompt_en="Old?", prompt_fr="Vieux?", options=[], active=False
        )
    )
    session.flush()

    # The profile language is the other one: the app's language wins.
    other = "fr" if locale == "en" else "en"
    token = token_for(client, "eq@example.com", locale=other)
    response = client.get(
        "/eligibility/questions", headers={**bearer(token), "Accept-Language": locale}
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

    driver = token_for(client, "dr@example.com", role="driver")
    assert client.get(path, headers=bearer(driver)).status_code == 403


@pytest.mark.parametrize("open_hour, close_hour", [(9, 24), (21, 9), (-1, 21)])
def test_service_hours_must_be_a_daytime_range(open_hour: int, close_hour: int):
    with pytest.raises(ValidationError):
        Settings(service_open_hour=open_hour, service_close_hour=close_hour)
