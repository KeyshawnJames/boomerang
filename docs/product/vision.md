# Vision: Boomerang

## Product Overview

Boomerang is an on-demand mobile app that handles retail returns for people who
don't want to go to the store themselves. A client requests a pickup, a driver
collects the item, and the driver completes the return at the retailer — with a
QR-based chain of custody and a live status timeline keeping every party honest
and informed from request to refund.

It is a three-sided marketplace:

- **Clients** request and pay for return pickups.
- **Drivers** accept jobs, pick up items, and complete returns at the store.
- **Retailers (partner stores)** scan a QR code to accept the return and confirm
  the refund.

The launch market is **Montreal**, starting with a handful of small/local (and
potentially larger local) retailers who agree to use the store-side scan app.

## Core Features

**Client app**
- Retailer picker (real retailer list + logos) → store-location selection
- Return eligibility questionnaire — a short set of condition/policy questions
  the client answers and attests to before booking. Ineligible items are refused
  up front with self-return guidance; borderline ones proceed only after an
  explicit "the store may still refuse this" acknowledgment
- Item capture: photos of item + receipt/order number, return reason
- Per-return QR authorization
- Live driver tracking on a map
- Status timeline: Requested → Driver assigned → Picked up → At store → Accepted
  → Refund issued → Done
- Push notifications on every status change
- Pickup-fee payment + optional driver tip
- Driver ratings
- Return history
- Pricing transparency (fee shown up front before booking)

**Driver app**
- Job feed of nearby pickup requests (accept / decline)
- Two-leg navigation: to the client, then to the store
- QR scan + photo proof at pickup
- QR handoff + confirmation at the store
- Earnings dashboard

**Store app (minimal)**
- Scan-to-accept: store scans the QR, confirms the return, marks refund issued

**Platform-wide**
- Three-role accounts & auth (client / driver / store)
- Chain of custody: QR + timestamped photos at every handoff (anti-fraud / proof)
- Eligibility attestation: the client's answers are stored against the return, so
  there's a record of what they declared if a store refuses the item — this
  protects Boomerang with both the client and the retail partner
- Payments infrastructure: collect client fees, pay out drivers (marketplace
  take-rate model)

## MVP Scope

**Included in MVP:**
- Montreal only
- Client app: retailer + store selection, eligibility questionnaire + attestation
  (blocks ineligible returns before payment), item capture, QR
  authorization, live driver map tracking, status timeline, push notifications,
  pickup-fee payment, ratings, return history, up-front pricing
- Driver app: job feed, navigation, QR scan + photo proof at pickup, QR handoff
  at store, basic earnings view
- Store app: minimal scan-to-accept + confirm refund
- A few partner retailers (small/local, possibly larger local) using the store app
- On-demand pickups
- Full QR + photo chain of custody
- Payments: client pays pickup fee to Boomerang; Boomerang pays drivers

**Explicitly excluded from MVP (for now):**
- Batching multiple returns into one driver trip (designed for, not built yet)
- Scheduled (vs on-demand) pickups
- Multi-item / multi-store returns in a single pickup
- Refund-amount detail tracking beyond a status flag
- Retailer self-onboarding portal, store analytics dashboard
- Driver identity verification, insurance/liability handling
- In-app support chat & formal dispute resolution. Note the eligibility
  attestation is *not* this — it's an evidence trail and an up-front gate, with
  no in-app process for arguing about the outcome afterwards
- Per-retailer eligibility rule engine (MVP uses a generic question set plus each
  store's return window; the schema is designed so this is a clean migration)
- Auto-detecting returnable items from email receipts
- Cities beyond Montreal

## User Flow

**Client (happy path):**
1. Opens Boomerang, taps "New return"
2. Selects the retailer, then the specific store location
3. Photographs the item + receipt, enters order number and return reason
4. Answers the eligibility questionnaire (condition, tags, packaging, proof of
   purchase, purchase date, final sale) and attests the answers are accurate. An
   ineligible item is refused here — before any payment — with an explanation of
   which answer disqualified it and how to return it themselves
5. Sees the pickup fee up front and confirms + pays
6. App generates a QR return authorization
7. A driver is matched; client watches the driver approach on the map
8. Driver arrives; client hands over the item; driver scans QR + photographs it
9. Client follows the status timeline: Picked up → At store → Accepted → Refund
   issued → Done, with a push notification at each step
10. Client rates the driver

**Driver:**
1. Sees a nearby pickup request in the job feed, accepts it
2. Navigates to the client, scans the QR + photographs the item at pickup
3. Navigates to the store
4. Store scans/confirms the QR to accept the return
5. Job marked complete; earnings update

**Store:**
1. Driver arrives with the item and QR
2. Store opens the scan app, scans the QR, verifies the item
3. Confirms acceptance and marks the refund issued — closing the loop
4. Or refuses the item, with a reason. The client's eligibility attestation is
   shown alongside, so a refusal can be checked against what they declared

## Future Features

- Batching multiple returns to the same store/mall for one driver
- Refund-amount tracking as a headline feature ("Refund of $48.20 issued ✓")
- Scheduled pickups and recurring users
- Multi-item / multi-store single pickups
- Retailer self-service onboarding + analytics dashboard
- Driver identity verification, background checks, insurance
- In-app support and dispute resolution
- Email-receipt parsing to auto-suggest returnable items
- Expansion to additional cities
