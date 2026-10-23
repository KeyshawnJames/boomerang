# Setup & Scaffolding — Explained

> A plain-language walkthrough of how the Boomerang repo is set up and **why** each
> piece exists. Written for someone learning this for the first time. As the project
> grows, new setup steps get appended here so it stays a complete "how does this
> project work" reference. (Concepts live in `learning.md`; what-changed-when lives
> in `CHANGELOG.md`; this file is the "how it's wired" doc.)

---

## The big picture: a monorepo

Everything lives in **one** git repository (a "monorepo"): the backend and all three
mobile apps. The alternative would be four separate repos. One repo is simpler for a
solo/small team — one place to clone, one history, easy to change the backend and an
app together in a single commit.

```
boomerang/
├── .gitignore          # what git should ignore
├── .env.example        # template for secrets (committed)
├── .env                # real secrets (NOT committed — gitignored)
├── docker-compose.yml  # spins up a local Postgres database
├── backend/            # the FastAPI backend
└── apps/
    ├── client/         # Expo app — built 1st
    ├── driver/         # Expo app — built 2nd
    └── store/          # Expo app — built 3rd (minimal)
```

---

## 1. `.gitignore` — what git should never track

Git tracks files so they end up on GitHub. Some files should **never** go there:

- **Secrets** (`.env`) — passwords and API keys. Putting these on GitHub, even a
  private repo, is the #1 beginner security mistake.
- **Generated junk** (`__pycache__/`, `node_modules/`) — rebuilt automatically;
  committing them bloats the repo for no reason.
- **OS/editor files** (`.DS_Store`, `.vscode/`) — personal to your machine.

The one clever line:

```gitignore
.env            # ignore the real secrets file...
.env.*          # ...and variants like .env.local...
!.env.example   # ...but DO track the template (the ! means "un-ignore")
```

So `.env` stays private while `.env.example` (the safe template) is shared.

---

## 2. `.env` vs `.env.example` — the secrets pattern

This pattern is everywhere in professional projects, so it's worth internalizing:

| File | Contains | Committed to git? |
|------|----------|-------------------|
| `.env.example` | The **names** of the secrets, with blank/fake values | ✅ Yes (it's a template) |
| `.env` | The **real** values (DB password, Stripe keys) | ❌ No (gitignored) |

**Why two files?** A teammate cloning the repo needs to know *which* secrets the app
expects — but you can't hand them the real values through GitHub. So `.env.example`
documents the shape, and each person copies it to their own `.env` and fills in real
values. Our `.env.example`:

```bash
DATABASE_URL=postgresql+psycopg://boomerang:boomerang@localhost:5432/boomerang
JWT_SECRET=change-me
# ...Stripe keys left blank until Milestone 8
```

To start working you'd run `cp .env.example .env` and edit `.env`.

---

## 3. `docker-compose.yml` — a throwaway local database

The backend needs PostgreSQL to talk to. Rather than installing Postgres directly on
your Mac (messy to set up, messy to remove), we run it inside **Docker** — software
that runs apps in isolated "containers."

`docker-compose.yml` describes the container we want:

```yaml
services:
  db:
    image: postgres:16            # use the official Postgres v16
    environment:
      POSTGRES_USER: boomerang     # creates this user...
      POSTGRES_PASSWORD: boomerang # ...with this password...
      POSTGRES_DB: boomerang       # ...and this database
    ports:
      - "5432:5432"               # reachable at localhost:5432
    volumes:
      - boomerang_pgdata:/var/lib/postgresql/data  # keep data between restarts
```

- `docker compose up -d` → starts the database in the background.
- `docker compose down` → stops it. Data survives because of the **volume**.
- The `5432:5432` maps the container's port to your machine, so the backend connects
  at `localhost:5432` — which is exactly the `DATABASE_URL` in `.env.example`.

**Why this matters:** your database is now disposable and reproducible. Anyone on the
project gets an identical Postgres with one command, no manual install.

---

## 4. `backend/pyproject.toml` — the backend's dependency list

`pyproject.toml` is the standard Python project file. The important part is the
**dependency list** — every library the backend needs, each commented with its job:

```toml
dependencies = [
    "fastapi",          # the web framework (REST + WebSockets)
    "uvicorn[standard]",# the server that actually runs the app
    "sqlmodel",         # talk to the DB using Python classes instead of raw SQL
    "alembic",          # version-control the database schema (migrations)
    "psycopg[binary]",  # the PostgreSQL driver
    "pydantic-settings",# load config from .env safely
    "python-jose",      # create/verify JWT login tokens
    "passlib[bcrypt]",  # hash passwords (never store them in plain text)
    "python-multipart", # handle file uploads (custody photos)
]
```

There's also a `[dev]` group (pytest, ruff) for tools you only need while developing,
not in production. You install everything later with one command:
`pip install -e ".[dev]"`.

**Why list dependencies in a file** instead of installing ad-hoc? So the exact set is
reproducible — anyone can recreate your environment, and you have a record of what the
project depends on.

---

## 5. The `backend/app/` folder shape

Empty for now, but the folders map to the architecture in `technical.md`:

```
app/
  main.py     # the entrypoint — creates the FastAPI app, defines /health
  core/       # config, security (JWT), database session — the plumbing
  models/     # database tables (SQLModel classes)
  schemas/    # request/response shapes (Pydantic) — what the API accepts/returns
  api/        # the actual endpoints, grouped by area (auth, returns, drivers...)
  services/   # business logic (matching drivers, payments, notifications)
  realtime/   # the WebSocket hub for live tracking
```

Each folder has an `__init__.py` — an empty file that tells Python "this folder is a
package you can import from." Without it, `from app.models import User` wouldn't work.

**Why split it up** instead of one big file? Separation of concerns: the code that
defines the database (`models/`) is different from the code that handles a web request
(`api/`) which is different from the business rules (`services/`). Keeping them apart
makes each piece easier to find, test, and change.

---

## Where this is going (next setup steps)

The remaining Milestone 1 tasks are things **you** run locally / in the browser:

1. **Create a virtualenv + install deps** — a virtualenv is an isolated Python
   environment just for this project, so its libraries don't collide with other
   projects on your Mac. Then `pip install -e ".[dev]"`.
2. **Set up CodeRabbit** (GitHub web UI) — connect the AI reviewer to the repo.
3. **Enable branch protection on `main`** (GitHub web UI) — so all future changes go
   through a Pull Request.

After that, Milestone 2 puts the first real code in `app/main.py` (a `/health`
endpoint), and the backend actually boots.
