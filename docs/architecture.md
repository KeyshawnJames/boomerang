# Architecture: Boomerang

> Updated 2026-10-23. Decisions behind this doc live in [`decisions/`](decisions/). Scope is
> the carrier-first MVP ([ADR 0003](decisions/0003-carrier-first-mvp.md)).

## Stack

| Layer | Choice |
|---|---|
| Backend | FastAPI, Python 3.13, managed with **uv** |
| Database | PostgreSQL + **PostGIS**, via SQLModel (sync sessions), Alembic migrations. Hosted on **Supabase** (ca-central-1), used as plain Postgres ([ADR 0009](decisions/0009-supabase-for-the-database.md)) |
| Auth | FastAPI-issued JWT (**PyJWT**), **pwdlib[argon2]** password hashing, role-based (client / driver / admin) |
| Mobile | Two Expo apps (`client`, `driver`), **SDK 58** / React Native 0.88, Expo Go for now, development builds later ([ADR 0010](decisions/0010-expo-go-for-now.md)) |
| Monorepo | pnpm workspaces. Shared generated API client in `packages/api` |
| API contract | `@hey-api/openapi-ts` (exact pinned version) generates a typed client + TanStack Query hooks from FastAPI's OpenAPI schema |
| App libraries | Expo Router, NativeWind v4, TanStack Query, Zustand, expo-localization + i18next (EN/FR, French fallback) |
| Maps / location | react-native-maps (Google tiles). expo-location + expo-task-manager, **only during an active job** |
| Real-time | FastAPI WebSockets on a single instance. Redis pub/sub only once there's a second instance |
| Background work | FastAPI `BackgroundTasks`. Stripe retries webhooks itself |
| Payments | Stripe Connect **Accounts v2** (recipient configuration), separate charges and transfers. RN PaymentSheet |
| Photos | **Supabase Storage** in ca-central-1 via signed upload URLs. A local folder in dev |
| Push | Expo Notifications |
| Analytics | PostHog, **opt-in only**. Sentry later |
| Hosting | **Montreal only** ([ADR 0007](decisions/0007-quebec-residency-and-compliance.md)). Database and photos on Supabase ca-central-1 (AWS Montreal). API host chosen at M10 |
| Build / ship | EAS Build + EAS Workflows |
| Testing | pytest + testcontainers (real PostGIS). Jest + RNTL for logic. Maestro end-to-end later |

## System architecture

```
   ┌─────────────┐           ┌─────────────┐
   │ Client app  │           │ Driver app  │        Expo / React Native
   └──────┬──────┘           └──────┬──────┘        (shared packages/api client)
          │   REST  +  WebSocket (live) │
          └──────────────┬──────────────┘
                         ▼
              ┌───────────────────────┐
              │    FastAPI backend    │
              │  auth (JWT, roles)    │
              │  returns + status FSM │
              │  eligibility gate     │
              │  matching (PostGIS)   │
              │  realtime hub (WS)    │
              │  payments · push      │
              └───┬─────────┬───────┬─┘
        ┌─────────┘         │       └──────────┐
        ▼                   ▼                  ▼
 ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
 │ Postgres +   │  │ Stripe Connect │  │ Photo storage ·  │
 │ PostGIS      │  │ (fees/payouts) │  │ Expo Push · Maps │
 └──────────────┘  └────────────────┘  └──────────────────┘
         all personal data hosted in ca-central-1 (Montreal)
```

The driver's phone pushes its location to the backend while a job is active. The backend
relays it over WebSocket to the client watching that return.

## Status machine

```
awaiting_payment → requested → driver_assigned → picked_up → dropped_off → completed
        │              │              │               │
        └──────────────┴──────────────┴→ cancelled    └→ failed_dropoff
```

- **`awaiting_payment`**: the return exists but isn't paid. Drivers don't see it until the
  Stripe webhook moves it to `requested` ([ADR 0011](decisions/0011-awaiting-payment-status.md)).
