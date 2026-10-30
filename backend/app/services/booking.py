from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.core.config import settings
from app.schemas.booking import PickupSlot

MONTREAL = ZoneInfo("America/Montreal")
SLOT = timedelta(hours=2)
HORIZON = timedelta(hours=24)


def pickup_slots(now: datetime) -> list[PickupSlot]:
    """The pickup windows on offer at `now` (ADR 0012)."""
    now = now.astimezone(MONTREAL).replace(second=0, microsecond=0)
    # In UTC: same-zone datetime arithmetic is wall-clock time and drifts an hour on DST days.
    horizon = now.astimezone(UTC) + HORIZON
    slots = []

    today_open = datetime.combine(now.date(), time(settings.service_open_hour), MONTREAL)
    today_close = datetime.combine(now.date(), time(settings.service_close_hour), MONTREAL)
    if today_open <= now and now + SLOT <= today_close:
        slots.append(PickupSlot(start=now, end=now + SLOT, asap=True))

    for day in (now.date(), now.date() + timedelta(days=1)):
        for hour in range(settings.service_open_hour, settings.service_close_hour - 1, 2):
            start = datetime.combine(day, time(hour), MONTREAL)
            if now < start <= horizon:
                slots.append(PickupSlot(start=start, end=start + SLOT, asap=False))
    return slots
