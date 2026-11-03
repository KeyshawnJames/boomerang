# 0019. The driver app: finding jobs, proof at each handoff, and when things go wrong

- **Status:** accepted (the 10-minute wait is a placeholder setting the business can change).
  Adds one move to the status machine in [0011](0011-awaiting-payment-status.md), extends
  photo uploads in [0014](0014-photo-uploads.md) to drivers, and builds the "after a driver
  accepts" cancel from [0018](0018-payments.md)
- **Date:** 2026-11-03

## Context

M6 builds the driver app and finishes the chain the MVP exists to show: a client books and
pays, a driver accepts, picks the package up, drops it at the carrier, and the return is
completed. The key part is the chain of custody: proof of who had the package, when.

Before building it we had to decide who can drive, how drivers find jobs, what proof they
capture, and what happens when a pickup or drop-off fails. We checked what the phone can do
in Expo Go ([ADR 0010](0010-expo-go-for-now.md)), what proof Canada Post, UPS and Purolator
give at a counter, and how DoorDash, Uber Direct and Roadie handle the same problems.

What we found that shaped the choices:

- In Expo Go, the camera reads the barcodes on carrier labels (Code 128, QR and others) and
  takes photos. It can't read UPS's big square MaxiCode, but UPS labels also carry the
  tracking number as a regular barcode. Nobody has confirmed yet that Canada Post and
  Purolator labels scan, so that gets tested on real labels first.
- In Expo Go, the app can only use the phone's location while the app is on screen.
  Background location needs our own app build.
- The only proof a carrier controls is its own first tracking scan. At a counter, the clerk
  gives a receipt with the tracking number. Clerks sometimes skip the scan, so a receipt
  photo is the best proof the driver can bring back.
- For label-free (QR) returns, the counter prints the label. So at pickup there is no label
  on the box to scan, and at the counter the clerk needs the client's QR code.

## Decision

**Who can drive**

- Anyone can sign up as a driver, but they see no jobs until Boomerang approves their
  account. Until there's an admin screen, approving is one command run by a founder.
- Checking drivers' identity and insurance stays out of the MVP ([vision](../product/vision.md)).
  Approval only keeps strangers away from clients' addresses.

**Finding and accepting jobs**

- Drivers see **one list of every paid job on the island**, soonest pickup first. There's no
  distance filter, because the island is small and early volume is a handful of jobs a day.
  The list refreshes when pulled down.
- Before accepting, a job shows only the **postal area** (the first three characters of the
  postal code, e.g. H2T), the pickup window, the carrier, whether it's a printed label or a
  QR code, and **what the driver will earn** (75% of the fee plus the whole tip,
  [ADR 0018](0018-payments.md)).
- The **first driver to tap Accept gets the job**. The server locks the return while it
  changes it, so two drivers can't both win; the other sees "This job was just taken".
- A driver has **one job at a time** (a setting).
- **Batch pickups**, where a driver collects several packages in one trip, are a goal for
  later. M6 keeps the door open: each return records its own driver, the one-job limit is a
  setting, and the app gets the driver's jobs in progress as a list (of one, for now).
- After accepting, the driver sees the street address, the client's first name and phone
  number, the pickup notes, and the client's package photo and label or QR image. Only the
  driver on that job can see these, through short-lived links.

**No location tracking in M6**

- The app doesn't use the driver's location at all in M6. Directions open in Apple Maps or
  Google Maps. Drop-off counters are ranked by distance from the pickup address, on the
  server (PostGIS), not from the phone.
- Live location during a job, after an explanation screen, comes with live tracking in M8
  ([ADR 0007](0007-quebec-residency-and-compliance.md)).

**Proof at pickup**

- The driver taps **"I've arrived"** at the door. The time is saved.
- **Printed labels:** the driver scans the label's barcode, which saves the tracking number,
  then photographs the package. If the barcode won't scan, they type the number. If the
  number doesn't look like that carrier's (for example, UPS numbers start with "1Z"), the app
  warns but doesn't block.
- **QR returns:** the driver photographs the package. There is no label to scan yet.
- The return moves to **picked up**, with the photo and the driver's name in its history.

**Proof at drop-off**

- The driver picks the counter from a short list: the nearest counters of the return's
  carrier that are open now.
