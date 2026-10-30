# 0011. A return waits for payment before drivers can see it

- **Status:** accepted
- **Date:** 2026-10-29

## Context

A client creates a return in M4 and pays for it in M5. Until now, a new return started as
`requested`, which is also the status the driver job feed (M6) looks for. So a return nobody
has paid for would show up for drivers, and a driver could drive to it for free.

Online stores handle this the same way: an order is created as "pending payment", and it's
only fulfilled once the payment provider (Stripe for us) confirms the money arrived.

## Decision

- A new return starts as **`awaiting_payment`**.
- When Stripe confirms the payment (the M5 webhook), it moves to `requested`. Only then can
  drivers see it.
- A client can cancel a return that is still waiting for payment.
- Every status change, including the first one, goes through one function
  (`app/services/status.py`). It refuses any move that isn't in its list of allowed moves,
  and it records each change in the return's timeline (`ReturnStatusEvent`).

```
awaiting_payment → requested → driver_assigned → picked_up → dropped_off → completed
        │              │              │               │
        └──────────────┴──────────────┴→ cancelled    └→ failed_dropoff
```

## Consequences

- The job feed in M6 only has to look for `requested`; no extra payment check.
- Returns that are never paid pile up as `awaiting_payment`. M5 decides when they expire.
- The status function locks the return while it changes it, so two drivers accepting the same
  job at the same moment can't both succeed.
