import uuid
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api import returns
from app.core.config import settings
from app.core.security import create_address_token
from app.models import (
    BlockedRequestLog,
    ReturnEligibilityAnswer,
    ReturnRequest,
    ReturnStatusEvent,
)
from app.schemas.booking import PickupSlot
from app.seed import seed, seed_id
from app.services.booking import MONTREAL, pickup_slots
from tests.test_auth import bearer, token_for
from tests.test_uploads import presign, put

PHONE = "+15145550123"
ALL_PASS = {
    "merchant_approved": "yes",
    "label_ready": "yes",
    "package_sealed": "yes",
    "prohibited_items": "no",
    "return_deadline": "yes",
}


@pytest.fixture(autouse=True)
def setup(session: Session, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "upload_dir", tmp_path)
    seed(session)
    session.flush()


def sign_in(client: TestClient, locale: str = "en", **extra) -> tuple[str, uuid.UUID]:
    token = token_for(client, f"{uuid.uuid4()}@example.com", locale=locale, **extra)
    return token, uuid.UUID(client.get("/me", headers=bearer(token)).json()["id"])


def uploaded(client: TestClient, token: str, kind: str) -> str:
    signed = presign(client, token, kind=kind).json()
    assert put(client, signed["url"]).status_code == 204
    return signed["key"]


def later_slot() -> PickupSlot:
    # The last window starts hours from now, so it is still offered when the request lands.
    return pickup_slots(datetime.now(MONTREAL))[-1]


def booking(client: TestClient, token: str, user_id: uuid.UUID, **overrides) -> dict:
    address = create_address_token(user_id, "1 Place Ville-Marie, Montréal", 45.5017, -73.5690)
    return {
        "retailer_id": str(seed_id("retailer:simons")),
        "carrier": "canada_post",
        "label_type": "qr_code",
        "order_number": "A-123",
        "label_photo_key": uploaded(client, token, "label"),
        "package_photo_key": uploaded(client, token, "package"),
        "address_token": address,
        "pickup_notes": "Apt 4, buzzer 12",
        "pickup_window_start": later_slot().start.isoformat(),
        "answers": ALL_PASS,
        "policy_version": 1,
        "attested": True,
    } | overrides


def post(client: TestClient, token: str, body: dict, language: str = "en"):
    headers = {**bearer(token), "Accept-Language": language}
    return client.post("/returns", json=body, headers=headers)


def test_create_return_happy_path(client: TestClient, session: Session):
    token, user_id = sign_in(client, phone=PHONE)
    body = booking(client, token, user_id, pickup_fee=1)  # the fee is never read from the request

    response = post(client, token, body)

    assert response.status_code == 201, response.text
    created = response.json()
    assert created["status"] == "awaiting_payment"
    assert created["pickup_fee"] == settings.pickup_fee
    assert created["eligibility_outcome"] == "eligible"
    assert created["pickup_address"] == "1 Place Ville-Marie, Montréal"
    assert created["pickup_notes"] == "Apt 4, buzzer 12"
    slot = later_slot()
    assert datetime.fromisoformat(created["pickup_window_start"]) == slot.start
    assert datetime.fromisoformat(created["pickup_window_end"]) == slot.end

    return_request = session.get(ReturnRequest, uuid.UUID(created["id"]))
    assert return_request.client_id == user_id
    assert return_request.label_image_url == body["label_photo_key"]
    assert return_request.package_photo_url == body["package_photo_key"]
    assert return_request.eligibility_policy_version == 1
    answers = session.exec(
        select(ReturnEligibilityAnswer).where(
            ReturnEligibilityAnswer.return_id == return_request.id
        )
    ).all()
    assert {a.question_code: a.answer_value for a in answers} == ALL_PASS
    first = next(a for a in answers if a.question_code == "merchant_approved")
    assert (first.prompt_snapshot, first.answer_label_snapshot) == (
        "Has the retailer approved this return?",
        "Yes",
    )
    events = session.exec(
        select(ReturnStatusEvent).where(ReturnStatusEvent.return_id == return_request.id)
    ).all()
    assert [(e.status, e.actor_id) for e in events] == [("awaiting_payment", user_id)]

    fetched = client.get(f"/returns/{created['id']}", headers=bearer(token))
    assert fetched.status_code == 200
    assert fetched.json() == created


def test_snapshots_are_in_the_apps_language(client: TestClient, session: Session):
    # The profile says English, but the app is in French: the client read French.
    token, user_id = sign_in(client, locale="en", phone=PHONE)

    response = post(client, token, booking(client, token, user_id), language="fr")

    assert response.status_code == 201, response.text
    answer = session.exec(
        select(ReturnEligibilityAnswer).where(
            ReturnEligibilityAnswer.return_id == uuid.UUID(response.json()["id"]),
            ReturnEligibilityAnswer.question_code == "merchant_approved",
        )
    ).one()
    assert (answer.prompt_snapshot, answer.answer_label_snapshot) == (
        "Le détaillant a-t-il approuvé ce retour?",
        "Oui",
    )


def test_blocked_answer_is_refused_logged_and_creates_nothing(client: TestClient, session: Session):
    token, user_id = sign_in(client, phone=PHONE)
    answers = ALL_PASS | {"merchant_approved": "no", "prohibited_items": "yes"}

    response = post(client, token, booking(client, token, user_id, answers=answers))

    assert response.status_code == 422
    assert response.json()["blocking_codes"] == ["merchant_approved", "prohibited_items"]
    assert isinstance(response.json()["detail"], str)
    logs = session.exec(select(BlockedRequestLog)).all()
    assert [(log.client_id, log.retailer_id) for log in logs] == [
        (user_id, seed_id("retailer:simons"))
    ]
    assert logs[0].blocking_question_codes == ["merchant_approved", "prohibited_items"]
    assert session.exec(select(ReturnRequest)).all() == []


