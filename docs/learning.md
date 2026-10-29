# Learning Log: Boomerang

Personal notes from building Boomerang: concepts, patterns, and things worth
remembering.

> Since 2026-10-23 Claude writes the code ([ADR 0002](decisions/0002-claude-builds-user-merges.md)),
> so this is now an occasional "concepts worth knowing" log rather than a running tutorial.
> The day-to-day "why" lives in PR descriptions and `decisions/`. Some notes below describe
> the earlier plan (e.g. three apps, pip): see `architecture.md` for the current setup.

## Key Concepts Learned

- **"Uber for X" / on-demand marketplace pattern:** A *marketplace* app is one that
  connects two (or more) groups of people who need each other — here, clients who
  want a return done and drivers willing to do it. "On-demand" means the matching
  happens live, right when someone asks, like hailing an Uber rather than booking a
  week ahead. The useful insight: almost every app of this shape runs into the same
  four hard problems, so once you recognize the pattern you can reuse known solutions
  instead of reinventing them. The four are: (1) **matching/dispatch** — pairing a
  request with the right nearby person; (2) **real-time tracking** — showing live
  location/status as things happen; (3) **multi-party payments** — money flowing
  between three sides (client pays, platform takes a cut, driver gets paid); and
  (4) **trust/chain-of-custody** — proving the handoff actually happened so nobody
  can cheat or wrongly claim something went missing.

- **Native vs cross-platform mobile:** To build a phone app you pick one of two
  routes. **Native** means writing a *separate* app for each platform in that
  platform's own language — Swift for iPhone, Kotlin for Android — which looks and
  feels the most "right" on each but means building and maintaining everything
  *twice*. **Cross-platform** (React Native + Expo, or Flutter) means writing the app
  *once* in a single codebase that runs on both iPhone and Android — far faster to
  build and maintain, with the trade-off that you can occasionally lag a few months
  behind the newest platform-specific design features. For a first app that needs to
  reach both app stores without doubling the work, cross-platform (we chose React
  Native + Expo) is the pragmatic pick.

- **Liquid Glass is native-only:** "Liquid Glass" is Apple's newest visual style —
  that frosted, translucent, glassy look — and it's built into Apple's *native* iOS
  toolkit (SwiftUI) only. Because we're using React Native (cross-platform), we can
  get *close* to that look using blur/glass helper libraries, but we won't match it
  pixel-for-pixel. The takeaway decision: chasing a perfect Liquid Glass look would
  mean building a whole separate native iOS app, and that's not worth it for a first
  project — "close enough" is the right call here.

- **Relational vs document database:** A *database* is where the app stores its data
  permanently. There are two broad families. A **relational** database (like
  PostgreSQL, which we're using) stores data in tables — like linked spreadsheets —
  and is great when your data is heavily *interconnected* and you care about those
  connections: a return belongs to a client, links to a store, has payments and
  status events attached, etc. A **document** database (like MongoDB) stores each
  record as a self-contained blob (like a folder of JSON files) and shines when
  records are loosely structured and mostly stand on their own. Boomerang's data is a
  web of relationships (users ↔ returns ↔ payments ↔ stores), so relational fits.

- **Stripe Connect:** Stripe is a service that handles taking payments online so you
  don't have to deal with banks and card networks yourself. Regular Stripe handles a
  simple one-to-one charge (customer pays you). **Stripe Connect** is the version
  built for *marketplaces*, where money has to split three ways: the client pays a
  fee, the platform (Boomerang) keeps a cut, and the rest is paid out to a third party
  (the driver). Connect manages that whole flow, including paying drivers. Useful
  specifics for us: it uses "Express accounts" (Stripe handles the driver's signup and
  identity checks for us), it supports Canada, and "Instant Pay" lets drivers cash out
  in ~30 minutes instead of waiting days.

- **Backend-as-a-Service (BaaS), e.g. Supabase:** The "backend" is the behind-the-
  scenes half of an app — the server, the database, the login system — that the phone
  app talks to. A **Backend-as-a-Service** is a company that *rents* you a ready-made
  backend: database, user login, auto-generated APIs, file storage, all pre-built and
  hosted for you (Supabase and Firebase are the popular ones). It's fantastic when you
  want to skip writing a backend and just ship. We deliberately *skipped* it for
  Boomerang because the whole point here is to *learn* how a backend works by building
  the FastAPI one ourselves — a BaaS would hide exactly the parts we want to
  understand. Lesson worth keeping: a BaaS is a *time-saver*, not a *learning* tool.
  Update (2026-10-29): we now *host* on Supabase, but only as a plain database and photo
  store. Login and all the logic still live in our FastAPI backend (ADR 0009).

- **Where a database "lives" (and "hosting"):** Your app code (the FastAPI backend)
  and your database (PostgreSQL) are two *separate* programs that talk to each other —
  the code asks, the database stores and answers. While building on your own computer,
  you run the database locally (via Docker). But when the app goes live for real users
  it needs to run on a computer that's always on, backed up, and reachable from the
  internet — that's what a **managed host** provides (services like Supabase or AWS RDS run
  Postgres for you so uptime and backups aren't your manual chore). We picked Supabase,
  in its Montreal region, on the free plan until launch (ADR 0009).

- **JWT auth (and what "auth" means):** "Auth" covers two things — *authentication*
  (proving who you are, i.e. logging in) and *authorization* (what you're allowed to
  do once in). A **JWT** (JSON Web Token) is the common way to handle this: when you
  log in successfully, the server hands your app a *token* — basically a tamper-proof
  digital wristband that says "this is user #42, role: driver." Your app then attaches
  that token to every later request, so the server knows who's asking without making
  you log in again each time. It's "signed" by the server, meaning the server can
  detect if anyone tampered with it. We're building this ourselves in FastAPI (instead
  of using a paid service like Clerk that hides it) precisely because it's a
  foundational thing worth understanding.

