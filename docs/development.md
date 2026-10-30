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

### Google Places key (address lookup)

Address search needs a Google key ([ADR 0013](decisions/0013-address-lookup.md)). Tests don't.

1. In the [Google Cloud console](https://console.cloud.google.com/), create a project
   (e.g. `boomerang`) and link a billing account to it.
2. **APIs & Services → Library**: search for **Places API (New)** and enable it. Not the
   older "Places API".
3. **APIs & Services → Credentials → Create credentials → API key.** Edit the key: under
   **API restrictions**, choose *Restrict key* and tick only **Places API (New)**. Leave
   application restrictions off for now. Once the API is hosted, restrict the key to the
   server's IP address.
4. Spending guard: on the Places API (New) page, open **Quotas & system limits** and lower the
   per-day limits for Autocomplete and Place Details requests (500 a day is plenty for
   testing). In **Billing → Budgets & alerts**, add a small monthly budget with email alerts.
5. Put the key in the root `.env` as `GOOGLE_MAPS_API_KEY=…`. Never commit it.
6. Check it works: restart the API, open <http://localhost:8000/docs>, register and log in a
   client, click **Authorize** and paste the token, then try `GET /addresses/autocomplete`
   with `q=1 Place Ville Marie` and any UUID as `session`. A list of suggestions means the
   key is good.

## Apps

```bash
pnpm install                  # from the repo root, installs all workspaces
pnpm --filter client start    # Expo dev server for the client app
pnpm --filter api generate    # regenerate the typed API client from the backend's OpenAPI
```

On a phone, the app calls the API on port 8000 of the Mac that runs Metro, so start the API
with `uv run fastapi dev app/main.py --host 0.0.0.0` to make it reachable on the local network.

The apps run in **Expo Go** for now ([ADR 0010](decisions/0010-expo-go-for-now.md)): install Expo
Go on your phone, run `pnpm --filter client start`, and scan the QR code. On iOS, Expo Go only
opens the app if the same Expo account is signed in on both the phone (in Expo Go) and the Mac
(`npx expo login` once).

## Why things are set up this way

- `.env` is gitignored, and `.env.example` documents every variable. Never commit secrets:
  gitleaks blocks it before each commit and in CI.
- The database runs in Docker so nothing is installed on the Mac itself. Deleting the
  container is harmless; the data lives in a named volume.
- uv's lockfile (`uv.lock`) and pnpm's (`pnpm-lock.yaml`) make every install reproducible.
