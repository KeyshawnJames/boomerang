# Development

How to run Boomerang locally. The backend comes online in M1 and the apps in M3. Until
then, some of these commands have nothing to run yet.

## Prerequisites

- **Docker**, for the local Postgres + PostGIS database.
- **uv**: `brew install uv`. It installs Python 3.13 by itself.
- **Node 22+** and **pnpm**: `brew install pnpm`.
- **lefthook** and **gitleaks**: `brew install lefthook gitleaks`, then run `lefthook install`
  once in the repo.

## Database

```bash
docker compose up -d          # start Postgres + PostGIS on localhost:5433
docker compose down           # stop it (data persists in a Docker volume)
```

## Backend

```bash
cp .env.example .env          # first time only, then fill in values
cd backend
uv sync                       # create .venv and install locked dependencies
uv run fastapi dev app/main.py   # run the API with auto-reload
uv run pytest                 # tests (spins up a throwaway PostGIS container)
uv run ruff check . && uv run ruff format .
uv run alembic upgrade head   # apply migrations
```

## Apps

```bash
pnpm install                  # from the repo root, installs all workspaces
pnpm --filter client start    # Expo dev server for the client app
pnpm --filter api generate    # regenerate the typed API client from the backend's OpenAPI
```

The apps use **development builds**, not Expo Go.

## Why things are set up this way

- `.env` is gitignored, and `.env.example` documents every variable. Never commit secrets:
  gitleaks blocks it before each commit and in CI.
- The database runs in Docker so nothing is installed on the Mac itself. Deleting the
  container is harmless; the data lives in a named volume.
- uv's lockfile (`uv.lock`) and pnpm's (`pnpm-lock.yaml`) make every install reproducible.
