# Execution Plan: Boomerang

> Phase 4 output. Turns `vision.md` + `technical.md` into an ordered checklist of
> small, do-in-one-sitting tasks. **MVP-first**: everything here targets the MVP
> defined in `vision.md`; post-MVP work is explicitly out of scope (see bottom).
>
> **How to read this:** milestones are ordered as *vertical slices* — build just
> enough backend to unblock an app feature, then build that feature — rather than
> "all backend, then all frontend." Build order across apps stays
> **client → driver → store**.
>
> **Collaboration modes carry over from `technical.md`:** backend + schema are
> *guided* (you write the Boomerang-specific code, Claude scaffolds and checks);
> React Native is *explain-as-you-go* (Claude writes, walks through it); hard infra
> (real-time, Stripe, maps, push) is *guided with heavy support*.

## Milestones

1. **Repo & dev environment** — monorepo skeleton, tooling, local Postgres
2. **Backend foundation** — FastAPI app boots, config, DB session, health check
3. **Data models & first migration** — the schema, via Alembic (guided, foundational)
4. **Auth & accounts** — register/login, JWT, role-based access
5. **Client app bootstrap** — Expo app runs, nav, styling, i18n, talks to backend
6. **Retailer & store browsing** — backend endpoints + client screens
7. **Create a return** — item capture, QR authorization, status state machine
8. **Payments (Stripe Connect)** — fee charge before booking (guided, hard infra)
9. **Status timeline & push notifications** — events → timeline UI → Expo push
10. **Driver app + matching/dispatch** — job feed, accept, geo matching
11. **Real-time tracking** — WebSocket driver location → client map (hard infra)
12. **Driver pickup & store handoff** — QR scan + photo custody, store accept app
13. **Ratings, history, earnings** — closing-loop screens across the three apps
14. **Hardening & deploy prep** — tests, error handling, managed DB, EAS builds

---

## Task Breakdown

### Milestone 1: Repo & dev environment

- [ ] Create the monorepo folder structure from `technical.md` (`backend/`, `apps/client|driver|store/`) with placeholder READMEs
- [ ] Add a root `.gitignore` (Python, Node, Expo, `.env`, `__pycache__`, `node_modules`)
- [ ] Write `docker-compose.yml` for local PostgreSQL, confirm `docker compose up` brings up a DB
- [ ] Create `backend/pyproject.toml` with FastAPI, uvicorn, SQLModel, Alembic, psycopg, pydantic-settings, python-jose, passlib
- [ ] Set up a Python virtualenv and install backend deps; confirm `uvicorn` is available
- [ ] Add `.env.example` (DB URL, JWT secret, Stripe keys placeholder) and a real local `.env` (gitignored)
- [ ] Connect the GitHub remote (`origin`) and push the initial monorepo skeleton
- [ ] Set up CodeRabbit on the repo (PR review) — confirm it comments on a throwaway PR

### Milestone 2: Backend foundation

- [ ] Create `app/main.py` with a FastAPI instance and a `GET /health` endpoint
- [ ] Create `app/core/config.py` — settings loaded from env via pydantic-settings
- [ ] Create `app/core/db.py` — SQLModel engine + session dependency
- [ ] Wire a startup check that the app can connect to Postgres
- [ ] Confirm `uvicorn app.main:app --reload` runs and `/health` returns 200
- [ ] Add CORS middleware (allow the Expo dev client origins)

### Milestone 3: Data models & first migration *(guided — design schema together)*

- [ ] Create `app/models/user.py` — `User` (id, role enum, name, email, phone, password_hash, created_at)
- [ ] Create `app/models/driver.py` — `DriverProfile` (user_id FK, vehicle info, is_available, current_lat/lng, rating aggregate, stripe_account_id)
- [ ] Create `app/models/retailer.py` — `Retailer` (id, name, logo_url, return_policy) and `Store` (id, retailer_id FK, address, lat, lng, policy overrides)
- [ ] Create `app/models/return_request.py` — `ReturnRequest` with all fields incl. `item_description`/`photo_urls` on the row (one-item-per-return), `qr_token`, `status`, `driver_id` nullable
- [ ] Create `app/models/status_event.py` — `ReturnStatusEvent` (return_id FK, status, actor_id, photo_url, created_at)
- [ ] Create `app/models/payment.py` and `app/models/rating.py`
- [ ] Define the status enum: `requested → driver_assigned → picked_up → at_store → accepted → refund_issued → completed` (+ `cancelled`)
- [ ] Initialize Alembic (`alembic init`), point it at the SQLModel metadata
- [ ] Generate and run the first migration; confirm all tables exist in Postgres
- [ ] Write a `seed.py` that inserts 2–3 Montreal retailers + store locations for dev

### Milestone 4: Auth & accounts *(guided)*

