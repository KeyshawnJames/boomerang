# Journal

> The human story of Boomerang: what got done, by whom, and why. Newest on top.
> One short entry per merged PR (Claude adds it via `/ship`), plus anything worth
> remembering that isn't a PR. Tag who did it: **[Claude]** or **[Keyshawn]**.
>
> This complements, not duplicates: the commit history has every change,
> `CHANGELOG.md` (generated) lists them, and `docs/decisions/` has the reasoning behind
> real decisions.
>
> Before 2026-10-23 this file was `docs/CHANGELOG.md`.

---

## 2026-10-30

### Starting a return in the app
- **[Claude]** The client app has a "New return" button. It walks through picking the
  retailer, the label type and carrier, an optional order number, then a photo of the label
  and of the package, which upload straight away. Going back keeps every choice. The steps
  after the photos come next. (#47)

### Clients can create a return
- **[Claude]** The server can now create a return. It re-checks every eligibility answer
  itself, so a blocked answer is refused and logged even if someone bypasses the app. It
  also checks the pickup time, the address, both photos and the phone number. It sets the
  price itself, and the return waits for payment, which comes in M5. (#46)

### Clients can upload their label and package photos
- **[Claude]** The app can now ask the server for a short-lived upload link (15 minutes,
  one photo, up to 10 MB, JPEG, PNG or HEIC) and send the label or package photo to it.
  Each link works once, so a photo can't be swapped after the fact. For now the photos are
  saved on the developer's computer; at launch the same links will point to Supabase
  Storage in Montreal, without changing the app. (#45)

## 2026-10-29

### Pickup addresses are looked up and checked by the server
- **[Claude]** When a client types their pickup address, the server now asks Google for
  suggestions and, once they pick one, checks it's a real street address within 15 km of
  downtown Montreal. It then hands the app a signed note of that address, so nobody can
  fake a location when booking. The Google key stays on the server. (#44)

### The app can show pickup times, price and questions before booking
- **[Claude]** Before booking, the app can now ask the server for the list of stores, the
  eligibility questions in the client's language, and the pickup times and price on offer:
  2-hour windows during service hours, up to a day ahead, with "as soon as possible" first
  when we're open, and one all-in fee ($4.99 for now; the business sets the real one).
  Clients can add their phone number so the driver can reach them. (#42)

### Returns wait for payment, and status changes follow the rules
- **[Claude]** A return's progress (waiting for payment, requested, picked up, dropped off…)
  can now only change through one gatekeeper. It refuses impossible jumps, such as going from
  "completed" back to "requested", and it records every change in the return's history. New
  returns start as "waiting for payment", so drivers never see a pickup nobody has paid for. (#41)

### Milestone 3 is done
- **[Claude]** The client app is now a real app: it looks like Boomerang, speaks French and
  English, talks to the server through generated code, and lets a client sign up and stay
  logged in. The milestone is tagged and the changelog lists what it contains. Next up:
  creating a return. (M3)

### Clients can sign up and log in
- **[Claude]** The client app now has sign-up and log-in screens. The login is kept in the
  phone's secure keychain, so closing and reopening the app keeps you signed in; after 24
  hours the server asks you to log in again. Error messages show in French or English, and
  the app now remembers the language you picked. (#18)

### The app can talk to the server
- **[Claude]** The client app now talks to the server through code that is generated
  automatically from the server's own description of itself, so the two can't quietly drift
  apart: a test fails if someone changes the server and forgets to regenerate. The home screen
  shows whether the server is reachable. (#17)

### The client app speaks French and English
- **[Claude]** The client app now shows every word in English or Quebec French. It follows the
  phone's language, uses French for any language other than English (as Quebec law expects),
  and has a button to switch. The automatic checks fail if a French translation is missing.
  (#16)

### The client app has its look
- **[Claude]** The client app now uses Boomerang's colors and font (forest green, emerald and
  mint, with the Manrope typeface) from the prototype. It follows the phone's light or dark
  setting automatically. (#15)

### The client app exists
- **[Claude]** The client app now exists as a bare starting point: it opens on a phone through
  the free Expo Go app, with no app-store build needed yet. Every change to it is now checked
  automatically for type errors, code style and broken tests. (#14)

### Milestones 1 and 2 are done
- **[Claude]** The backend now has its foundation (database, migrations, real-database tests)
  and its data and accounts layer (every table the MVP needs, Montreal starter data, sign-up,
  log-in and role checks). Both milestones are tagged, and the changelog lists what each
  contains. Next up: the client app. (M1, M2)

### People can sign up and log in
- **[Claude]** Clients and drivers can now create an account, log in and stay logged in for a
  day. Each part of the API can be limited to drivers, clients or admins. Passwords are stored
  only in scrambled form, nobody can sign themselves up as an admin, and error messages come
  in French or English. (#13)

### The core data model
- **[Claude]** The database now has tables for users, drivers, retailers, carrier drop-off
  spots, returns and each return's status history, with map coordinates so we can find what's
  nearby. Each test now starts from an empty database. (#10)
- **[Claude]** Added tables for the eligibility checklist, the answers each client gave, blocked
  attempts, payments and ratings. Answers keep a copy of the question's wording, so editing a
  question later never changes what a client agreed to. (#11)
- **[Claude]** One command now fills the database with starter data: four Montreal retailers,
  seven real Canada Post, UPS and Purolator drop-off spots downtown (from OpenStreetMap), and
  the five eligibility questions in English and French. Running it twice adds nothing new. (#12)

### The backend talks to the database
- **[Claude]** The API now connects to the database, and `/health` says whether the database is
  reachable. Every test runs against a real throwaway copy of our database, built from the
  same migration scripts we'll use in production. The local database moved to port 5433 so it
  doesn't clash with a Postgres already installed on the laptop. (#8, #9)

### Where the data lives
- **[Claude]** Picked Supabase's Montreal region to host the database and photos, free until
  launch. We use it only as plain storage: login and all the logic stay in our own backend,
  so we can move to AWS later without rewriting anything. (#27)

## 2026-10-23

### The backend boots
- **[Claude]** First real code: the API starts up and answers a `/health` check, with settings
  read from `.env` and only the Expo dev origin allowed for browser calls. CI now runs real
  tests instead of tolerating "no tests yet". (#7)

### Reset: Claude builds, carrier-first MVP, public repo
- **[Keyshawn]** Dropped the "I write the backend myself" learning mode: Claude now builds
  everything, we plan together, and Keyshawn merges every PR (ADR 0002).
- **[Keyshawn]** Narrowed the MVP to label/QR returns dropped at carriers (Canada Post, UPS,
  Purolator). Two apps (client + driver), no store app and no retailer sign-ups needed to
  launch. Partner stores move to phase 2 (ADRs 0003, 0004).
- **[Claude]** Re-evaluated the stack against October 2026 releases: PyJWT + pwdlib instead
  of the unmaintained python-jose/passlib, uv + Python 3.13, PostGIS, Expo SDK 58, pnpm
  workspaces, a generated typed API client, Stripe Accounts v2, hosting in Montreal for
  Quebec's Law 25 (ADRs 0005, 0007).
- **[Claude]** Rewrote git history before making the repo public: business strategy docs
  removed (now local-only in `docs/private/`) and commit emails switched to GitHub's
  noreply address. gitleaks scan clean. Repo made public for free branch protection and
  secret scanning (ADR 0006).
- **[Claude]** Reorganized `docs/` (architecture, roadmap, development, decisions, journal)
  and rewrote vision/architecture/roadmap for the carrier-first MVP.
- **[Claude]** Consolidated Claude Code tooling on Superpowers; removed GSD (ADR 0008).
- **[Claude]** Repo tooling:
  - CI on every PR: secret scan, backend lint and tests, plus a single `ci-ok` gate.
  - A Conventional-Commit PR title check, Dependabot, and PR/issue templates.
  - A lefthook pre-commit hook (gitleaks + ruff), git-cliff changelog config, and a
    `/ship` skill.
  - A Claude Code hook that blocks Claude from merging PRs or pushing to `main`.
  - The backend moved to uv + Python 3.13, with PyJWT/pwdlib replacing python-jose/passlib.
  - Local DB is now PostGIS 18.

## 2026-08-06

### Return eligibility questionnaire (attestation gate)
- **[Claude]** Acted on partner feedback: we were dispatching drivers on the client's
  word alone, with no check that the item actually met the store's return conditions.
  Added an eligibility questionnaire between item capture and payment — seven
  questions whose answers are `pass` / `warn` / `block`. A blocking answer refuses the
  request before any money changes hands and points the client at returning it
  themselves; warnings require an explicit "the store may still refuse this"
  acknowledgment. Every answer is stored against the return with a timestamped
  attestation, which is the evidence trail if a store refuses an item or a client
  disputes the fee.
- **[Claude]** Schema + API in `technical.md`: `EligibilityQuestion`,
  `ReturnEligibilityAnswer` (with prompt/label snapshots so history can't be rewritten),
  `BlockedRequestLog`, three new `ReturnRequest` fields, `return_window_days` on
  `Store`, and a `refused` terminal status off `at_store`. `GET /stores/{id}/policy`
  now carries the question set; `POST /returns` re-evaluates the answers server-side.
- **[Claude]** Tasks folded into existing milestones — M3 (models + seed), M6
  (endpoint), M7 (evaluator, gating, client screen), M12 (`POST /returns/{id}/refuse`
  in the store app). No new milestone.
- **[Claude]** Prototype: replaced the fake `EligibilityScreen` (a 1700 ms spinner and
  a hardcoded all-green checklist) with the real questionnaire, including the blocked
  and warning states. Extracted a shared `Choice` row component. Verified all three
  paths in the browser.
- **[Claude]** Wrote `docs/research/return-eligibility-attestation.md` — what the
  attestation does and doesn't protect against, and the Quebec/Canada angle.

## 2026-06-18

### Added root `README.md`
- **[Claude]** Wrote the public/portfolio-facing `README.md` (what Boomerang is, how
  it works, stack, repo structure, docs index, getting-started). Registered it in
  `CLAUDE.md` with a working agreement to keep it in sync as the project evolves.

### Learning — Docker explained
- **[Claude]** Expanded the Docker notes in `learning.md` (what it is, what
  `docker-compose.yml` does line-by-line, and where Docker fits in Boomerang — local
  dev DB only, managed host in prod) in response to questions from Keyshawn.
- _Session paused here._ Milestone 1 resumes at: create virtualenv + install backend
  deps. See `CLAUDE.md` → Where we are.

## 2026-06-17

### Docs cleanup — moved planning docs into `docs/`
- **[Claude]** Moved all planning/doc markdown (`brainstorm`, `vision`, `technical`,
  `execution`, `learning`, `setup`, `CHANGELOG`) into a single `docs/` folder to
  declutter the repo root. `CLAUDE.md` stays at root so it keeps auto-loading.
- **[Claude]** Updated all cross-references (app/backend READMEs, `CLAUDE.md` pointer
  list, the `technical.md` repo-structure diagram) to the new `docs/` paths.

### Docs deepened — beginner-friendly learning notes + commit preference
- **[Claude]** Rewrote every `learning.md` concept to be understandable by a total
  beginner — defining jargon, adding analogies and concrete examples.
- **[Keyshawn]** Asked that commits be authored by him alone (no Claude co-author
  trailer); saved as a standing preference.

### Started building — Milestone 1: repo & dev environment
- **[Claude]** Scaffolded the monorepo skeleton: `backend/` (FastAPI folder shape
  with package `__init__.py` files) and `apps/client|driver|store/` placeholders.
- **[Claude]** Added `.gitignore` (keeps secrets + generated files out of git),
  `docker-compose.yml` (local Postgres in one command), `.env.example` (secrets
  template), and `backend/pyproject.toml` (backend dependency list).
- **[Claude]** Wrote `setup.md` — a beginner-friendly walkthrough of the whole setup
  with code and the *why* behind each file.
- **[Claude]** Started this `CHANGELOG.md`.
- _Still open in Milestone 1 (user-run):_ create virtualenv + install deps, set up
  CodeRabbit, enable branch protection on `main`.

### Finished planning — Phases 1–4 complete
- **[Claude]** Phase 4 (Execution Planning) → `execution.md`: 14 milestones broken
  into small, MVP-first tasks, ordered as vertical slices (client → driver → store).
- **[Claude]** Added a **Git & GitHub Workflow** section to `technical.md`
  (trunk-based development, short-lived feature branches, PRs, branch protection) +
  matching concept notes in `learning.md`. Added a branch-protection task to
  Milestone 1.
- **[Claude]** Phase 3 (Technical Planning) → `technical.md`: locked the stack
  (FastAPI + Postgres backend; React Native/Expo apps; Stripe Connect; JWT auth),
  tooling (CodeRabbit, PostHog, EAS), repo structure, data models, and API shape.
- **[Claude]** Phase 2 (Vision Expansion) → `vision.md`: core features, MVP scope,
  and the client/driver/store user flows. Name "Boomerang" kept.
- **[Claude]** Phase 1 (Idea Discovery) → `brainstorm.md`: the idea, problem, users,
  goals, and collaboration preferences.
- **[Claude]** Added `CLAUDE.md` so any future session can reconstruct project state.
- **[Claude]** Kept `learning.md` as a running log of concepts throughout.

---

<!--
HOW TO ADD AN ENTRY (for future sessions / your own edits):

## YYYY-MM-DD
### Short title of the chunk of work
- **[Who]** What changed, and a short why.

Add new dates at the TOP. Keep it skimmable — this is the story of the project,
not a second copy of every git commit.
-->
