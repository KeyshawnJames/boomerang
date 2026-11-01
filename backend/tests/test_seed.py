import re

from sqlalchemy import func
from sqlmodel import Session, select

from app.models import Carrier, DropOffLocation, EligibilityQuestion, Retailer
from app.seed import seed
from app.services.addresses import in_service_area


def count_rows(session: Session) -> dict[str, int]:
    return {
        model.__name__: session.scalar(select(func.count()).select_from(model))
        for model in (Retailer, DropOffLocation, EligibilityQuestion)
    }


def test_seed_can_run_twice(session: Session):
    seed(session)
    first = count_rows(session)
    seed(session)

    assert count_rows(session) == first
    assert first["EligibilityQuestion"] == 5
    assert all(count > 0 for count in first.values())


def test_nearby_query_finds_seeded_dropoffs(session: Session):
    seed(session)
    downtown = func.ST_GeogFromText("SRID=4326;POINT(-73.5673 45.5017)")

    nearby = session.exec(
        select(DropOffLocation).where(
            func.ST_DWithin(DropOffLocation.location, downtown, 2000)  # metres
        )
    ).all()

    assert {location.carrier for location in nearby} == {
        Carrier.canada_post,
        Carrier.ups,
        Carrier.purolator,
    }
    # About 2.3 km away, so it must be left out.
    assert "The UPS Store #560 – Westmount" not in {location.name for location in nearby}


DAYS = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
HH_MM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$|^24:00$")


def test_every_seeded_dropoff_has_counter_hours_on_the_island(session: Session):
    seed(session)
    rows = session.exec(
        select(
            DropOffLocation.name,
            DropOffLocation.hours,
            func.ST_Y(func.ST_GeomFromWKB(DropOffLocation.location)),
            func.ST_X(func.ST_GeomFromWKB(DropOffLocation.location)),
        )
    ).all()

    for name, hours, latitude, longitude in rows:
        assert hours and set(hours) <= DAYS, name
        for start, end in (interval for day in hours.values() for interval in day):
            assert HH_MM.match(start) and HH_MM.match(end) and start < end, name
        assert in_service_area(session, latitude, longitude), name


def test_reseeding_updates_dropoff_hours(session: Session):
    seed(session)
    row = session.exec(select(DropOffLocation)).first()
    row.hours = None
    session.flush()

    seed(session)
    session.refresh(row)

    assert row.hours