- **Tailwind / NativeWind (how the apps get styled):** "Styling" is how you control
  what things look like — colors, spacing, sizes. The old-school way keeps style rules
  in a separate place from the thing they style. **Tailwind** is a popular alternative
  called "utility-first": you attach lots of tiny pre-named classes *directly* onto the
  element, where each class does one small thing. For example
  `className="flex-1 bg-blue-500 p-4"` reads as "fill the available space, blue
  background, add padding." **NativeWind** is the library that brings Tailwind into
  React Native. Many people find it easier because the styling sits right next to the
  thing it affects, so you don't bounce between two files to understand one button.

- **What a "branch" even is (and branching strategies):** Git lets you make a
  *branch* — a parallel copy of the whole project where you can experiment without
  touching the working version everyone relies on. Think of `main` as the clean,
  published version of a document, and a branch as "Save As… my-draft" where you
  scribble freely; when the draft is good, you merge it back into the original. A
  *branching strategy* is just the team's agreed rules for how those drafts flow
  back into `main`. Two common ones:
    - **Gitflow** — keeps several long-lived branches (`develop`, `release`,
      `hotfix`) running at once. Powerful, but it's a lot of machinery, designed for
      big companies that ship numbered versions (v1.2, v1.3…) to lots of customers.
    - **Trunk-based development** — keeps *one* permanent branch (`main`) that's
      always in a working, shippable state. For each new piece of work you branch
      off, do the work, merge back quickly (within a day or two), and delete the
      branch. Far simpler.
  For a 1–2 person app, trunk-based wins — Gitflow's extra branches would just be
  overhead you'd never actually use. (Boomerang's exact rules: `architecture.md` → Git
  & GitHub Workflow.)

- **Pull Request (PR) — the "please review and merge my draft" button:** A PR is how
  you propose merging your branch into `main` on GitHub. Despite the name, nothing is
  "pulled" by you — you're *asking* for your changes to be pulled in. It opens a page
  showing exactly what you changed (every added/removed line, highlighted), where
  people (and bots) can comment before it's accepted. Why bother when you could merge
  directly? Three reasons: (1) it's a safety gate — a chance to catch mistakes before
  they hit the always-working `main`; (2) your business partner can see what changed;
  (3) CodeRabbit (the AI reviewer) automatically reads it and leaves feedback, which
  is genuinely a teaching moment. Rule of thumb: keep PRs *small* — one feature each.
  A small PR is easy to review and easy to learn from; a giant one hides bugs and is
  exhausting to read.

- **Squash-merge — "tidy up the draft into one clean entry":** While working on a
  branch you'll often make lots of little messy commits ("wip", "fix typo", "actually
  fix it"). When you finally merge the PR, *squashing* mashes all those little commits
  into a single clean one on `main`. So `main`'s history reads like a tidy table of
  contents — one entry per feature — instead of every scribble you made along the way.
  Your messy steps still happened; they just don't clutter the permanent record.

