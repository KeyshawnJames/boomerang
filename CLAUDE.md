# Boomerang — Project Context

> Auto-loaded context for any Claude Code session started in this folder.
> This project is being planned with the **project-planner** skill. The full
> plan lives in the markdown files below — read them to reconstruct state.

## What this is

Boomerang is an on-demand "Uber for returns" mobile app: a client requests a
return pickup, a driver collects the item and completes the return at the
retailer, with a QR-based chain of custody and a live status timeline. It's a
three-sided marketplace (clients, drivers, retailers/stores). Launch market:
**Montreal**. It is a **real product** (user + a business partner), a **portfolio
piece**, and the user's **first app build**.

## Planning documents (source of truth)

> All planning/doc markdown lives in `docs/` (this `CLAUDE.md` stays at root so it
> auto-loads). Paths below are relative to the repo root.

- `docs/brainstorm.md` — Phase 1: idea, problem, users, goals
- `docs/vision.md` — Phase 2: features, MVP scope, user flows
- `docs/technical.md` — Phase 3: stack, architecture, data models, API, collab modes
- `docs/execution.md` — Phase 4: milestones + small ordered tasks, MVP-first
- `docs/learning.md` — running learning log (append continuously, not just at the end)
- `docs/setup.md` — how the repo/dev setup is wired and *why* (append new setup steps)
- `docs/CHANGELOG.md` — running story of what got done, by whom, over time (newest on top)

## Where we are

- ✅ Phase 1 (Idea Discovery) — done
- ✅ Phase 2 (Vision Expansion) — done; name "Boomerang" kept
- ✅ Phase 3 (Technical Planning) — done; stack, tooling, diagrams all locked
- ✅ Phase 4 (Execution Planning) — done; `execution.md` has 14 milestones broken
  into small tasks, MVP-first, as vertical slices (client → driver → store)
- 🔄 Phase 5 (Learning Log) — ongoing
- 🔄 Milestone 1 (repo & dev environment) — IN PROGRESS:
  - ✅ Monorepo skeleton scaffolded (`backend/` + `apps/client|driver|store/`)
  - ✅ `.gitignore`, `docker-compose.yml`, `.env.example`, `backend/pyproject.toml`
  - ✅ Skeleton pushed to GitHub; planning docs consolidated into `docs/`
  - ⬜ **RESUME HERE:** create Python virtualenv + install backend deps
        (`pip install -e ".[dev]"` from `backend/`) — collab mode for this boilerplate
        is explain-as-you-go (Claude gives commands, user runs them locally)
  - ⬜ Set up CodeRabbit on the repo (GitHub web UI)
  - ⬜ Enable branch protection on `main` (GitHub web UI; after skeleton — done)
- ⬜ THEN: Milestone 2 — write `app/main.py` (`/health`), backend boots for first time

## Stack (locked)

- **Backend:** FastAPI (Python) + PostgreSQL (SQLModel/SQLAlchemy)
- **Mobile:** React Native + Expo — three apps, built client → driver → store
- **Payments:** Stripe Connect (client fee → platform cut → driver payout)
- **Real-time:** WebSockets via FastAPI · **Maps:** Google Maps/Mapbox + Expo Location
- **Push:** Expo Notifications · **Auth:** FastAPI JWT + role-based (NOT Clerk)
- **Styling:** NativeWind v4 · **Nav:** Expo Router · **State:** TanStack Query + Zustand
- **i18n:** expo-localization + i18next (EN/FR) · **Migrations:** Alembic
- **Tooling:** CodeRabbit (PR review), PostHog (analytics/flags), EAS (build/ship);
  Sentry later. No Supabase, no Clerk (we own the backend to learn it).
- **DB hosting:** local Postgres (Docker) in dev; managed host (Neon/Railway) at deploy.

## Collaboration modes (IMPORTANT — honor these when coding)

- **React Native + Expo:** *Explain-as-you-go* — Claude writes the code, walks
  through it line-by-line on non-obvious parts (user has no prior RN experience).
- **FastAPI backend:** *Guided* — user writes the Boomerang-specific code; Claude
  scaffolds and checks their work.
- **Database / data modeling:** *Guided* — design the schema together.
- **Hard infra (real-time, Stripe, maps, push):** *Guided* — user attempts the
  tricky plumbing with heavy support; expect this to be the slowest part.
- **Overall style:** Guided — give structure, let the user attempt, step in to
  help and explain when stuck. User is comfortable with FastAPI/Python; new to
  mobile/RN.

## Decisions locked since technical.md draft

- **One item per return for now**; design schema so adding a multi-item `Item`
  table later is a clean migration, not a repaint.
- **i18n from day one** — app must support an English/French toggle; build
  localization in from the start rather than retrofitting.
- **Quebec / Canadian rules** — follow Quebec + Canadian return and payment
  regulations.

## Open / next up

- ✅ Tooling decided (see Stack above) and written into `technical.md`.
- ✅ Repo-structure + system-architecture diagrams added to `technical.md`.
- ✅ Phase 4 — Execution Planning complete; full task breakdown in `execution.md`
  (14 milestones, MVP-first, vertical slices).
- **NEXT: start building — Milestone 1 (repo & dev environment):** monorepo
  skeleton, `.gitignore`, local Postgres via Docker, backend `pyproject.toml`.
  Then M2 (backend boots) → M3 (schema, guided) → M4 (JWT auth) → M5 (client app).

## Working agreements

- Git: commit at real milestones with conventional messages; push to `origin`
  (private repo: https://github.com/KeyshawnJames/boomerang).
- Keep the planning docs updated in place when revisiting a phase.
- Add a `CHANGELOG.md` entry (newest on top) when a meaningful chunk of work lands.
- When new setup/infra is added, append the how-and-why to `setup.md`.
