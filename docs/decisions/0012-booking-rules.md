# 0012. Booking rules: pickup windows, price, phone and service area

- **Status:** accepted (the fee, the hours and the service area are placeholders until the business sets them). Service-area check settled by [0013](0013-address-lookup.md)
- **Date:** 2026-10-29

## Context

Before a client books a pickup, the app has to show when we can come, what it costs, and
make sure the driver can reach them. We copied what on-demand delivery apps do (grocery,
courier and food delivery apps): a short list of time windows, one clear price, and a phone
number on file.

## Decision

**Pickup windows**

- Pickups happen during **service hours**, 9:00 to 21:00 Montreal time by default. The hours
  are a setting, not code.
- A window is **2 hours** long. The day is cut into back-to-back windows starting at opening
  time (9–11, 11–13, … 19–21), and every window ends by closing time.
- When we're open, the first choice is **"as soon as possible"**: a window from now to 2
  hours from now. It isn't offered when it would run past closing time.
- We only offer windows that start in the **next 24 hours**. Scheduling further ahead is out
  of scope for the MVP.
- The server works out the windows. When a return is created (#46), the server checks the
  chosen window against this same rule.

**Price**

- **One flat pickup fee** for every return, set in config. The default is **$4.99**, a
  placeholder: the business still has to set the real number.
- The fee includes every Boomerang fee, so the price shown is the price paid (Quebec
  Consumer Protection Act, [ADR 0007](0007-quebec-residency-and-compliance.md)).
- GST and QST are shown on a separate line, which the law allows (CPA s. 224). They're
  calculated at payment, in M5.

**Phone number**

- A client needs a phone number on file before their first booking, so the driver can call
  if they can't find the door. The app asks for it with `PATCH /me`.
- The server checks it's a real phone number and stores it in one international format
  (E.164, e.g. `+15145550123`). A number without a country code is read as Canadian.
  Sign-up applies the same check if a phone number is given.

**Service area**

- For the MVP, we pick up on the **island of Montreal** only. Address lookup (#44,
  ADR 0013) enforces it.

## Consequences

- The business can change the fee and the hours without a code change.
- "As soon as possible" stops being offered 2 hours before closing.
- Windows are calculated in Montreal time and counted in real hours, so the clock change in
  spring and fall doesn't shift them.
- A fee that varies by distance, time or demand would be a new decision.
