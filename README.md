# Boomerang

**On-demand returns, handled for you.** Boomerang is a mobile marketplace, "Uber for
returns". A client books a pickup, a driver collects the package and drops it at the
carrier, and a scan-and-photo chain of custody plus a live status timeline keep everyone
informed from request to drop-off.

Launch market: **Montreal**. MVP: **label/QR returns** (Amazon-style) dropped at Canada
Post, UPS or Purolator, with **clients** and **drivers**. Partner-store returns come in
phase 2.

> **Status:** 🏗️ Early development. Planning is done and the stack was re-evaluated in
> October 2026. Current milestone: see [`docs/roadmap.md`](docs/roadmap.md).
>
> Live UI prototype: https://boomerang-prototype.netlify.app

---

## How it works

1. A **client** picks the retailer, adds the return label or QR code, and photographs the
   package. They answer a short eligibility checklist (merchant approved? label ready?
   sealed? nothing prohibited?) and attest to it. Packages that can't go are refused before
   any money changes hands.
2. They see the full price up front, pay, and a nearby **driver** is matched.
3. The driver scans the label, photographs the package at pickup, and drops it at a carrier
   location with photo and receipt proof.
4. The client follows a live timeline (Requested → Picked up → Dropped off → Done), with a
   push notification at each step. The retailer refunds the client directly once the
   carrier scans the package.

## Tech stack

| Layer | Choice |
|-------|--------|
| Backend | FastAPI (Python 3.13, uv) + PostgreSQL/PostGIS (SQLModel), Alembic |
| Mobile | Two Expo apps (client, driver), SDK 58, Expo Router, NativeWind |
| API contract | Typed client generated from OpenAPI (hey-api + TanStack Query) |
| Auth | FastAPI JWT (PyJWT, argon2), role-based |
| Payments | Stripe Connect (Accounts v2) |
| Real-time | FastAPI WebSockets: live driver location + status |
| Maps / push | react-native-maps + expo-location · Expo Notifications |
| i18n | English / French (French first-class, for Quebec) |
| Hosting | AWS ca-central-1 (Montreal), for Quebec's Law 25 |
| Tooling | GitHub Actions CI · Claude Code · CodeRabbit · EAS · PostHog (opt-in) |

## Repository structure

```
boomerang/
├── backend/        FastAPI backend (serves both apps)
├── apps/
│   ├── client/     Expo app for clients
│   └── driver/     Expo app for drivers
├── packages/       shared code (generated API client)
├── docs/           product, architecture, roadmap, decisions (ADRs), journal
├── prototype/      standalone React UI mockup (the Netlify prototype)
└── docker-compose.yml   local Postgres + PostGIS
```

Start with [`docs/README.md`](docs/README.md) for the full docs index.

## Development

See [`docs/development.md`](docs/development.md).

## How we work

- Trunk-based: `main` is protected. Every change goes through a PR with CI and AI review,
  and is squash-merged with a Conventional Commit title.
- Code is written with [Claude Code](https://claude.com/claude-code). Each decision is
  recorded in [`docs/decisions/`](docs/decisions/), and each PR adds a line to
  [`docs/JOURNAL.md`](docs/JOURNAL.md).

---

© Keyshawn James. All rights reserved. The source is visible for portfolio purposes; no
license is granted for reuse.
