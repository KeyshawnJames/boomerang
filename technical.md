# Technical Plan: Boomerang

## Tech Stack

- **Frontend (mobile):** React Native + Expo — one codebase for iOS + Android,
  across three app surfaces (client, driver, store). Expo gives near-built-in
  camera/QR, maps, push notifications, location, and over-the-air updates.
- **Backend:** FastAPI (Python) — async REST API + WebSockets for real-time.
- **Database:** PostgreSQL (via SQLModel/SQLAlchemy). Relational fits the
  interconnected data; Postgres also handles geo proximity queries for driver
  matching.
- **Payments:** Stripe Connect — collect client pickup fees, pay out drivers,
  take a platform cut.
- **Maps & location:** Google Maps or Mapbox + Expo Location.
- **Real-time:** WebSockets served by FastAPI (driver location + status updates).
- **Push notifications:** Expo Notifications.
- **Auth:** FastAPI-issued JWT with role-based access control (client / driver /
  store). Rolled in-house (not Clerk) — chosen to learn auth and avoid per-user
  cost; Clerk kept as a fallback if auth becomes a time-sink. Social login later.
- **Styling:** NativeWind v4 (Tailwind utility classes for React Native). Use v4,
  not v5 (v5 is pre-release).
- **Navigation:** Expo Router (file-based).
- **Client data/state:** TanStack Query (server data + caching) + Zustand
  (lightweight client state).
- **Localization:** expo-localization + i18next — English/French toggle, built in
  from day one.
- **DB migrations:** Alembic.

### Design constraint: "Liquid Glass"

True native Liquid Glass is iOS-only (SwiftUI). With React Native we approximate
a modern glassy aesthetic via blur/glass libraries. Going fully native to chase
pixel-perfect Liquid Glass is explicitly *not* worth it for a first cross-platform
app; revisit only if it becomes a real dealbreaker.

## System Architecture

A single FastAPI backend with a PostgreSQL database serves all three Expo apps
over a REST API, plus a WebSocket channel for anything live (driver location on
the map, status-timeline updates). Stripe Connect handles money movement; the
backend talks to Stripe and listens to Stripe webhooks. Maps/navigation run
client-side via the maps SDK + Expo Location, with the driver's device pushing
location to the backend, which relays it to the watching client over WebSocket.

Build order is **client app → driver app → store app**, all against the one
backend. The store app is the smallest (scan a QR, confirm acceptance).

```
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ Client app  │    │ Driver app  │    │  Store app  │   Expo / React Native
   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘   (NativeWind, Expo Router)
          │      REST  +  WebSocket (live)      │
          └──────────────────┬──────────────────┘
                             ▼
                  ┌───────────────────────┐
                  │     FastAPI backend    │
                  │  auth (JWT, roles)     │
                  │  returns + status FSM  │
                  │  matching / dispatch   │
                  │  realtime hub (WS)     │
                  │  payments · notifs     │
                  └───┬─────────┬────────┬─┘
            ┌─────────┘         │        └─────────┐
            ▼                   ▼                  ▼
    ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  PostgreSQL  │  │  Stripe Connect  │  │  Expo Push +     │
    │  (+ Alembic) │  │  (fees/payouts)  │  │  Maps APIs       │
    └──────────────┘  └──────────────────┘  └──────────────────┘

   Cross-cutting: PostHog (analytics + feature flags) · Sentry later (errors)
                  CodeRabbit (AI PR review) · EAS (cloud build / submit / OTA)
```

This is the classic "Uber for X" on-demand marketplace shape: a matching/dispatch
problem (connect a return request to a nearby driver), a real-time tracking
problem, a multi-party payments problem, and a chain-of-custody/trust problem.

## Key Components

- **Auth & accounts service** — registration/login, JWT, role-based permissions.
- **Return lifecycle service** — create return, generate QR authorization, drive
  the status state machine, record status events + custody photos.
- **Matching/dispatch** — find a nearby available driver for a new request
  (Postgres geo query for MVP; smarter dispatch later).
- **Real-time channel** — WebSocket hub for live driver location + status pushes.
- **Payments** — Stripe Connect: charge client fee, schedule driver payout,
  record transactions, handle webhooks.
- **Notifications** — Expo push on each status transition.
- **Store acceptance** — QR scan endpoint that verifies and closes a return.

## Data Models

> First draft — to be refined together when we build the schema (guided mode).
> **One item per return for now.** Keep `item_description`/`photo_urls` on the
> `ReturnRequest` for the MVP, but design so a future multi-item `Item` table
> (FK to `ReturnRequest`) is a clean migration, not a rewrite.

- **User** — `id`, `role` (client | driver | store_admin), `name`, `email`,
  `phone`, `password_hash`, `created_at`.
- **DriverProfile** — `user_id`, vehicle info, `is_available`, `current_lat`,
  `current_lng`, rating aggregate, Stripe account id.
- **Retailer** — `id`, `name`, `logo_url`, default `return_policy` text/fields.
- **Store** — `id`, `retailer_id`, `address`, `lat`, `lng`, optional policy
  overrides (return window, condition rules).
- **ReturnRequest** — `id`, `client_id`, `store_id`, `retailer_id`,
  `item_description`, `photo_urls`, `order_number`, `reason`, `status`,
  `qr_token`, `pickup_fee`, `driver_id` (nullable), timestamps.
- **ReturnStatusEvent** — `id`, `return_id`, `status`, `actor_id`, `photo_url`
  (custody proof), `created_at`. Powers both the timeline and the audit trail.
