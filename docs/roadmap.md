# Roadmap: Boomerang

> Carrier-first MVP ([ADR 0003](decisions/0003-carrier-first-mvp.md)). Each milestone is a
> **GitHub Milestone**, and its tasks are **GitHub Issues**: that's where the live checklist
> is. This file only holds the order and each milestone's done-when.
>
> Milestones are vertical slices: just enough backend to unblock an app feature, then the
> feature.

## Current status

**M1 — Backend foundation**, **M2 — Schema + auth** and **M3 — Client app bootstrap**: done
(2026-10-29), tagged `m1`, `m2` and `m3`. **M4 — Create a return** is next. M0 still has open
chores (#3 to #6).

## Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | **Reset**: scope, stack, tooling, GitHub setup | Repo public with a ruleset on `main`, CI green, docs reflect carrier-first, M1–M3 issues exist |
| M1 | **Backend foundation**: uv, FastAPI `/health`, config, DB session, PostGIS in Docker, Alembic, pytest + testcontainers | `uv run pytest` passes locally and in CI against real PostGIS |
| M2 | **Schema + auth**: all MVP models, first migration, seed (Montreal retailers + drop-off locations + EN/FR eligibility questions), JWT register/login, role guards | Register → login → call a role-protected route, covered by tests |
| M3 | **Client app bootstrap**: SDK 58 in Expo Go, Expo Router, NativeWind, i18n (FR fallback, missing-key CI check), generated API client, login/register | A client registers and logs in from the app on a device |
| M4 | **Create a return**: retailer pick, label/QR upload (presigned), package photo, eligibility gate, pickup address + window, all-in price, status machine | A client creates a return. A blocked answer is refused by the API even when the app is bypassed |
| M5 | **Payments**: Stripe PaymentSheet (fee + tip), webhook, `Payment` rows | A test-card payment books the return, and the webhook updates its status |
| M6 | **Driver app**: job feed (PostGIS), accept, pickup scan + photo, drop-off proof | Full chain: create → pay → accept → pickup → drop-off → completed |
| M7 | **Timeline + push**: timeline UI, Expo push on every transition | Each status change reaches the client's phone as a push |
| M8 | **Live tracking**: WebSocket hub, driver location during an active job only | The client watches the driver move on the map |
| M9 | **Closing the loop**: ratings, history, earnings, driver payouts (Accounts v2) | The driver is paid out for a completed job in Stripe test mode |
| M10 | **Hardening + launch prep**: Law 25 / Bill 96 pass, Montreal deploy (Supabase project, API host ADR, paid plan before real data), EAS internal builds, Maestro end-to-end tests, Sentry | Internal builds of both apps run against the hosted backend |

**Phase 2**: partner stores. Counter returns, the store web portal, per-retailer
eligibility rules, the refund-outcome preview.

## If time gets tight

The single most important demo is the **M6 chain of custody**. Live tracking (M8) is
high-wow, but the flow works without it. Cloud photo storage, managed hosting, Sentry and
payouts can slip to M10 for a demo.

## Out of scope for the MVP

Batching, scheduled pickups, multi-package returns, refund-amount tracking, driver
verification and insurance, in-app support, email-receipt parsing, and other cities.