def test_warning_needs_acknowledgment(client: TestClient):
    token, user_id = sign_in(client, phone=PHONE)
    body = booking(client, token, user_id, answers=ALL_PASS | {"package_sealed": "not_yet"})

    assert post(client, token, body).status_code == 422

    acknowledged = post(client, token, body | {"acknowledged_warnings": True})
    assert acknowledged.status_code == 201, acknowledged.text
    assert acknowledged.json()["eligibility_outcome"] == "eligible_with_warnings"


@pytest.mark.parametrize(
    "answers",
    [
        pytest.param({k: v for k, v in ALL_PASS.items() if k != "label_ready"}, id="missing"),
        pytest.param(ALL_PASS | {"made_up": "yes"}, id="unknown-question"),
        pytest.param(ALL_PASS | {"label_ready": "maybe"}, id="unknown-option"),
    ],
)
def test_incomplete_or_unknown_answers_are_refused(client: TestClient, answers: dict):
    token, user_id = sign_in(client, phone=PHONE)
    assert post(client, token, booking(client, token, user_id, answers=answers)).status_code == 422


@pytest.mark.parametrize(
    "overrides",
    [
        pytest.param({"attested": False}, id="not-attested"),
        pytest.param({"policy_version": 0}, id="answered-an-older-question-set"),
        pytest.param({"retailer_id": str(uuid.uuid4())}, id="unknown-retailer"),
        pytest.param({"carrier": "fedex"}, id="carrier-we-dont-serve"),
        pytest.param({"label_type": "email"}, id="unknown-label-type"),
        pytest.param({"address_token": "not-a-jwt"}, id="bad-address-token"),
        pytest.param({"pickup_window_start": None}, id="no-window"),
        pytest.param({"pickup_window_start": "2020-01-01T09:00:00-05:00"}, id="window-not-offered"),
    ],
)
def test_invalid_booking_is_refused(client: TestClient, session: Session, overrides: dict):
    token, user_id = sign_in(client, phone=PHONE)

    response = post(client, token, booking(client, token, user_id, **overrides))

    assert response.status_code == 422
    assert session.exec(select(ReturnRequest)).all() == []


def test_errors_are_bilingual(client: TestClient):
    token, user_id = sign_in(client, phone=PHONE)
    response = post(client, token, booking(client, token, user_id, attested=False), language="fr")
    assert response.json()["detail"] == "Confirmez que vos réponses sont exactes."


def test_phone_is_required(client: TestClient):
    token, user_id = sign_in(client)
    response = post(client, token, booking(client, token, user_id))
    assert response.status_code == 422
    assert response.json()["detail"] == "Add a phone number so the driver can reach you."


def test_address_token_of_another_user_is_refused(client: TestClient):
    token, user_id = sign_in(client, phone=PHONE)
    other = create_address_token(uuid.uuid4(), "Elsewhere", 45.5, -73.5)
    response = post(client, token, booking(client, token, user_id, address_token=other))
    assert response.status_code == 422


def test_photos_must_be_the_callers_and_uploaded(client: TestClient):
    token, user_id = sign_in(client, phone=PHONE)
    other_token, _ = sign_in(client)
    body = booking(client, token, user_id)
    not_uploaded = presign(client, token, kind="package").json()["key"]

    for overrides in [
        {"label_photo_key": uploaded(client, other_token, "label")},
        {"package_photo_key": not_uploaded},
        {"package_photo_key": body["label_photo_key"]},  # a label photo isn't a package photo
        {"label_photo_key": f"{user_id}/label/../../{uuid.uuid4()}.jpg"},
    ]:
        assert post(client, token, body | overrides).status_code == 422, overrides


def test_a_photo_backs_only_one_return(client: TestClient):
    token, user_id = sign_in(client, phone=PHONE)
    first = booking(client, token, user_id)
    assert post(client, token, first).status_code == 201

    again = booking(client, token, user_id, label_photo_key=first["label_photo_key"])
    assert post(client, token, again).status_code == 422
    again = booking(client, token, user_id, package_photo_key=first["package_photo_key"])
    assert post(client, token, again).status_code == 422


def test_asap_takes_the_servers_window(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    now = datetime.now(MONTREAL)
    asap = PickupSlot(start=now, end=now + timedelta(hours=2), asap=True)
    monkeypatch.setattr(returns, "pickup_slots", lambda _: [asap])
    token, user_id = sign_in(client, phone=PHONE)

    body = booking(client, token, user_id, asap=True, pickup_window_start=None)
    response = post(client, token, body)

    assert response.status_code == 201, response.text
    assert datetime.fromisoformat(response.json()["pickup_window_start"]) == asap.start


def test_asap_when_not_offered_is_refused(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(returns, "pickup_slots", lambda _: [later_slot()])
    token, user_id = sign_in(client, phone=PHONE)
    body = booking(client, token, user_id, asap=True, pickup_window_start=None)
    assert post(client, token, body).status_code == 422


def test_creating_a_return_needs_a_signed_in_client(client: TestClient):
    assert client.post("/returns", json={}).status_code == 401
    driver, _ = sign_in(client, role="driver")
    assert post(client, driver, {}).status_code == 403


def test_another_clients_return_is_not_found(client: TestClient):
    token, user_id = sign_in(client, phone=PHONE)
    return_id = post(client, token, booking(client, token, user_id)).json()["id"]
    other, _ = sign_in(client)

    assert client.get(f"/returns/{return_id}", headers=bearer(other)).status_code == 404
    assert client.get(f"/returns/{uuid.uuid4()}", headers=bearer(token)).status_code == 404
    assert client.get(f"/returns/{return_id}").status_code == 401
