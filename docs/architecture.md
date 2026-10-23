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
- **Store** — `id`, `retailer_id`, `address`, `lat`, `lng`, `return_window_days`
  (int — the questionnaire needs a number, not prose), optional policy overrides
  (condition rules).
- **ReturnRequest** — `id`, `client_id`, `store_id`, `retailer_id`,
  `item_description`, `photo_urls`, `order_number`, `reason`, `status`,
  `qr_token`, `pickup_fee`, `driver_id` (nullable), `eligibility_outcome`
  (eligible | eligible_with_warnings), `eligibility_attested_at`,
  `eligibility_policy_version`, timestamps.
- **ReturnStatusEvent** — `id`, `return_id`, `status`, `actor_id`, `photo_url`
  (custody proof), `created_at`. Powers both the timeline and the audit trail.
- **EligibilityQuestion** — `id`, `code` (stable slug), `prompt_en`, `prompt_fr`,
  `help_en`, `help_fr`, `options` (JSON: `value`, `label_en`, `label_fr`,
  `outcome` = pass | warn | block), `sort_order`, `active`, `version`.
- **ReturnEligibilityAnswer** — `id`, `return_id`, `question_code`,
  `prompt_snapshot`, `answer_value`, `answer_label_snapshot`, `outcome`,
  `created_at`. Snapshot the text so editing a question later never rewrites
  history — same append-only reasoning as `ReturnStatusEvent`.
- **BlockedRequestLog** — `id`, `client_id`, `store_id`,
  `blocking_question_codes`, `created_at`. A blocked attempt never creates a
  `ReturnRequest`, so this is the only way to measure how much loss the gate
  prevents (and to spot questions that are too strict).
- **Payment** — `id`, `return_id`, `client_id`, `amount`, `platform_fee`,
  `driver_payout`, `stripe_payment_intent_id`, `status`.
- **Rating** — `id`, `return_id`, `driver_id`, `client_id`, `stars`, `comment`.

**Status state machine:** `requested → driver_assigned → picked_up → at_store →
accepted → refund_issued → completed` (plus `cancelled`). At `at_store` the
branch is `accepted | refused` — `refused` is a terminal state for "the store
turned the item away," distinct from `cancelled`, and it's what we compare back
against the client's eligibility attestation. Each transition writes a
`ReturnStatusEvent`.

### Eligibility attestation

Before a return can be created, the client answers a short questionnaire
(condition, tags, packaging, proof of purchase, purchase date vs the store's
`return_window_days`, final-sale category). Every answer carries an outcome:

- any `block` → the request is refused up front, no `ReturnRequest` row, a
  `BlockedRequestLog` row instead;
- else any `warn` → `eligible_with_warnings`, which requires an explicit
  client acknowledgment before the request is created;
- else → `eligible`.

**The server re-evaluates the answers; the client is not a trust boundary.** The
app renders the questions and previews the outcome for UX, but `POST /returns`
re-runs the evaluation against the store's live policy and rejects anything that
doesn't hold. The stored answers + `eligibility_attested_at` are the evidence
trail when a store refuses an item or a client disputes a fee.

For the MVP the question set is **generic + the store's own return window**;
per-retailer question sets and blocking rules are a later, clean migration (the
`EligibilityQuestion` table is already keyed to support it). See
`docs/research/return-eligibility-attestation.md` for the reasoning.

## API Endpoints (high-level)

**Auth**
- `POST /auth/register` — create account (role in body)
- `POST /auth/login` — returns JWT

**Client**
- `GET /retailers` — list retailers (+ logos)
- `GET /retailers/{id}/stores` — store locations
- `GET /stores/{id}/policy` — return window/condition rules **plus the localized
  eligibility question set** (one call feeds one screen)
- `POST /returns` — create a return request (item, photos, order #, reason,
  `eligibility_answers[]`, `attested`, `acknowledged_warnings`); re-evaluates
  eligibility server-side and returns `422` with the blocking question codes if
  the item doesn't qualify
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
- `POST /returns/{id}/refuse` — store turns the item away; records a reason and
  sets status `refused`
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
├── CLAUDE.md                   # project context, auto-loaded (stays at root)
├── docs/                       # all planning/doc markdown
│   ├── brainstorm.md  vision.md  technical.md  execution.md
│   └── learning.md    setup.md   CHANGELOG.md
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

## Git & GitHub Workflow

> First-time-builder reference. The model chosen is **trunk-based development with
> short-lived feature branches** — deliberately *not* Gitflow (the
> `develop`/`release`/`hotfix` model), which is overkill for a 1–2 person team and
> built for large orgs shipping versioned software. See `learning.md` for the *why*.

**The core rule:** `main` is always deployable. Never commit directly to `main`.

**The loop, per task** (your `execution.md` tasks are sized to be one branch each):

1. **Branch off `main`** for one task: `git checkout main && git pull && git checkout -b feat/backend-auth-jwt`
2. **Do the work**, committing in small conventional-style commits as you go.
3. **Push the branch** and **open a Pull Request** on GitHub.
4. **CodeRabbit reviews it** automatically — read its feedback (this is where a lot
   of the learning happens), address what matters, push fixes to the same branch.
5. **Squash-merge** the PR into `main`, then **delete the branch**.
6. Repeat. Keep branches short-lived (a day or two), small, and single-purpose.

**Branch naming** — `type/area-short-description`. Because this is a monorepo (one
backend + three apps), include the *area* so the name says what + where:

- `feat/backend-auth-jwt`, `feat/client-retailer-picker`, `feat/driver-job-feed`
- `fix/backend-qr-token-collision`, `chore/docker-postgres`, `docs/execution-plan`

Types mirror the commit convention: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.

**Commit messages** — conventional style, imperative mood, one logical change each:
`feat(client): add login screen` · `fix(backend): validate qr_token on pickup`.

**Why PRs even as a near-solo dev:** the business partner sees what changed via the
PR, and CodeRabbit catches issues before they reach `main`. Small PRs review faster
and teach more than one giant one.

**Protect `main` (one-time GitHub setup):** in repo Settings → Branches, add a rule
on `main` requiring a PR before merging (and optionally a passing review). This makes
the "never commit to `main`" rule enforced, not just a promise.