- **Branch protection — a lock that enforces the rules:** "Never commit directly to
  `main`" is a good rule, but a rule you can break by accident is fragile. Branch
  protection is a GitHub setting that makes the rule *physically enforced*: it refuses
  any direct change to `main` and requires everything to go through a PR first. It
  turns a personal promise ("I'll be careful") into a guardrail the tooling won't let
  you cross — which is exactly what you want as a beginner, because the most dangerous
  mistakes are the accidental ones.

- **`.env` vs `.env.example` — keeping secrets out of GitHub:** Your app needs secret
  values to run: the database password, payment (Stripe) keys, the key used to sign
  login tokens. These must NEVER end up on GitHub — even a private repo is the wrong
  place, because secrets leak the moment the repo is shared, cloned, or made public by
  mistake. The standard solution is two files:
    - `.env` — holds the *real* secret values. It's listed in `.gitignore`, so git
      pretends it doesn't exist and it never gets uploaded. It lives only on your
      machine.
    - `.env.example` — a *template* that's safe to commit. It lists the same setting
      *names* but with blank or fake values, e.g. `JWT_SECRET=change-me`. Its job is
      to tell anyone setting up the project, "here are the secrets you need to fill
      in," without handing over the actual values.
  So a new teammate runs `cp .env.example .env`, fills in real values, and they're
  set — and nobody's real keys ever touched GitHub. (Run instructions in `development.md`.)

- **Docker — a disposable, identical computer-in-a-box:** Our backend needs a
  PostgreSQL database to talk to. You *could* install Postgres directly on your Mac,
  but that's fiddly, leaves a service running all the time, is annoying to remove
  cleanly, and your partner would have to install the exact same version the exact
  same way (the classic "works on my machine" trap). **Docker** avoids all that by
  running software inside a **container** — a lightweight, sealed-off box holding an
  app plus everything it needs, kept separate from the rest of your computer (like a
  standardized shipping container that works the same on any ship).
    - **Image vs container:** an *image* is the frozen blueprint (e.g. `postgres:16`,
      an official pre-built snapshot you download); a *container* is a running copy
      started *from* that image. Image = cookie cutter, container = cookie.

- **`docker-compose.yml` — the recipe for our containers:** Starting a container by
  hand is a long, flag-heavy terminal command. **Docker Compose** lets you write those
  settings once in `docker-compose.yml` and then start everything with one short
  command. Our file defines a single service, `db` (Postgres 16), and the two
  non-obvious lines are:
    - `ports: "5432:5432"` — a container is sealed by default; this pokes one hole so
      the backend can reach the database. Format is `your-machine-port:container-port`,
      which is why `.env` connects at `localhost:5432` (the left number = the door on
      your side).
    - `volumes:` — a container's data normally vanishes when the container is deleted.
      A *volume* is storage kept *outside* the container, so the data (users, returns…)
      survives `docker compose down` and restarts.
  Everyday commands: `docker compose up -d` (start in background) · `docker compose
  down` (stop) · `docker compose down -v` (stop AND wipe data for a fresh start).

- **Where Docker fits in Boomerang (scope):** In *development*, Docker runs *only* the
  Postgres database; the FastAPI backend itself runs normally (not in Docker) and
  connects to it. In *production* we will NOT use this compose file — real users' data
  goes on a managed Postgres host (Neon/Railway) that handles backups and uptime for
  us. So this Docker setup is purely a local-dev convenience. (Containerizing the
  backend too is possible later, but not needed for the MVP.)

- **`pyproject.toml` — the project's labelled ingredient list:** Real projects depend
  on many outside libraries (FastAPI, the database driver, etc.). Rather than
  installing them one-by-one and hoping you remember which ones, you list them all in
  `pyproject.toml`. Think of it like a recipe's ingredient list: anyone can read it
  and recreate the exact same kitchen. One command (`pip install -e ".[dev]"`) reads
  the file and installs everything. There's usually a separate `[dev]` group for tools
  you only need *while building* (like the test runner `pytest`) but not when the app
  is actually running for real users — no reason to ship those.

