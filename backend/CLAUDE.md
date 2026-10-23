# Backend (FastAPI)

Run everything from `backend/` with `uv run …`. Never use pip, and never activate the venv
by hand.

- Add a dependency: `uv add <pkg>` (dev: `uv add --dev <pkg>`). Commit `uv.lock`.
- Layout:
  - `app/api/`: routers, thin.
  - `app/services/`: business rules (eligibility, the status machine, matching, payments).
  - `app/models/`: SQLModel tables.
  - `app/schemas/`: request/response models.
  - `app/core/`: config, DB session, security.
- Sync SQLModel sessions, injected via a `get_session` dependency. Config comes from
  pydantic-settings, reading the root `.env`.
- Geo: PostGIS `geography(Point, 4326)` columns via GeoAlchemy2 (`sa_column=`). Proximity
  queries use `ST_DWithin`.
- Migrations: change the models, run `uv run alembic revision --autogenerate -m "…"`, **read
  the generated file** (autogenerate misses things), then run `uv run alembic upgrade head`.
- Tests: pytest against a real PostGIS container (testcontainers), never SQLite. Write the
  test first. Every endpoint gets a happy-path test plus an auth/permission test.
- Every user-facing error message the API returns has an EN and a FR version (based on the
  user's `locale`).
- After changing any route or schema, regenerate the app client: `pnpm --filter api generate`
  from the repo root, once `packages/api` exists.
