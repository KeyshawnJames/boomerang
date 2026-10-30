# Changelog

Generated from commit history by [git-cliff](https://git-cliff.org). Do not edit by hand; the human story is in `docs/JOURNAL.md`.

## m3 — 2026-10-30

### Features
- **client:** login and register screens (#39) (5c0bc41)
- **api:** generated typed API client (#38) (107f5cc)
- **client:** EN/FR localization with French fallback (#37) (ab27ae8)
- **client:** NativeWind v4 and base theme (#36) (79bf122)

### Chores
- **client:** pnpm workspace and Expo SDK 58 client app (#35) (f9de624)
## m2 — 2026-10-29

### Features
- **backend:** JWT auth and role guards (#33) (5b0fd45)
- **backend:** Montreal seed data (#32) (6b8b2ea)
- **backend:** eligibility, payment and rating models (#31) (ff36c77)
- **backend:** core models and migration (#30) (c785b15)

### Chores
- **release:** m2 (#34) (650194a)
## m1 — 2026-10-29

### Features
- **backend:** database session, Alembic and PostGIS test container (#29) (aa529fa)
- **backend:** add FastAPI app with /health and settings (#26) (04efa56)
- **prototype:** replace fake eligibility screen with real questionnaire (1d3f7f1)
- **docs:** add return eligibility questionnaire (attestation gate) (1424b1a)
- complete execution planning phase (execution.md) (ddc6281)
- complete technical planning phase (technical.md) + start learning log (f291992)
- complete vision expansion phase (vision.md) (ff8b549)
- complete idea discovery phase (brainstorm.md) (748dd34)

### Docs
- host the database and photos on Supabase in Montreal (#28) (42802b4)
- reset plan for carrier-first MVP and Claude-built workflow (#1) (862d5fd)
- add root README with project overview (eafbc26)
- update project status for session resume (mid-Milestone 1) (de57ae1)
- expand Docker explanation in learning log (e6d7ad6)
- consolidate planning markdown into docs/ folder (8c890cc)
- rewrite all learning.md concepts to be beginner-friendly (5951405)
- expand learning.md setup/git concepts for beginners (dcac771)
- add setup.md walkthrough + CHANGELOG.md, log setup concepts (e8f44c6)
- add main branch protection task to Milestone 1 (cb9c43f)
- add Git/GitHub branching workflow to technical.md + learning notes (131b785)
- mark Phase 3 complete in CLAUDE.md status (0aba7fc)
- finalize tech tooling decisions, add structure + architecture diagrams (f7f593a)
- add CLAUDE.md project context for session continuity (cd22561)

### Chores
- add repo tooling, CI, guardrail hooks and uv backend (#2) (0ab87ff)
- clean up repo root, add prototype folder (e7c1163)
- scaffold monorepo skeleton (backend + three Expo app folders) (3142b86)
