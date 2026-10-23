# Vision: Boomerang

> Updated 2026-10-23 for the carrier-first MVP ([ADR 0003](../decisions/0003-carrier-first-mvp.md)).
> The original partner-store vision is kept below as phase 2.

## Product overview

Boomerang is an on-demand mobile app that handles returns for people who don't want to deal
with them. The client books a pickup, a driver collects the package, and the driver drops it
at the carrier, with a scan-and-photo chain of custody and a live status timeline from
request to drop-off.

The MVP is a **two-sided marketplace**:

- **Clients** book and pay for return pickups.
- **Drivers** accept jobs, collect packages, and drop them at carrier locations (Canada Post,
  UPS, Purolator…).

The retailer issued the return label or QR code, and it refunds the client automatically
once the carrier scans the package. Boomerang never handles refund money.

Launch market: **Montreal**.

## Core features (MVP)

**Client app**
- Choose who the return is for (Amazon, Simons, …), then add the return label or QR code:
  upload the QR image, or confirm a printed label is on the package.
- **Eligibility gate**: a short checklist the client answers and attests to before paying.
  - Has the merchant approved the return?
  - Is the label or QR attached?
  - Is the package sealed?
  - Does it contain anything prohibited (batteries, liquids…)?
  
  Disqualified packages are refused before payment. Borderline ones need an explicit
  acknowledgment.
- Pickup address and time window. The fee is shown up front, with all fees included.
- Pay the pickup fee, with an optional tip.
- Live driver tracking on a map.
- Status timeline: Requested → Driver assigned → Picked up → Dropped off → Done, with a
  push notification at each step.
- Return history, and a rating for the driver.

**Driver app**
- Job feed of nearby pickups (accept / decline).
- Navigation to the client, then to the nearest suitable drop-off location.
- At pickup: scan the label or QR, and photograph the package.
- At drop-off: a photo, plus the carrier receipt or tracking number.
- Earnings view.

**Platform**
- Accounts and auth for two roles (client, driver), with an admin role for the founders.
- Chain of custody: a timestamped scan and photo at every handoff.
- Eligibility attestation stored against each return, as the evidence trail.
- Payments: the client pays Boomerang, and Boomerang pays drivers (Stripe Connect).
- English and French, with French first-class (Quebec).

## Hard rules

- No cash refunds, ever. Refund money never touches a Boomerang account.
- Drivers never handle a client's payment card.
- The server decides eligibility. What the app shows is only a preview.

## MVP scope

**In:** Montreal only; on-demand pickups; one package per return; label/QR carrier returns;
the client and driver apps above.

**Out (for now):**
- Partner-store returns and the store portal (phase 2).
- Batching several returns into one trip.
- Scheduled or recurring pickups.
- Multi-package returns.
- Refund-amount tracking.
- Driver identity checks and insurance.
- In-app support chat and disputes.
- Parsing email receipts.
- Cities beyond Montreal.

## User flows

**Client**
1. Taps "New return" and picks the retailer.
2. Adds the label or QR, and photographs the package.
3. Answers the eligibility checklist and attests to it. If an answer disqualifies the
   package, it's refused here, before payment, with an explanation.
4. Sets the pickup address and window, sees the full price, and pays.
5. A driver is matched. The client watches them approach.
6. Hands over the package. The driver scans it and takes a photo.
7. Follows the timeline: Picked up → Dropped off → Done.
8. Rates the driver.

**Driver**
1. Accepts a nearby job.
2. Navigates to the client, then scans and photographs the package.
3. Navigates to a drop-off location and hands the package to the carrier.
4. Records drop-off proof (a photo, plus the receipt or tracking number). The job completes
   and earnings update.

## Phase 2 — partner stores

The original vision: the driver completes an **in-store** return at a partner retailer, the
store scans the QR in a small **web portal**, and marks the refund issued.

- Per-retailer eligibility rules.
- The refund-outcome preview: "card refund, 3–5 days" / "store credit only".
- A per-location policy database: which stores accept what. This is the long-term moat.

## Future

- Batching returns to the same carrier or mall.
- Refund-amount tracking ("Refund of $48.20 issued ✓").
- Scheduled pickups.
- Multi-package and multi-destination pickups.
- Retailer self-onboarding and analytics.
- Driver verification and insurance.
- In-app support.
- Email-receipt parsing.
- More cities.
