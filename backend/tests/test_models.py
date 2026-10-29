from datetime import UTC, datetime, timedelta
from enum import StrEnum

import pytest
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.models import (
    AnswerOutcome,
    Carrier,
    EligibilityOutcome,
    EligibilityQuestion,
    LabelType,
    Locale,
    Retailer,
    ReturnEligibilityAnswer,
    ReturnRequest,
    ReturnStatus,
    User,
    UserRole,
)

DOWNTOWN_MONTREAL = "SRID=4326;POINT(-73.5673 45.5017)"


def make_return(session: Session, **overrides) -> ReturnRequest:
    client = User(
        role=UserRole.client,
        name="Client",
        email="client@example.com",
        password_hash="x",
        locale=Locale.fr,
    )
    retailer = Retailer(name="Simons")
    session.add_all([client, retailer])
    session.flush()
    now = datetime.now(UTC)
    fields = {
        "client_id": client.id,
        "retailer_id": retailer.id,
        "pickup_fee": 1299,
        "pickup_address": "1 Place Ville Marie, Montréal",
        "pickup_location": DOWNTOWN_MONTREAL,
        "pickup_window_start": now,
        "pickup_window_end": now + timedelta(hours=2),
        "label_type": LabelType.qr_code,
        "label_image_url": "https://example.com/label.png",
        "carrier": Carrier.canada_post,
        "eligibility_outcome": EligibilityOutcome.eligible,
        "eligibility_attested_at": now,
        "eligibility_policy_version": 1,
    } | overrides
    return_request = ReturnRequest(**fields)
    session.add(return_request)
    session.flush()
    return return_request


def test_new_return_is_requested_and_keeps_its_pickup_point(session: Session):
    return_request = make_return(session)

    point = session.scalar(
        select(func.ST_AsText(ReturnRequest.pickup_location)).where(
            ReturnRequest.id == return_request.id
        )
    )

    assert return_request.status == ReturnStatus.requested
    assert point == "POINT(-73.5673 45.5017)"


@pytest.mark.parametrize(
    "field",
    [
        "client_id",
        "retailer_id",
        "pickup_fee",
        "pickup_address",
        "pickup_location",
        "pickup_window_start",
        "pickup_window_end",
        "label_type",
        "label_image_url",
        "carrier",
        "eligibility_outcome",
        "eligibility_attested_at",
        "eligibility_policy_version",
    ],
)
def test_return_requires_field(session: Session, field: str):
    with pytest.raises(IntegrityError, match=f'null value in column "{field}"'):
        make_return(session, **{field: None})


@pytest.mark.parametrize(
    ("db_type", "enum"), [("returnstatus", ReturnStatus), ("answeroutcome", AnswerOutcome)]
)
def test_database_enum_matches_model(session: Session, db_type: str, enum: type[StrEnum]):
    # Autogenerate never notices a value added to an enum, so check the database directly.
    labels = session.scalars(text(f"SELECT unnest(enum_range(NULL::{db_type}))")).all()

    assert labels == [member.value for member in enum]


def test_answer_snapshot_survives_question_edit(session: Session):
    question = EligibilityQuestion(
        code="label_ready",
        prompt_en="Do you have the return label or QR code?",
        prompt_fr="Avez-vous l'étiquette de retour ou le code QR?",
        options=[{"value": "yes", "label_en": "Yes", "label_fr": "Oui", "outcome": "pass"}],
    )
    session.add(question)
    answer = ReturnEligibilityAnswer(
        return_id=make_return(session).id,
        question_code=question.code,
        prompt_snapshot=question.prompt_en,
        answer_value="yes",
        answer_label_snapshot="Yes",
        outcome=AnswerOutcome.pass_,
    )
    session.add(answer)
    session.flush()

    question.prompt_en = "Is your return label ready?"
    question.options = []
    session.flush()
    session.expire_all()

    assert answer.prompt_snapshot == "Do you have the return label or QR code?"
    assert answer.answer_label_snapshot == "Yes"
