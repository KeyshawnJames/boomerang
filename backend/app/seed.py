"""Montreal seed data: retailers, carrier drop-off locations and the v1 eligibility questions.

Run with `uv run python -m app.seed`. Safe to re-run: rows already there are left alone.
Drop-off locations come from OpenStreetMap (© OpenStreetMap contributors, ODbL).
"""

import uuid

from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session

from app.core.db import engine
from app.models import AnswerOutcome, Carrier, DropOffLocation, EligibilityQuestion, Retailer

# IDs derive from each row's name, so a re-run hits ON CONFLICT DO NOTHING.
NAMESPACE = uuid.UUID("4981d1ed-b1f8-491e-a148-d31ec9dc99c9")


def seed_id(key: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, key)


RETAILERS = [
    {"id": seed_id(f"retailer:{name}"), "name": name}
    for name in ["Simons", "SSENSE", "Aldo", "Frank And Oak"]
]

DROPOFF_LOCATIONS = [
    {
        "id": seed_id(f"dropoff:{name}"),
        "carrier": carrier,
        "name": name,
        "address": address,
        "location": f"SRID=4326;POINT({lon} {lat})",
    }
    for carrier, name, address, lon, lat in [
        (
            Carrier.canada_post,
            "Postes Canada – Sainte-Catherine Ouest",
            "1974 Rue Sainte-Catherine Ouest, Montréal, QC H3H 1N4",
            -73.58109,
            45.49186,
        ),
        (
            Carrier.canada_post,
            "Postes Canada – Belmont",
            "895 Rue Belmont, Montréal, QC H3B 4G1",
            -73.56703,
            45.50064,
        ),
        (
            Carrier.canada_post,
            "Postes Canada – Griffintown",
            "1000 Rue Wellington, Montréal, QC",
            -73.55667,
            45.49404,
        ),
        (
            Carrier.ups,
            "The UPS Store – Saint-Denis",
            "3450 Rue Saint-Denis, Montréal, QC",
            -73.56843,
            45.51720,
        ),
        (
            Carrier.ups,
            "The UPS Store – Westmount",
            "4150 Rue Sainte-Catherine Ouest, Westmount, QC H3Z 1P4",
            -73.58707,
            45.48670,
        ),
        (
            Carrier.purolator,
            "Purolator – Robert-Bourassa",
            "Boulevard Robert-Bourassa, Montréal, QC H3B 3B4",
            -73.56903,
            45.50293,
        ),
        (
            Carrier.purolator,
            "Purolator – René-Lévesque",
            "Boulevard René-Lévesque Ouest, Montréal, QC H3B 4N4",
            -73.57083,
            45.49868,
        ),
    ]
]

YES = {"value": "yes", "label_en": "Yes", "label_fr": "Oui"}
NO = {"value": "no", "label_en": "No", "label_fr": "Non"}
NOT_SURE = {"value": "not_sure", "label_en": "Not sure", "label_fr": "Je ne sais pas"}
PASS, WARN, BLOCK = AnswerOutcome.pass_, AnswerOutcome.warn, AnswerOutcome.block

# The carrier question set from docs/architecture.md (eligibility gate).
QUESTIONS = [
    {
        "id": seed_id(f"question:{code}"),
        "code": code,
        "prompt_en": prompt_en,
        "prompt_fr": prompt_fr,
        "options": options,
        "sort_order": sort_order,
        "active": True,
        "version": 1,
    }
    for sort_order, (code, prompt_en, prompt_fr, options) in enumerate(
        [
            (
                "merchant_approved",
                "Has the retailer approved this return?",
                "Le détaillant a-t-il approuvé ce retour?",
                [{**YES, "outcome": PASS}, {**NO, "outcome": BLOCK}, {**NOT_SURE, "outcome": WARN}],
            ),
            (
                "label_ready",
                "Do you have the return label or QR code?",
                "Avez-vous l'étiquette de retour ou le code QR?",
                [{**YES, "outcome": PASS}, {**NO, "outcome": BLOCK}],
            ),
            (
                "package_sealed",
                "Is the item packed and sealed?",
                "L'article est-il emballé et scellé?",
                [
                    {**YES, "outcome": PASS},
                    {
                        "value": "not_yet",
                        "label_en": "Not yet (it must be sealed by pickup)",
                        "label_fr": "Pas encore (il doit être scellé avant la collecte)",
                        "outcome": WARN,
                    },
                ],
            ),
            (
                "prohibited_items",
                "Does it contain batteries, liquids, aerosols or other restricted items?",
                "Contient-il des piles, des liquides, des aérosols ou d'autres articles "
                "réglementés?",
                [{**NO, "outcome": PASS}, {**YES, "outcome": BLOCK}, {**NOT_SURE, "outcome": WARN}],
            ),
            (
                "return_deadline",
                "Is the retailer's drop-off deadline at least 1 day away?",
                "Reste-t-il au moins une journée avant la date limite de retour du détaillant?",
                [{**YES, "outcome": PASS}, {**NO, "outcome": BLOCK}, {**NOT_SURE, "outcome": WARN}],
            ),
        ],
        start=1,
    )
]


def seed(session: Session) -> None:
    for model, rows in [
        (Retailer, RETAILERS),
        (DropOffLocation, DROPOFF_LOCATIONS),
        (EligibilityQuestion, QUESTIONS),
    ]:
        session.exec(insert(model).values(rows).on_conflict_do_nothing())


if __name__ == "__main__":
    with Session(engine) as session:
        seed(session)
        session.commit()