- **`failed_dropoff`**: the carrier won't take the package (e.g. a damaged label). It's
  terminal for the MVP, and the client is contacted outside the app.
- **Every transition writes a `ReturnStatusEvent`.** That table is both the timeline and the
  audit trail. All transitions go through one service function that validates them
  (`app/services/status.py`), with the return's row locked so concurrent requests can't both
  win.

## Data models

> One package per return. A multi-package `Item` table later is a clean migration.

- **User**: `id`, `role` (client | driver | admin), `name`, `email`, `phone`,
  `password_hash`, `locale` (fr | en), `created_at`.
- **DriverProfile**: `user_id`, vehicle info, `is_available`, `location` (geography point),
  `location_updated_at`, `rating_avg`, `rating_count`, `stripe_account_id`.
- **Retailer**: `id`, `name`, `logo_url`, `return_policy_url`. This is who the return is for.
- **DropOffLocation**: `id`, `carrier` (canada_post | ups | purolator | fedex | other),
  `name`, `address`, `location` (geography point), `hours` (JSON).
- **ReturnRequest**:
  - who: `id`, `client_id`, `retailer_id`, `driver_id` (nullable), `dropoff_location_id`
    (nullable until drop-off)
  - state and price: `status`, `pickup_fee`
  - pickup: `pickup_address`, `pickup_location` (point), `pickup_window_start/end`
  - label and package: `label_type` (qr_code | printed_label), `label_image_url`, `carrier`,
    `order_number`, `package_photo_url`
  - drop-off: `carrier_tracking_number`
  - eligibility: `eligibility_outcome` (eligible | eligible_with_warnings),
    `eligibility_attested_at`, `eligibility_policy_version`
  - timestamps
- **ReturnStatusEvent**: `id`, `return_id`, `status`, `actor_id`, `photo_url` (custody
  proof), `note`, `created_at`.
- **EligibilityQuestion**: `id`, `code` (stable slug), `prompt_en/fr`, `help_en/fr`,
  `options` (JSON list of `value`, `label_en/fr`, `outcome` = pass | warn | block),
  `sort_order`, `active`, `version`.
- **ReturnEligibilityAnswer**: `id`, `return_id`, `question_code`, `prompt_snapshot`,
  `answer_value`, `answer_label_snapshot`, `outcome`, `created_at`. The text is
  snapshotted, so editing a question later never rewrites history.
- **BlockedRequestLog**: `id`, `client_id`, `retailer_id`, `blocking_question_codes`,
  `created_at`. A blocked attempt never creates a return, so this is the only measure of
  what the gate prevents.
- **Payment**: `id`, `return_id`, `client_id`, `amount`, `tip`, `platform_fee`,
  `driver_payout`, `stripe_payment_intent_id`, `status`.
- **Rating**: `id`, `return_id`, `driver_id`, `client_id`, `stars`, `comment`.
- *Phase 2:* **Store** (`retailer_id`, `address`, `location`, `return_window_days`, policy
  overrides), plus a `store_id` on `ReturnRequest`.

### Eligibility gate

Before a return is created, the client answers a short checklist and attests that the answers
are accurate. The carrier question set:

| Code | Question | Block | Warn |
|---|---|---|---|
| `merchant_approved` | Has the retailer approved this return? | no | not sure |
| `label_ready` | Do you have the return label or QR code? | no | — |
| `package_sealed` | Is the item packed and sealed? | — | not yet (must be sealed by pickup) |
| `prohibited_items` | Does it contain batteries, liquids, aerosols or other restricted items? | yes | not sure |
| `return_deadline` | Is the retailer's drop-off deadline at least 1 day away? | no | not sure |

- Any `block` means no `ReturnRequest` is created: the API returns `422` with the blocking
  codes and writes a `BlockedRequestLog` row.
- Otherwise, any `warn` means the outcome is `eligible_with_warnings`, which needs
  `acknowledged_warnings: true`.