- For **QR returns**, the app shows the client's QR code so the clerk can scan it. The driver
  then scans the label the counter prints, or types the number from the receipt.
- The driver **photographs the carrier's receipt** and confirms the **tracking number**. Both
  are required.
- The return moves to **dropped off**, then the server immediately marks it **completed**.
  The history shows the driver did the drop-off and the system closed the job. Checking the
  carrier's own tracking before paying the driver can be added with payouts (M9).

**When things go wrong**

- **Client not home.** "Client not home" unlocks **10 minutes** after "I've arrived" (a
  setting). The driver photographs the door, and the return is **cancelled**. The client gets
  the **tip back and the fee is kept**, the same as a client cancelling after a driver
  accepts: the driver made the trip.
- **Package not as booked.** Unsealed, no label, or not the package in the photo: the driver
  picks a reason and takes a photo, and the return is **cancelled** with the same money rule.
- **Carrier refuses it at the counter.** The driver picks a reason and takes a photo, and the
  return ends as **drop-off failed**, as planned in [ADR 0003](0003-carrier-first-mvp.md).
  Boomerang phones the client and arranges getting the package back outside the app. Nothing
  is refunded automatically; a founder refunds by hand in Stripe if it was our fault.
- **Driver drops the job.** Allowed **before pickup only**. The job goes back to the open list
  for another driver and no money moves. This is the one new move in the status machine:
  `driver_assigned → requested`. After pickup the driver can't drop it in the app, because
  they're holding the package. There's no limit on hand-backs yet; the history records each
  one.

**Client cancels after a driver accepts**

- Allowed until pickup, as [ADR 0018](0018-payments.md) decided: the **tip goes back to the
  card, the fee is kept**, and the driver is still owed 75% of the fee. The app says exactly
  what comes back before the client confirms.

**What the client sees in M6**

- The existing return screen shows the current step in plain words ("Alex is on the way",
  "Picked up", "Dropped off at Canada Post", "Completed"), the driver's first name, and the
  tracking number after drop-off. It refreshes every 15 seconds while it's open.
- Push notifications and the full timeline with photos come in M7.

**The status machine after M6**

```
awaiting_payment → requested ⇄ driver_assigned → picked_up → dropped_off → completed
        │              │              │               │
        └──────────────┴──────────────┴→ cancelled    └→ failed_dropoff
```

Every move still goes through the one status function and is saved in the return's history
with who made it, when, and any photo or reason.

**Calls Claude made (open to change):**

- The arrival time is a field on the return, not a new status, because it doesn't change
  what anyone can do except unlock "Client not home".
- The client's phone number is shown to the driver after accepting, so they can call. We
  can't check that a call was made, so "Client not home" depends only on the 10-minute wait.
- Drivers' photos use the same signed upload links as clients' photos
  ([ADR 0014](0014-photo-uploads.md)), with new kinds for pickup, drop-off and problem photos.
  Every key still starts with the uploader's own account id.

**Options we rejected**

- **Showing only jobs near the driver's phone.** It needs the driver's location before they
  have a job, which our location rule doesn't allow without a new consent, and a radius adds
  little on the island.
- **Offering each job to one driver at a time** (DoorDash style). It needs push notifications
  (M7) and enough drivers online to answer offers.
- **A 4-digit code the client reads to the driver.** Stronger proof, but it breaks pickups
  where the package is left at the door.
- **Photos only, no scan.** It's less work, but we'd never get the tracking number
  automatically.
- **A full refund when the client isn't home or the package is wrong.** The driver would earn
  nothing for the trip, and a bad package would cost the client nothing.
- **A tracked trip bringing a refused package back to the client.** It needs a new status and
  a price for the second trip. We'll look at it once we know how often carriers refuse.

## Consequences

- One new status move (`driver_assigned → requested`) and two new fields: a driver's
  approval and the return's arrival time.
- Drivers can now view clients' photos for their own job, which [ADR 0014](0014-photo-uploads.md)
  left for M6. Clients still can't view the driver's proof photos until M7.
- Partial refunds (the tip only) are new. A payment now records how much was refunded.
- Without location tracking, the client sees steps change but not the driver moving. That's
  M8.
- A self-registered but unapproved driver sees nothing. An approved driver sees clients'
  addresses only for the job they accepted.
- A refused package and its refund are handled by phone and by hand until we have real
  numbers.