- [ ] Create `app/core/security.py` — password hashing (passlib) + JWT encode/decode
- [ ] Create `app/schemas/auth.py` — register/login request + token response Pydantic models
- [ ] Implement `POST /auth/register` — create a user with a role, hash the password
- [ ] Implement `POST /auth/login` — verify password, return a JWT carrying user id + role
- [ ] Create a `get_current_user` dependency that decodes the JWT
- [ ] Create a role-guard dependency (e.g. `require_role("driver")`) for role-based access
- [ ] Write a quick test (or REST client calls) covering register → login → call a protected route

### Milestone 5: Client app bootstrap *(explain-as-you-go)*

- [ ] Scaffold the Expo app in `apps/client` (Expo Router template, TypeScript)
- [ ] Install + configure NativeWind v4 (Tailwind config, babel plugin); render one styled screen
- [ ] Set up Expo Router file-based navigation with a tab/stack skeleton
- [ ] Add expo-localization + i18next with `en.json` / `fr.json` and a language toggle
- [ ] Create `lib/api.ts` — a fetch/axios client pointed at the local backend, with auth header injection
- [ ] Set up TanStack Query provider + a Zustand store for auth/session state
- [ ] Build Login + Register screens wired to `/auth/login` and `/auth/register`; persist the token
- [ ] Confirm end-to-end: register a client from the app, log in, land on a home screen
- [ ] Add PostHog to the client app (init + one captured event)

### Milestone 6: Retailer & store browsing

- [ ] Backend: `GET /retailers` (list + logos) and `GET /retailers/{id}/stores`
- [ ] Backend: `GET /stores/{id}/policy` — return window / condition rules
- [ ] Client: retailer picker screen (logos, list) fetching `/retailers`
- [ ] Client: store-location selection screen for the chosen retailer
- [ ] Client: eligibility/policy display screen for the selected store

### Milestone 7: Create a return

- [ ] Backend: `app/schemas/returns.py` — create-return request/response models
- [ ] Backend: `POST /returns` — create a `ReturnRequest` (status `requested`), generate a unique `qr_token`, compute `pickup_fee`
- [ ] Backend: write the first `ReturnStatusEvent` on creation (status = `requested`)
- [ ] Backend: a small status-transition helper/service that validates allowed transitions and writes an event each time
- [ ] Backend: `GET /returns/{id}` (status + timeline) and `GET /returns` (client history)
- [ ] Backend: decide photo storage for `photo_urls` (local dir for dev now; note S3/cloud as deploy task)
- [ ] Client: item-capture screen — camera for item + receipt photos (expo-camera), order number, reason
- [ ] Client: up-front pricing screen showing the pickup fee before confirming
- [ ] Client: generate/display the QR return authorization (from `qr_token`)
- [ ] Confirm end-to-end: client creates a return, sees it in history with a QR

### Milestone 8: Payments — Stripe Connect *(guided, hard infra — expect this to be slow)*

- [ ] Set up a Stripe test account; add test keys to `.env`
- [ ] Backend: `app/services/payments.py` — create a PaymentIntent for the pickup fee (platform take-rate model)
- [ ] Backend: `POST /returns/{id}/pay` — create/confirm the PaymentIntent, record a `Payment` row
- [ ] Backend: `POST /webhooks/stripe` — verify signature, update `Payment`/return status on payment events
- [ ] Backend: Stripe Connect Express account creation for drivers (store `stripe_account_id`) — scaffold now, payout later
- [ ] Client: payment screen using Stripe's React Native SDK (test card), gating booking on success
- [ ] Confirm end-to-end: client pays the fee with a test card; payment recorded; webhook fires

### Milestone 9: Status timeline & push notifications

- [ ] Client: status-timeline component rendering events `requested → … → completed`
- [ ] Backend: notifications service (`app/services/notifications.py`) sending Expo push on each transition
- [ ] Client: register for Expo push notifications, send the token to the backend, store it on the user
- [ ] Confirm a status change on the backend triggers a push the client device receives

### Milestone 10: Driver app + matching/dispatch

- [ ] Scaffold `apps/driver` Expo app (reuse client setup: NativeWind, Router, i18n, api client, auth)
- [ ] Backend: `POST /driver/location` — update `DriverProfile` lat/lng + availability
- [ ] Backend: matching service — `GET /driver/jobs` returns nearby `requested` returns via a Postgres geo proximity query
- [ ] Backend: `POST /driver/jobs/{id}/accept` — assign driver, transition to `driver_assigned`, write event
- [ ] Driver app: login as a driver, job-feed screen listing nearby pickups
- [ ] Driver app: accept/decline a job; on accept, navigate to job detail
- [ ] Confirm end-to-end: client's new return appears in a nearby driver's feed and can be accepted