- **Virtualenv — a separate toolbox per project:** Different projects often need
  *different versions* of the same library, and installing everything into one shared
  pile on your computer eventually causes collisions ("project A needs v1, project B
  needs v2"). A **virtual environment** (virtualenv) is a private, isolated Python
  setup that belongs to just one project — its own little toolbox. You "activate" it
  in your terminal, and from then on `pip install` only adds tools to *that* project's
  toolbox, leaving your system and other projects untouched. It's a folder you can
  safely delete and rebuild from `pyproject.toml` anytime.

- **`__init__.py` — the file that says "this folder is importable":** In Python, for
  one file to use code from another folder (e.g. `from app.models import User`), that
  folder has to be recognized as a *package*. The way you mark a folder as a package
  is by putting a file literally named `__init__.py` inside it — and it's allowed to
  be completely empty; its mere *presence* is the signal. That's why the backend's
  otherwise-empty folders (`core/`, `models/`, `api/`…) each already contain one: so
  that once we write real code, the different parts can import from each other.

## Patterns & Best Practices

- **Base table + role-specific profile table:** Boomerang has three kinds of people
  (clients, drivers, stores) who share a lot (everyone has a name, email, password)
  but also have role-specific details (only drivers have a vehicle and a location).
  The clean way to model that is *one* shared `User` table with a `role` field for the
  common stuff, plus a *separate* `DriverProfile` table for the driver-only fields.
  The two bad alternatives this avoids: making three near-identical user tables
  (lots of duplication), or one giant table where every driver-only column sits empty
  ("null") for clients and stores (messy and error-prone). Add role-specific tables
  only for the roles that actually need extra fields.

- **Event log / append-only status events:** A return moves through stages
  (requested → picked up → at store → refunded → done). The naive approach is a single
  `status` column you keep *overwriting* — but then you only ever know the *current*
  state and lose the history. The better pattern is **append-only**: every time the
  status changes, you *add a new row* to a `ReturnStatusEvent` table instead of editing
  an old one. Two big payoffs from one design: (1) the rows in order *are* the
  user-facing timeline, and (2) you automatically get a permanent audit trail (who did
  what, when) that's invaluable for resolving fraud disputes. The "current status" is
  simply the most recent event. ("Append-only" = you only ever add, never change or
  delete — like a ledger.)

- **Chain of custody:** Borrowed from how evidence is handled — it means having proof
  of who was holding an item at every step, with no gaps. For Boomerang, at each
  handoff (client → driver, driver → store) we capture a QR-code scan plus a
  timestamped photo. That paper trail is what protects against disputes: a driver
  falsely accused of losing an item can show the photo proving they delivered it, and
  the store can't be tricked by a "customer returned an empty box" scam because the
  item was photographed along the way. It's the "trust" leg of the four marketplace
  problems, made concrete.

- **The client app is not a trust boundary:** The eligibility questionnaire renders in
  the mobile app and shows the client an instant verdict — but the backend re-runs the
  whole evaluation on `POST /returns` before creating anything. That looks like
  pointless duplicated work until you realize *anyone can skip the app entirely* and
  post straight to the API with `attested: true`. A check that only lives in the client
  isn't a check; it's a suggestion. The general rule: validate in the client for fast,
  friendly feedback, and validate again on the server because that's the only copy an
  attacker can't edit. Same reason a disabled button is never real security.

- **Snapshot the text, not just the answer:** Each stored eligibility answer keeps a
  copy of the exact question wording the client saw, not only a foreign key to the
  question. If we reword a question next year, every historical answer would silently
  start reading as an answer to the *new* wording. An audit trail that changes after
  the fact isn't an audit trail. Same instinct as storing the price paid on an order
  line instead of joining to the product's current price.

## Mistakes / Misunderstandings

- _(none yet)_

## Reusable Knowledge for Future Projects

- The four marketplace problems (matching, real-time tracking, multi-party payments,
  trust/chain-of-custody) show up in *any* app that connects multiple sides of people.
  Keep this as a mental checklist — the next marketplace idea will hit the same four,
  and you'll already know the shape of each.
- Choose native vs cross-platform by asking "how many separate codebases can I
  realistically build and maintain?" — not by chasing the single shiniest design
  feature one platform has. For a small team, one shared codebase usually wins.
- Match your Git workflow to your team size. Trunk-based (one always-working `main` +
  small short-lived branches + pull requests) is the sane default for solo/small
  projects. Only reach for heavier systems like Gitflow when a large team shipping
  numbered releases to many customers actually needs that extra machinery.
- The "template + real file" secrets pattern (`.env.example` committed, `.env`
  gitignored) and the "list dependencies in one file" pattern (`pyproject.toml`,
  `package.json`, etc.) are universal — almost every project in every language uses
  some version of both. Learning them once pays off everywhere.
