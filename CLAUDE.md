# Boomerang

On-demand returns marketplace, Montreal. Carrier-first MVP: a client books a pickup for a
label/QR return, a driver collects it and drops it at Canada Post, UPS or Purolator, with a
scan-and-photo chain of custody and a live status timeline. Two Expo apps (client, driver)
plus one FastAPI backend. A real product and a portfolio piece; the repo is **public**.

- Current milestone and order: `docs/roadmap.md`. Live tasks: GitHub Issues/Milestones.
- What and why: `docs/product/vision.md`, `docs/architecture.md`, `docs/decisions/` (ADRs).

## How we work (ADR 0002)

- **Claude writes all code.** Keyshawn plans with Claude and **merges every PR**. Never
  merge a PR, push to `main`, or force-push; a hook blocks these.
- **One issue → one branch (`type/area-desc`) → one PR.** Never commit on `main`.
- PR titles use Conventional Commits (`feat(backend): …`); CI checks them, and squash-merge
  turns the title into the commit on `main`.
- Commits are authored by Keyshawn only. **No `Co-Authored-By` trailer.**
- Workflow per feature: Superpowers. brainstorm (only if behavior is unclear) →
  writing-plans → TDD implementation → verification → `/code-review` (`/security-review` for
  auth/payments) → `/ship`.
- Use `/ship` to open PRs. It runs the checks, adds the `docs/JOURNAL.md` line, and fills the
  PR template.
- Any real decision (scope, stack, architecture, process) gets an ADR in `docs/decisions/`.
- PR descriptions, journal lines and ADRs are written in plain English, for Keyshawn and his
  non-technical business partner, whatever output-style plugin is active.
- Keep `README.md` in sync when the stack, structure or status changes meaningfully.
- Nothing business-sensitive goes in the repo. Strategy and partner material lives in
  `docs/private/` (gitignored).

## Commands

```bash
docker compose up -d                       # Postgres + PostGIS
cd backend && uv sync                      # backend deps (Python 3.13)
uv run fastapi dev app/main.py             # run API
uv run pytest                              # tests (real PostGIS via testcontainers)
uv run ruff check . && uv run ruff format .
uv run alembic revision --autogenerate -m "…" && uv run alembic upgrade head
uv run python -m app.seed                  # Montreal seed data (safe to re-run)
pnpm install                               # JS workspaces (repo root)
pnpm --filter api generate                 # regenerate typed API client after API changes
```

## Repo map

- `backend/`: FastAPI. `app/{core,models,schemas,api,services,realtime}`, `alembic/`, `tests/`
- `apps/client`, `apps/driver`: Expo SDK 58 apps, run in Expo Go for now (ADR 0010). See `apps/CLAUDE.md`
- `packages/api`: **generated** client. Never hand-edit; regenerate.
- `docs/`: see `docs/README.md`. `prototype/`: standalone React mockup, not the real app.

## Domain guardrails

- **The server decides eligibility.** The app only previews it. `POST /returns` re-evaluates
  every answer, writes `BlockedRequestLog` on a block, and snapshots question text on each
  answer.
- **All status changes go through the one status-machine service.** Each writes a
  `ReturnStatusEvent`. Never update `status` directly.
- **Money:** no cash refunds, ever. Refunds go retailer → client directly and never touch
  Boomerang. Drivers never handle client cards.
- **Quebec (ADR 0007):**
  - French is first-class, and the fallback when the device language isn't EN/FR. Every
    user-facing string goes in both `en` and `fr` locale files.
  - Driver location is tracked **only during an active job**, after an explanation.
  - Analytics are opt-in. Consent is collected per purpose.
  - Prices shown include all fees. Tips are calculated on the pre-tax amount.
- **Data residency:** personal data is hosted in AWS ca-central-1 only.
- **One package per return.** Design so a multi-package `Item` table is a clean migration.

## Stack notes (ADR 0005)

- Auth: PyJWT + pwdlib[argon2] (not python-jose or passlib). Sync SQLModel sessions.
  PostGIS `geography` + `ST_DWithin` for proximity.
- Stripe Connect **Accounts v2** (not Express). Use test keys only in dev.
- NativeWind **v4** (v5 is still an RC). Pin `@hey-api/openapi-ts` to an exact version.
- Before writing code against a library API, check the current docs (context7 or the Expo
  MCP) rather than memory.

## Coding guidelines

Source: [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills).

@docs/coding-guidelines/CLAUDE.md

Worked examples (read on demand): `docs/coding-guidelines/EXAMPLES.md`
