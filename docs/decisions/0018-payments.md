# 0018. Payments: what the client pays, who gets what, and refunds

- **Status:** accepted (the fee, the driver's share and the tip amounts are placeholders the
  business can change later). Changes the tax line in [0012](0012-booking-rules.md) and
  settles when unpaid returns expire, left open in [0011](0011-awaiting-payment-status.md)
- **Date:** 2026-11-01

## Context

M5 adds payment. A client who creates a return pays for the pickup with a card, and only
then can drivers see the job ([ADR 0011](0011-awaiting-payment-status.md)). Before building
it, we had to decide when the client tips, whether we charge sales tax, how the money is
split with the driver, and what happens when a client cancels. Keyshawn asked Claude to pick
sensible defaults and write them down, so the business can adjust them later.

## Decision

**What the client pays**

- The pickup fee stays at **$4.99** (a setting, [ADR 0012](0012-booking-rules.md)). The
  pricing proposal ($9.99) is still being discussed and would be a settings change.
- The **tip is chosen at booking**, on the same screen and in the same card payment as the
  fee. Tipping after the job would mean saving the client's card and charging it again
  later, which needs more consent and a second card fee for a small amount.
- Tip choices: **No tip, $1, $2, $3**, all shown the same way, plus **Other** to type any
  amount right there. Fixed dollar amounts don't depend on tax at all, which keeps us within
  the Quebec rule that tip suggestions are based on the pre-tax price
  ([ADR 0007](0007-quebec-residency-and-compliance.md)). The server refuses a tip above
  $50 as a likely typo.
- **The driver gets 100% of the tip.**

**Sales tax (GST/QST)**

- **We don't charge GST or QST for now.** A business may only charge these taxes once it's
  registered for them, and a business with under $30,000 in sales over four quarters doesn't
  have to register. Boomerang isn't registered yet.
- If Boomerang registers, the fee gets GST (5%) and QST (9.975%) on a separate line, as
  ADR 0012 planned. The tip is never taxed. That's a small, separate change.
- **Before launch (M10), confirm with an accountant** whether Boomerang must register from
  day one. This isn't tax advice.

**Who gets what**

- The client pays Boomerang. The driver isn't known yet at payment time, so we pay the driver
  later, after the job ([Stripe's "separate charges and transfers"](https://docs.stripe.com/connect/separate-charges-and-transfers),
  as planned in the architecture). Driver payouts are built in M9.
- The driver gets **75% of the fee plus the whole tip**. Boomerang keeps 25% of the fee and
  pays Stripe's card fee (2.9% + 30¢) out of it. On $4.99 with a $2 tip: the driver gets
  $5.74, Boomerang keeps $1.25 and pays about 50¢ to Stripe.
- The share is a setting. Each payment records the split at the time it was made, so
  changing the setting never changes what's owed for past jobs.

**How a payment works**

- The client presses Pay. The server works out the amount from the return's fee and the
  chosen tip (it never trusts an amount sent by the app) and asks Stripe to start a payment.
- The app shows Stripe's own card screen. Card numbers go straight to Stripe and never touch
  our server. We don't save cards for now.
- Stripe tells our server the result with a signed message (a webhook). On success the
  return moves from "waiting for payment" to "requested", and drivers can see it. The app's
  own "it worked" isn't trusted on its own, because it could be faked.
- Apple Pay and Google Pay need a full app build, which we don't have while we use Expo Go
  ([ADR 0010](0010-expo-go-for-now.md)). They come with the app-store builds in M10.

**Unpaid returns expire**

- A client has **30 minutes** after creating a return to pay for it. After that the server
  refuses payment and the client books again, so nobody pays for a pickup window that has
  moved on.
- If Stripe confirms a payment that's already under way, we honour it, even past the 30
  minutes. The client's money has been taken.
- Expired returns stay "waiting for payment". Drivers never see them. Tidying them into
  "cancelled" automatically comes with background jobs, later.

**Cancelling and refunds**

- **Before a driver accepts:** the client can cancel and gets a **full refund** (fee and
  tip), automatically, back to the same card.
- **After a driver accepts:** the client gets the **tip back**, but the fee is kept and the
  driver still gets their share, because they're already on their way. Drivers can accept
  jobs from M6, so this case is built then.
- If a client cancels while their payment is still going through and Stripe then confirms
  it, we refund it automatically.
- Refunds always go back to the original card through Stripe. Never cash.

## Consequences

- One card charge per return, so one Stripe fee per return.
- A client can't add or change a tip after the job. A post-job tip would be a new decision.
- Until Boomerang registers for GST/QST, the price shown is exactly the price paid.
- With a $4.99 fee, Boomerang keeps well under a dollar per job after Stripe's fee, and
  Stripe also charges for each payout to a driver (M9). The real fee is a business decision.
- A refund costs us Stripe's original card fee, which Stripe doesn't return.
