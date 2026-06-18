# Changelog

> A running log of how Boomerang evolves over time — what got done, by whom, and why.
> Newest entries at the top. Both the user (Keyshawn) and Claude add entries here so
> there's a shared, human-readable record beyond raw git history.
>
> **Convention:** each dated section groups the work done that day. Tag who did it —
> **[Claude]** or **[Keyshawn]** — and keep the *why* short. Phases refer to the
> project-planner workflow (see `CLAUDE.md`). This complements git: git has every
> tiny commit; this file has the story.

---

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