- Otherwise, the outcome is `eligible`.
- **The server re-evaluates every answer. The app is not a trust boundary.** See
  [`research/return-eligibility-attestation.md`](research/return-eligibility-attestation.md).

## API (high level)

**Auth**: `POST /auth/register`, `POST /auth/login`, `GET /me`, `PATCH /me` (phone)

**Client**
- `GET /retailers`
- `GET /eligibility/questions`: the localized question set.
- `GET /booking/options`: pickup windows and the all-in fee
  ([ADR 0012](decisions/0012-booking-rules.md)).
- `GET /addresses/autocomplete`, `GET /addresses/resolve`: address suggestions, then a
  signed address token once the server has checked the service area
  ([ADR 0013](decisions/0013-address-lookup.md)).
- `POST /uploads/presign`: a presigned URL for the label or package photo.
- `POST /returns`: create a return. Re-runs eligibility; `422` plus codes on a block.
- `GET /returns`, `GET /returns/{id}`: history; status plus timeline.
- `POST /returns/{id}/pay`: Stripe PaymentIntent for the fee and tip.
- `POST /returns/{id}/cancel`, `POST /returns/{id}/rating`

**Driver**
- `GET /driver/jobs`: nearby `requested` returns (PostGIS `ST_DWithin`).
- `POST /driver/jobs/{id}/accept`
- `POST /returns/{id}/pickup`: label scan plus custody photo.
- `GET /dropoff-locations?near=`: nearby carrier locations.
- `POST /returns/{id}/dropoff`: photo, plus receipt or tracking number.
- `POST /returns/{id}/failed-dropoff`
- `POST /driver/location`, `GET /driver/earnings`

**Real-time**: `WS /ws/returns/{id}` streams status plus driver location.

**Webhooks**: `POST /webhooks/stripe`

## Repo structure

```
boomerang/
├── CLAUDE.md  README.md  docker-compose.yml  .env.example
├── backend/            FastAPI (uv project)
│   ├── app/{core,models,schemas,api,services,realtime}/
│   ├── alembic/        migrations
│   └── tests/
├── apps/
│   ├── client/         Expo app
│   └── driver/         Expo app
├── packages/
│   └── api/            generated typed API client (hey-api)
├── docs/               product, architecture, roadmap, decisions, research, journal
├── prototype/          standalone React UI mockup (Netlify)
└── .github/            CI, templates, Dependabot
```

## Git & GitHub workflow

- **Trunk-based.** `main` is always deployable and protected by a ruleset: PR required, CI
  (`ci-ok`) must pass, linear history, no force pushes.
- **One issue → one branch → one PR.** Branches are named `type/area-short-description`, e.g.
  `feat/backend-auth-jwt` or `fix/client-label-upload`.
- **PR titles follow Conventional Commits** (`feat(client): add login screen`). CI checks
  them. PRs are squash-merged, so the title becomes the commit on `main`.
- **Review:** Claude opens the PR, and CI, the Claude Code GitHub Action and CodeRabbit
  review it. **Keyshawn merges** ([ADR 0002](decisions/0002-claude-builds-user-merges.md)).
- **Change log, four layers:** squash commits → `CHANGELOG.md` (git-cliff, regenerated when each milestone closes) →
  `docs/JOURNAL.md` (one human line per PR) → ADRs for decisions.

## Compliance hooks

Quebec rules (Law 25, Charter of the French Language, Consumer Protection Act) shape the
code: French fallback, location only during jobs, opt-in analytics, all-in prices, and
pre-tax tip suggestions. Full list in
[ADR 0007](decisions/0007-quebec-residency-and-compliance.md).

## External costs

- Apple Developer: $99/yr.
- Google Play: $25 one-time.
- Stripe: 2.9% + 30¢ per charge, plus Connect payout fees.
- EAS: the free tier has a monthly build limit.
- Hosting: **free until launch** (Supabase free plan, local Docker for dev and tests). About
  $25–50/mo at launch (Supabase Pro plus the API host).
