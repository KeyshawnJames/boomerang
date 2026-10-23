# 0003. Carrier-first MVP

- **Status:** accepted
- **Date:** 2026-10-23

## Context

The original MVP had the driver complete the return at a partner retailer's counter, with a
store app to scan the QR code. Two problems came up:

- **Card-present refunds.** Many in-store returns refund only to the original card at the
  counter. A driver can't hold the client's card: cards are non-transferable, and it creates
  fraud and liability exposure. A Boomerang-issued card doesn't help, because a POS refunds
  only to the card used for the purchase.
- **Retailer adoption.** Every partner store has to agree to install and use a store app
  before a single return can be completed there.

Label/QR returns (Amazon and most e-commerce) have neither problem. The merchant has already
approved the return, and the refund fires automatically when the carrier scans the package.
They're also where the pain is: the box sitting in the hallway for three weeks.

## Decision

The MVP handles **label/QR returns dropped at carrier locations** (Canada Post, UPS,
Purolator, and so on).

- Two apps: **client** and **driver**. No store app in the MVP.
- Destination = a `DropOffLocation` (carrier, address, point, hours). `Retailer` stays, as
  "who the return is for".
- Status machine: `requested → driver_assigned → picked_up → dropped_off → completed`, plus
  `cancelled` and `failed_dropoff`.
- Proof at pickup: a scan of the label or QR, plus a photo. Proof at drop-off: a photo, plus
  the carrier receipt or tracking number.
- The eligibility gate stays, but its questions move to carrier concerns (see
  `docs/research/return-eligibility-attestation.md`).
- **Hard rules, enforced in the app flow:**
  - No cash refunds, ever.
  - Refund money flows retailer → client's original payment method directly. It never lands
    in a Boomerang-controlled account.
  - Drivers never handle a client's payment card.

## Consequences

- Launch no longer depends on signing retailers.
- Partner-store returns (counter returns, the store web portal, per-retailer rules) become
  **phase 2**. The schema keeps `Retailer` and leaves room for `Store` so it's a clean
  migration.
- Open product question: label-less QR codes shown in-app vs printed labels. The MVP supports
  both (upload the QR image, or confirm a label is attached).
