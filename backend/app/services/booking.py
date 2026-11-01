from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Carrier, DropOffLocation
from app.schemas.booking import PickupSlot
from app.services.addresses import point

MONTREAL = ZoneInfo("America/Montreal")
SLOT = timedelta(hours=2)
DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


def open_at(hours: dict, moment: datetime) -> bool:
    """Whether a counter with these weekly hours takes parcels at `moment` (ADR 0017)."""
    local = moment.astimezone(MONTREAL)
    clock = local.strftime("%H:%M")  # zero-padded, so string order is time order
    return any(start <= clock < end for start, end in hours.get(DAYS[local.weekday()], []))


def pickup_slots(now: datetime, counters: list[dict | None]) -> list[PickupSlot]:
    """The pickup windows on offer at `now`, given the nearby counters' hours (ADR 0012, 0017)."""
    now = now.astimezone(MONTREAL).replace(second=0, microsecond=0)
    travel = timedelta(minutes=settings.dropoff_travel_minutes)
    candidates = []

    today_open = datetime.combine(now.date(), time(settings.service_open_hour), MONTREAL)
    today_close = datetime.combine(now.date(), time(settings.service_close_hour), MONTREAL)
    if today_open <= now and now + SLOT <= today_close:
        candidates.append(PickupSlot(start=now, end=now + SLOT, asap=True))

    for day in (now.date(), now.date() + timedelta(days=1)):
        for hour in range(settings.service_open_hour, settings.service_close_hour - 1, 2):
            start = datetime.combine(day, time(hour), MONTREAL)
            if now < start:
                candidates.append(PickupSlot(start=start, end=start + SLOT, asap=False))

    # In UTC: same-zone datetime arithmetic is wall-clock time and drifts an hour on DST days.
    return [
        slot
        for slot in candidates
        if slot.start.date() not in settings.holidays
        and any(open_at(h, slot.end.astimezone(UTC) + travel) for h in counters if h)
    ]


def nearby_counters(
    session: Session, carrier: Carrier, latitude: float, longitude: float
) -> list[dict | None]:
    """The weekly hours of this carrier's drop-off counters near the pickup (ADR 0017)."""
    here = func.ST_GeogFromText(point(latitude, longitude))
    return session.exec(
        select(DropOffLocation.hours).where(
            DropOffLocation.carrier == carrier,
            func.ST_DWithin(DropOffLocation.location, here, settings.dropoff_radius_m),
        )
    ).all()