### Milestone 11: Real-time tracking *(guided, hard infra)*

- [ ] Backend: `WS /ws/returns/{id}` — WebSocket hub broadcasting status + driver location for a return
- [ ] Backend: relay driver location pushes (from `/driver/location` or the socket) to subscribed clients
- [ ] Driver app: stream location (Expo Location) to the backend while a job is active
- [ ] Client: live map (Google Maps/Mapbox + react-native-maps) showing the driver approaching
- [ ] Confirm end-to-end: client watches the assigned driver move on the map in real time

### Milestone 12: Driver pickup & store handoff + store app

- [ ] Driver app: two-leg navigation (to client, then to store) via maps deep-link or in-app directions
- [ ] Driver app: QR scan at pickup (expo-camera) + photo proof → `POST /returns/{id}/pickup`
- [ ] Backend: `POST /returns/{id}/pickup` — verify `qr_token`, transition to `picked_up`, store custody photo as a `ReturnStatusEvent`
- [ ] Driver app: "arrived at store" → transition to `at_store`
- [ ] Scaffold `apps/store` minimal Expo app (login as store_admin, single scan screen)
- [ ] Backend: `POST /returns/{id}/accept` — store scans QR, verify, transition to `accepted`
- [ ] Backend: `POST /returns/{id}/refund-issued` — mark refund issued, then `completed`
- [ ] Store app: scan-to-accept screen → confirm acceptance → mark refund issued
- [ ] Confirm full chain of custody end-to-end: create → pay → match → pickup (QR+photo) → store accept → refund → completed

### Milestone 13: Ratings, history, earnings

- [ ] Backend: `POST /returns/{id}/rating` — write a `Rating`, update the driver's aggregate
- [ ] Client: rate-the-driver screen after completion + return-history list with statuses
- [ ] Backend: `GET /driver/earnings` — summary from completed returns / payouts
- [ ] Driver app: earnings dashboard screen
- [ ] Backend: trigger the driver payout via Stripe Connect on `completed` (close the payments loop)

### Milestone 14: Hardening & deploy prep

- [ ] Add pytest coverage for auth, return creation, and the status state machine
- [ ] Add consistent API error handling + validation responses
- [ ] Move dev photo storage to cloud storage (S3 or similar) and update `photo_urls`
- [ ] Pick + provision a managed Postgres host (Neon / Railway) and run migrations there
- [ ] Configure EAS for the three apps; produce a first internal build of the client app
- [ ] Add Sentry to backend + apps (now that PostHog is already in)
- [ ] Review Quebec/Canadian return + payment compliance touchpoints before any real launch

---

## Suggested Timeline

*Starting estimate for a first-time app builder working in focused sessions — not a
commitment. Hard-infra milestones (8, 11, 12) will run longer than their task count
suggests.*

- **Milestones 1–4** (repo, backend foundation, schema, auth): ~1–2 weeks — this is
  the part you're most comfortable with (FastAPI/Python).
- **Milestones 5–7** (client bootstrap + first real return flow): ~2–3 weeks — your
  first real React Native, expect the learning curve here.
- **Milestone 8** (Stripe): ~1–2 weeks on its own; payments are fiddly.
- **Milestones 9–11** (timeline, push, driver app, real-time): ~3–4 weeks — the
  WebSocket + maps work is the slowest stretch.
- **Milestones 12–13** (handoff, store app, closing-loop screens): ~2 weeks.
- **Milestone 14** (hardening/deploy): ~1–2 weeks.

Roughly a **3–4 month** part-time path to a demoable MVP.

## MVP-First Strategy

**Strictly required for the MVP** (the happy-path loop in `vision.md`): Milestones
1–13. The single most important runnable target is the **end-to-end chain of custody**
(Milestone 12's final task): create → pay → match → pickup with QR+photo → store
accept → refund → completed. Everything before it exists to make that one flow real.

**Build order within the MVP, if time gets tight:**
1. Get the *client return-creation flow* working against the backend (M1–7) — this is
   the most demoable single slice.
2. Add *payments* (M8) so a return can actually be booked.
3. Add the *driver side + matching* (M10) so a return can be fulfilled.
4. Add *real-time tracking* (M11) — high-wow, but the flow works without it if needed.
5. Add the *store app + handoff* (M12) to close the loop.

**Can be deferred without breaking the MVP demo** (do in M14 or later): cloud photo
storage (local dir works for a demo), managed DB hosting, Sentry, EAS store
submission, driver payouts (the *charge* matters more than the payout for a demo).

**Explicitly out of scope** (from `vision.md` — do NOT let these creep in): batching
returns, scheduled pickups, multi-item/multi-store, refund-amount detail tracking,
retailer self-onboarding portal, driver identity/background checks, insurance,
in-app support chat, email-receipt parsing, cities beyond Montreal.
