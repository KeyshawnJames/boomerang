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

- `brainstorm.md` — Phase 1: idea, problem, users, goals
- `vision.md` — Phase 2: features, MVP scope, user flows
- `technical.md` — Phase 3: stack, architecture, data models, API, collab modes
- `learning.md` — running learning log (append continuously, not just at the end)

## Where we are

- ✅ Phase 1 (Idea Discovery) — done
- ✅ Phase 2 (Vision Expansion) — done; name "Boomerang" kept
- 🔄 Phase 3 (Technical Planning) — drafted; finishing tooling decisions
- ⬜ Phase 4 (Execution Planning) — not started
- 🔄 Phase 5 (Learning Log) — ongoing

## Stack (locked)

- **Backend:** FastAPI (Python) + PostgreSQL (SQLModel/SQLAlchemy)
- **Mobile:** React Native + Expo — three apps, built client → driver → store
- **Payments:** Stripe Connect (client fee → platform cut → driver payout)
- **Real-time:** WebSockets via FastAPI · **Maps:** Google Maps/Mapbox + Expo Location
- **Push:** Expo Notifications · **Auth:** JWT + role-based (client/driver/store)

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

- **Tooling research requested** (user wants opinions, currency matters):
  PostHog (analytics/flags), CodeRabbit (AI PR review), Clerk (auth — note: may
  conflict with the "learn auth via FastAPI JWT" goal), NativeWind/Tailwind for
  styling, plus suggest others (Sentry, EAS, Supabase, state/data libs).
- **Project structure diagram** requested — repo layout + system architecture
  diagram to be added (likely to `technical.md`).
- Then **Phase 4: Execution Planning** — break MVP into small ordered tasks,
  MVP-first, starting with project setup + client app.

## Working agreements

- Git: commit at real milestones with conventional messages; push to `origin`
  (private repo: https://github.com/KeyshawnJames/boomerang).
- Keep the planning docs updated in place when revisiting a phase.
