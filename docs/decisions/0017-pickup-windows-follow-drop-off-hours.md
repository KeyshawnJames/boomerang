# 0017. Pickup windows follow drop-off counter hours

- **Status:** accepted. Changes the pickup windows in [0012](0012-booking-rules.md)
- **Date:** 2026-11-01

## Context

ADR 0012 offers pickup windows from 9:00 to 21:00 every day. But a driver who picks up a
return still has to drop it at a Canada Post, UPS or Purolator counter, and many counters
close much earlier. On Sundays a postal counter is often open noon to 5 PM, even inside a
pharmacy that stays open until 10. A client could book and pay for a pickup that the
driver can't drop off the same trip. DoorDash's package pickup avoids this the same way we
will: you can only book while a drop-off location is open.

ADR 0012 also offered only windows starting in the next 24 hours. At 6:43 PM that hid
tomorrow's 7 to 9 PM window, which is a strange thing to leave out.

## Decision

**A window needs an open counter at the end of the trip**

- A pickup window is offered only if, **45 minutes after the window ends**, a drop-off
  location for the return's carrier is open and lies **within 10 km** (straight line) of
  the pickup address.
- 45 minutes covers the worst case: the driver collects at the very end of the window,
  drives up to 10 km in evening traffic (about 25 to 30 minutes), then parks and waits at
  the counter. It's a setting, not code.
- The 10 km limit matters because the island is about 50 km long: a Sunday counter in
  Pointe-Claire doesn't help a client in Montréal-Nord.
- "As soon as possible" follows the same rule.
- We don't look up real driving times per booking. That would cost a Google call each time
  and slow the time step down, for little gain over a fixed allowance.

**Counter hours, hand-checked**

- Each drop-off location stores its weekly **counter hours**: the hours you can hand a
  parcel over at the counter. That's not the store's hours (a pharmacy's postal counter
  often closes earlier) and not the carrier's last pickup of the day (a return dropped after
  it simply ships the next day). A day can have more than one opening (a counter that closes
  for lunch).
- Only staffed counters count. Drop boxes don't: nobody takes the parcel from the driver,
  so there's no proof of hand-over for the chain of custody.
- The hours come from each carrier's own location finder (Canada Post's post office finder,
  The UPS Store and UPS Access Point pages, Purolator's location finder), checked by hand,
  with the date they were checked. We keep 15 or so locations per carrier spread across the
  island, so every address has one within 10 km.
- A location with no hours on file counts as closed.
- **No pickups on Quebec statutory holidays.** Counter hours on those days vary too much to
  trust. The holiday dates are a setting.

**Whole days**

- We offer the **rest of today and all of tomorrow**, instead of the next 24 hours.

**Checked twice**

- The app asks the server for windows with the carrier and the pickup address, both of
  which the client has already chosen by the time step.
- When a return is created, the server checks the window again with the same rule. If it
  stopped being possible (say a counter's hours changed), the booking is refused with a
  clear message in English or French, and the client picks another window.

The rest of ADR 0012 stands: 2-hour windows inside service hours (9:00 to 21:00 by default),
the flat fee, the phone number and the service area.

## Consequences

- Nobody can book a pickup that can't be dropped off the same trip, including on a Sunday.
- Some evening and Sunday windows disappear, more so in parts of the island with few
  counters. Adding locations is a data change, not a code change.
- Counter hours change over time, and we only know what we last checked. Someone has to
  re-check them now and then. Reading them from carrier APIs would be a new decision.
- The holiday list has to be kept up to date each year.
