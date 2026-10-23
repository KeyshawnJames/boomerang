# Brainstorm: Boomerang

> Working title — easy to rename once the vision sharpens in Phase 2.

## Project Idea

Boomerang is a mobile app that does for returns what Uber did for rides: an
on-demand service where a customer who wants to return a purchase requests a
pickup, a driver collects the item, and it gets returned on the customer's
behalf — with the whole process tracked in-app from request to completion.

It's a multi-sided platform with three participants:

- **Clients** — people who bought something and want to return it without going
  to the store themselves.
- **Drivers** — gig workers who pick up items and handle the physical return.
- **Businesses / Retailers** — the stores items are returned *to* (e.g. Target),
  and potentially partners who sign up to offer return-pickup to their own
  customers (see the open question below).

The core client flow:

1. Client opens the app with an item they no longer want
2. Selects the store the item came from
3. Sees that store's return eligibility / policy
4. Gets a return authorization (likely a QR code) to make the handoff trustworthy
5. Driver matching
6. Pickup confirmation
7. Return processing
8. Return completion

## Problem Statement

Returning a purchase is annoying in two distinct ways, and Boomerang targets
both:

- **Physical hassle:** you have to physically get the item back to the store —
  drive there, find parking, wait in line — or deal with printing labels and
  finding a drop-off.
- **Cognitive hassle:** the return process itself is fiddly, and it's hard to
  keep track of where a given return stands (did it ship? was it received? did
  the refund go through?).

Today people either eat the hassle, or simply never return things and absorb
the cost. Boomerang removes the physical trip and gives a single place to track
return status end to end.

## Target Users

- **Primary (client side):** frequent shoppers — especially online shoppers who
  accumulate returns — and anyone for whom getting to a store is inconvenient
  (no car, busy schedule, mobility constraints). The persona is someone who
  *wants* to return things but keeps putting it off because it's a pain.
- **Drivers:** gig-economy workers looking for flexible pickup/delivery work,
  similar to the existing rideshare/delivery driver pool.
- **Businesses:** retailers as the return destination, and potentially
  businesses that opt in to offer return-pickup as a customer perk.

*(Client persona to be sharpened in Phase 2.)*

## Goals

- **Learning goals:** This is the user's first time building an app — a major
  goal is to actually learn mobile app development through the process, end to
  end, rather than just ending up with a finished product.
- **Product goals:** A real product the user and their business partner intend
  to launch. Also intended to serve as a portfolio piece. So it should be built
  to real standards, not throwaway prototype quality.

## Collaboration Preferences

- **Overall learning style:** Guided. The user wants structure and a clear plan,
  then wants to attempt the work themselves; Claude steps in to help and explain
  when they get stuck, rather than just handing over finished code. To be
  revisited per-technology in Phase 3 (e.g. may want hands-off help on some
  pieces and deep guidance on others).
- **Notes:** First app build ever — assume foundational mobile/app concepts are
  new and worth explaining when they come up. Has a business partner involved.

## Initial Thoughts / Raw Brainstorm

- **Known pattern:** This is an "Uber for X" on-demand logistics marketplace —
  same architecture family as Uber, DoorDash, TaskRabbit. Brings well-understood
  challenges: matching/dispatch, real-time status, multi-party payments, and the
  chicken-and-egg problem of needing both drivers and clients to make it useful.
- **Open question — business model fork (resolve in Phase 2):**
  - *Consumer-direct:* any shopper returns to any store; Boomerang is a logistics
    layer retailers needn't be aware of. Easier to launch, harder to authorize
    returns cleanly.
  - *Business-partnership:* retailers integrate and offer "return via Boomerang";
    cleaner authorization and trust, but requires signing up businesses first.
  - Common path: start consumer-direct, add partnerships later.
- The **QR/return-authorization** step is a strong idea — it's the trust anchor
  that lets a driver hand off an item the store will accept.
- The **tracking/status** layer may be as valuable as the pickup itself; worth
  treating as a first-class feature, not an afterthought.