- **Payment** — `id`, `return_id`, `client_id`, `amount`, `platform_fee`,
  `driver_payout`, `stripe_payment_intent_id`, `status`.
- **Rating** — `id`, `return_id`, `driver_id`, `client_id`, `stars`, `comment`.

**Status state machine:** `requested → driver_assigned → picked_up → at_store →
accepted → refund_issued → completed` (plus `cancelled`). Each transition writes
a `ReturnStatusEvent`.

## API Endpoints (high-level)

**Auth**
- `POST /auth/register` — create account (role in body)
- `POST /auth/login` — returns JWT

**Client**
- `GET /retailers` — list retailers (+ logos)
- `GET /retailers/{id}/stores` — store locations
- `GET /stores/{id}/policy` — return eligibility/policy
- `POST /returns` — create a return request (item, photos, order #, reason)
- `GET /returns/{id}` — status + timeline
- `GET /returns` — client's return history
- `POST /returns/{id}/pay` — pay pickup fee (Stripe)
- `POST /returns/{id}/rating` — rate the driver

**Driver**
- `GET /driver/jobs` — nearby available pickup requests
- `POST /driver/jobs/{id}/accept` — accept a job
- `POST /returns/{id}/pickup` — scan QR + upload photo at pickup
- `POST /driver/location` — push current location (also via WebSocket)
- `GET /driver/earnings` — earnings summary

**Store**
- `POST /returns/{id}/accept` — scan QR, verify, confirm acceptance
- `POST /returns/{id}/refund-issued` — mark refund issued

**Real-time**
- `WS /ws/returns/{id}` — live status + driver location for a given return

**Webhooks**
- `POST /webhooks/stripe` — payment/payout events

## Tooling & Services

| Tool | Role | Verdict |
|------|------|---------|
| **CodeRabbit** | AI code review on PRs (teaches while reviewing) | ✅ Now — free tier covers private repos |
| **PostHog** | Analytics + feature flags (+ session replay later) | ✅ Early, lightweight |
| **Stripe Connect** | Marketplace payments; Express accounts (Canada), Instant Pay for drivers, v2 API | ✅ Core |
| **EAS** | Cloud build / submit to stores / OTA updates | ✅ When building |
| **NativeWind v4** | Tailwind styling for RN | ✅ Core (teach Tailwind as we go) |
| **Sentry** | Error tracking | ⚠️ Later — overlaps PostHog; don't run both day one |
| **Clerk** | Hosted auth | ❌ Skipped — using FastAPI JWT instead |
| **Supabase** | Backend-as-a-Service | ❌ Skipped — we build our own backend |

**Database hosting:** local Postgres (Docker) during development; pick a managed
host (Neon / Railway / Supabase-as-DB-only) at deploy time. Decision deferred.

**External cost notes:** Apple Developer $99/yr · Google Play $25 one-time ·
Stripe 2.9% + 30¢ + 0.25% payout fee · EAS free tier = 15 builds/platform/month.

## Project Structure

Single repo (light monorepo). One FastAPI backend, three Expo apps built in order.

```
boomerang/
├── CLAUDE.md, brainstorm.md, vision.md, technical.md, execution.md, learning.md
├── backend/                    # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── core/               # config, security (JWT), db session
│   │   ├── models/             # SQLModel tables
│   │   ├── schemas/            # Pydantic request/response models
│   │   ├── api/                # routers: auth, returns, drivers, stores, webhooks
│   │   ├── services/           # matching, payments, notifications
│   │   └── realtime/           # WebSocket hub
│   ├── alembic/                # migrations
│   ├── tests/
│   └── pyproject.toml
└── apps/
    ├── client/                 # Expo app — build FIRST
    │   ├── app/                # Expo Router screens
    │   ├── components/
    │   ├── lib/                # api client, auth, posthog
    │   ├── hooks/
    │   └── locales/            # en.json, fr.json (i18n)
    ├── driver/                 # Expo app — build SECOND
    └── store/                  # Expo app (minimal) — build THIRD
```

## Locked Decisions & Constraints

- **Auth:** FastAPI JWT, role-based — not Clerk.
- **Styling:** NativeWind v4 (teach Tailwind alongside RN).
- **One item per return** for MVP; multi-item is a future clean migration.
- **i18n from day one:** English/French toggle (expo-localization + i18next).
- **Quebec / Canadian rules:** follow Quebec + Canadian return & payment regulations.
- **DB hosting deferred:** local Postgres now, managed host at deploy.
- **No Supabase, no Clerk** — we own the backend to learn it.

## Collaboration Mode by Stack Component

- **React Native + Expo (mobile apps):** Explain-as-you-go — Claude writes the
  RN code and walks through it line-by-line on the non-obvious parts; user learns
  by reading rather than writing (no prior RN experience).
- **FastAPI backend / API design:** Guided — even though the user is comfortable
  with FastAPI, they want to write the Boomerang-specific backend code themselves
  with Claude scaffolding and checking their work.
- **Database & data modeling (PostgreSQL):** Guided — design the schema together,
  Claude explains the relationships; this is foundational and worth learning deeply.
- **Hard infra (real-time tracking, Stripe Connect, maps, push):** Guided — the
  user wants to attempt even the tricky plumbing with heavy support. Expect this
  to be the slowest part; Claude provides structure and unblocks rather than just
  handing over finished integrations.
