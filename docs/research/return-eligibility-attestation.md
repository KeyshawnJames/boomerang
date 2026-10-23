# The Return Eligibility Attestation

**Status:** decided. Folded into `product/vision.md` and `architecture.md`.

> **Update 2026-10-23:** the MVP is now carrier-first ([ADR 0003](../decisions/0003-carrier-first-mvp.md)).
> The reasoning below (gate before payment, server re-checks, snapshot answers, block/warn/pass)
> carries over unchanged, but the MVP questions are now carrier concerns: merchant approval,
> label ready, package sealed, prohibited items, drop-off deadline. See the table in
> `architecture.md`. The store-policy questions below return with partner stores in phase 2.
**Date:** 2026-08-06
**Question:** Boomerang dispatches a driver on the client's word alone. What stops
us paying for a pickup the store was always going to refuse — and who eats the cost
when it happens?

---

## The gap

Until now the client flow *showed* a store's return policy and moved on. Nobody
was ever asked whether their item actually met it. That's three separate holes:

1. **Cost.** A driver gets paid for the trip whether or not the store takes the
   item. A worn pair of shoes outside the return window costs us a full pickup with
   nothing at the other end.
2. **Partner trust.** Our pitch to retailers is that we reduce their counter load.
   If we keep showing up with items they have to turn away, we're adding load. That
   ends the partnership faster than anything else on this list.
3. **Liability.** With no record of what the client told us, every refused return is
   our word against theirs. We can't decline a fee refund, and we can't tell a
   partner "the customer declared this unworn" — because we never asked.

## What we built

A questionnaire between item capture and payment. Purchase date against the
store's return window, proof of purchase, used/worn/washed, tags, packaging,
damage, final-sale category. Every answer carries an outcome:

- **block** — definite disqualifier. The request is refused before payment, we
  explain which answer disqualified it, and we point them at returning it
  themselves. No `ReturnRequest` row is created; a `BlockedRequestLog` row records
  the attempt so we can measure what the gate is saving us.
- **warn** — ambiguous (tags removed, packaging incomplete). They can proceed, but
  only after ticking an explicit acknowledgment that the store may still refuse it.
- **pass** — proceed.

Then a closing attestation: *"I confirm these answers are accurate. If the store
refuses this return because the information above is wrong, the pickup fee is
non-refundable and Boomerang is not responsible for the outcome."* Stored with a
timestamp against the return, alongside a snapshot of the exact question text they
saw.

## What it protects — and what it doesn't

**It does:**

- Kill the obviously-doomed pickups before we spend a driver on them. This is the
  bulk of the value and it's purely economic, not legal.
- Give us a concrete basis to decline a fee refund. The fee buys transport and
  handling, which we performed. It was never a guarantee of a refund from the
  retailer, and the attestation is where the client acknowledges that in writing.
- Give partners a straight answer when they ask why an ineligible item arrived: here
  is what the customer declared, timestamped. It moves us from "Boomerang has no
  quality control" to "a customer misrepresented their item, and here's the record."
- Produce data. Which questions block most often, which stores refuse items that
  passed our gate — that's how the generic question set becomes a real per-retailer
  policy database.

**It doesn't:**

- Make a refusal go away. The retailer's policy is the retailer's to enforce; our
  questionnaire is a prediction of their decision, never a substitute for it.
- Waive consumer-protection obligations. An attestation can't contract a consumer
  out of statutory rights, and we shouldn't write it as if it could.
- Prove the item's actual condition. Answers are self-reported. The photo chain of
  custody is what evidences condition; the attestation evidences what was *claimed*.
  They're complementary — a photo showing a worn shoe next to an answer saying
  "never worn" is a much stronger position than either alone.
- Protect us if our own questions were wrong. If we tell a client they're eligible
  and they aren't because our store data was stale, that's our error to absorb.

## The Quebec / Canada angle

Quebec's *Loi sur la protection du consommateur* creates no general right to return
a product for change of mind. Retailers set their own return policies, and — this is
the part that matters for us — a posted policy binds the merchant to its own terms.

Two consequences:

- **Store policy is the only thing that governs eligibility**, which is exactly why
  the per-store `return_window_days` has to be a real field and why the per-retailer
  policy database is the long-term moat rather than a nice-to-have.
- **Our questions must reflect the merchant's posted policy, not our guess at it.**
  Getting a policy wrong in the strict direction turns away business; wrong in the
  loose direction sends doomed pickups. Both are our cost.

Separately, statutory legal warranty in Quebec covers defective goods regardless of
store policy — which is why "defective on arrival" is a **pass** on the damage
question, not a block. A defective item is often more returnable than a perfect one.

Consumer-contract terms also have to be legible and prominent to be enforceable, so
the attestation needs to be a distinct, readable screen the client actively confirms
— not fine print buried under a Continue button. That's a product constraint, not
just a legal one.

*(Not legal advice — this is the reasoning we're building on. Worth a lawyer's read
before we sign retail partners.)*

## Why the server re-checks

The mobile app renders the questions and previews the outcome so the client gets an
instant answer. But `POST /returns` re-runs the evaluation against the store's live
policy before creating anything.

The client is not a trust boundary. Anyone can post directly to the API with
`attested: true` and skip the screen entirely. If the gate only exists in the app,
it isn't a gate. The app's copy is UX; the server's evaluation is the rule.

The same reasoning drives snapshotting the question text onto each answer row. If we
reword a question in six months, every historical answer would silently start
reading as an answer to the new wording — and an evidence trail that changes after
the fact is not evidence.

## MVP scope

Generic question set plus each store's return window. Per-retailer question sets and
blocking rules are stored in the same `EligibilityQuestion` table keyed by `code` and
`version`, so adding retailer scoping later is a column and a join, not a rewrite.

## Open items

- [ ] Validate the seven questions against 2–3 real Montreal partner policies —
      do they actually predict acceptance?
- [ ] Decide whether a blocked attempt should offer anything beyond self-return
      guidance (a discounted "we'll try anyway" tier? probably not at MVP)
- [ ] Legal review of the attestation wording before partner contracts
- [ ] Phase 2: the refund-outcome preview ("card refund" / "store credit only") belongs on
      the same screen as the store-policy questions
