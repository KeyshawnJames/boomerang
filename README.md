# Boomerang

**On-demand returns, handled for you.** Boomerang is a mobile marketplace — think
"Uber for retail returns": a client requests a pickup, a driver collects the item and
completes the return at the retailer, with a QR-based chain of custody and a live
status timeline keeping every party honest and informed from request to refund.

Launch market: **Montreal**. Three-sided marketplace: **clients** · **drivers** ·
**partner stores**.

> **Status:** 🏗️ Early development. Planning is complete (see [`docs/`](docs/)); the
> backend + apps are being built MVP-first, in the order client → driver → store.
> Current milestone: repo & dev-environment setup.

---

## How it works

1. A **client** picks a retailer + store, photographs the item and receipt, sees the
   pickup fee up front, pays, and gets a QR return authorization.
2. A nearby **driver** accepts the job, navigates to the client, scans the QR + takes
   a custody photo at pickup, then drives to the store.
3. The **store** scans the QR to accept the return and marks the refund issued.
4. The client follows a live status timeline (Requested → Picked up → At store →
   Accepted → Refund issued → Done) with a push notification at each step.

## Tech stack

| Layer | Choice |
|-------|--------|
| Backend | FastAPI (Python) + PostgreSQL (SQLModel/SQLAlchemy), Alembic migrations |
| Mobile | React Native + Expo (three apps), NativeWind v4, Expo Router |
| State/data | TanStack Query + Zustand |
| Auth | FastAPI-issued JWT, role-based (client / driver / store) |
| Payments | Stripe Connect (client fee → platform cut → driver payout) |
| Real-time | WebSockets (FastAPI) for live driver location + status |
| Maps / push | Google Maps/Mapbox + Expo Location · Expo Notifications |
| i18n | expo-localization + i18next (EN/FR from day one) |
| Tooling | CodeRabbit (PR review) · PostHog (analytics/flags) · EAS (build/ship) |

## Repository structure

```
boomerang/
├── README.md          # you are here
├── CLAUDE.md          # project context for AI-assisted sessions (auto-loaded)
├── docs/              # all planning & reference docs (see below)
├── backend/           # FastAPI backend (one backend serves all three apps)
├── apps/
│   ├── client/        # Expo app — built 1st
│   ├── driver/        # Expo app — built 2nd
│   └── store/         # Expo app (minimal) — built 3rd
├── prototype/         # standalone React/JSX UI mockup (not the real Expo apps)
├── presentation/      # pitch/portfolio deck + build pipeline
└── docker-compose.yml # local Postgres for development
```

## Documentation

The full plan lives in [`docs/`](docs/):

- [`brainstorm.md`](docs/brainstorm.md) — the idea, problem, users, goals
- [`vision.md`](docs/vision.md) — features, MVP scope, user flows
- [`technical.md`](docs/technical.md) — stack, architecture, data models, API, git workflow
- [`execution.md`](docs/execution.md) — milestones + task breakdown (MVP-first)
- [`setup.md`](docs/setup.md) — how the dev setup is wired, and *why* (beginner-friendly)
- [`learning.md`](docs/learning.md) — running log of concepts learned along the way
- [`CHANGELOG.md`](docs/CHANGELOG.md) — what got done, when, by whom
- [`research/`](docs/research/) — ad hoc write-ups for open questions that come up mid-build

## Getting started (development)

> Work in progress — these are the intended steps as the backend comes online.

**Prerequisites:** Docker, Python 3.11+, Node + Expo (for the apps, later).

```bash
# 1. Start the local Postgres database
docker compose up -d

# 2. Set up the backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# 3. Configure environment
cp ../.env.example ../.env   # then fill in real values

# 4. Run the API (once Milestone 2 adds app/main.py)
uvicorn app.main:app --reload
```

## Contributing / workflow

Trunk-based: `main` is always deployable. Work happens on short-lived feature
branches (`feat/...`, `fix/...`), merged via Pull Request with CodeRabbit review. See
[`technical.md` → Git & GitHub Workflow](docs/technical.md) for the full conventions.

---

_Private project. © Keyshawn James._
