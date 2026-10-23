# Boomerang — Backend (FastAPI)

The single FastAPI backend serving both apps (REST + WebSockets), backed by PostgreSQL +
PostGIS. Architecture: [`docs/architecture.md`](../docs/architecture.md). How to run it:
[`docs/development.md`](../docs/development.md).

## Folder layout
```
app/
  main.py        # FastAPI entrypoint + /health
  core/          # config, security (JWT), db session
  models/        # SQLModel tables
  schemas/       # Pydantic request/response models
  api/           # routers: auth, returns, driver, uploads, webhooks
  services/      # eligibility, status machine, matching, payments, notifications
  realtime/      # WebSocket hub
alembic/         # database migrations
tests/
```
