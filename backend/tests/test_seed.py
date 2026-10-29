from sqlalchemy import func
from sqlmodel import Session, select

from app.models import Carrier, DropOffLocation, EligibilityQuestion, Retailer
from app.seed import seed


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

    carriers = session.exec(
        select(DropOffLocation.carrier).where(
            func.ST_DWithin(DropOffLocation.location, downtown, 2000)  # metres
        )
    ).all()

    assert set(carriers) == {Carrier.canada_post, Carrier.ups, Carrier.purolator}
