# Boomerang — Backend (FastAPI)

The single FastAPI backend serving all three apps (REST + WebSockets), backed by
PostgreSQL. See `../technical.md` for architecture and `../execution.md` for tasks.

## Folder layout
```
app/
  main.py        # FastAPI entrypoint + /health
  core/          # config, security (JWT), db session
  models/        # SQLModel tables
  schemas/       # Pydantic request/response models
  api/           # routers: auth, returns, drivers, stores, webhooks
  services/      # matching, payments, notifications
  realtime/      # WebSocket hub
alembic/         # database migrations
tests/
```

## Local dev (filled in as we build)
1. Start Postgres:  `docker compose up -d`  (from the repo root)
2. Create a virtualenv and install deps:  `pip install -e ".[dev]"`
3. Copy `../.env.example` to `../.env` and fill values
4. Run the API:  `uvicorn app.main:app --reload`
