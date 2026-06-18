# Learning Log: Boomerang

Personal notes from building Boomerang — concepts, patterns, and things worth
remembering. Appended to continuously, not just at the end.

## Key Concepts Learned

- **"Uber for X" / on-demand marketplace pattern:** A platform that matches two+
  sides (here: clients needing returns, drivers doing them) in real time. Always
  brings the same four problems: matching/dispatch, real-time tracking,
  multi-party payments, and trust/chain-of-custody. Recognizing the pattern means
  you can borrow proven solutions instead of inventing from scratch.

- **Native vs cross-platform mobile:** Native (Swift for iOS, Kotlin for Android)
  = best/latest platform look but two separate codebases. Cross-platform (React
  Native + Expo, or Flutter) = one codebase for both, ships much faster, but can
  lag the newest native design features. For a first app shipping to both stores,
  cross-platform (RN/Expo) is the pragmatic pick.

- **Liquid Glass is native-only:** Apple's newest design language (Liquid Glass)
  is a SwiftUI/iOS feature. React Native can *approximate* a glassy look with blur
  libraries but won't match it pixel-for-pixel. Chasing it natively isn't worth a
  whole second codebase for a first app.

- **Relational vs document database:** When your data is highly interconnected
  (users ↔ returns ↔ payments ↔ stores all referencing each other), a relational
  DB like PostgreSQL fits. Document stores (e.g. MongoDB) shine for loosely
  structured, self-contained documents. Boomerang's data is relational.

- **Stripe Connect:** Stripe's product for *marketplaces* — lets the platform
  collect a payment from one party (client), take a cut (platform fee), and pay
  out a third party (driver). Different from a normal one-to-one Stripe charge.
  Uses "Express accounts" (Stripe handles driver onboarding/identity), supports
  Canada, and Instant Pay lets drivers cash out in ~30 min.

- **Backend-as-a-Service (BaaS), e.g. Supabase:** A rented, pre-built backend —
  bundles a Postgres database + ready-made auth + auto-generated APIs + file
  storage + realtime, all hosted. Great when you DON'T want to write a backend.
  We skipped it for Boomerang precisely because writing the FastAPI backend
  ourselves IS the goal — using a BaaS would duplicate and hide the parts we want
  to learn. Lesson: a BaaS is a time-saver, not a learning tool.

- **Where a database "lives":** Code (FastAPI) and the database (Postgres) are
  separate. In development you run Postgres locally (via Docker). To go live you
  need a *managed Postgres host* (Neon, Railway, or Supabase-as-just-a-DB) so
  backups/uptime aren't your manual job. This hosting choice can be deferred
  until deploy time.

- **JWT auth (rolling your own):** A JSON Web Token is a signed token the server
  gives you at login; the app sends it on each request to prove who you are
  (and, via a role claim, what you're allowed to do). Building it yourself in
  FastAPI is a well-trodden, foundational thing to learn — the alternative
  (Clerk) hides it as a black box.

- **Tailwind / NativeWind:** Tailwind is "utility-first" styling — instead of
  separate style rules, you put small classes right on the element
  (`className="flex-1 bg-blue-500 p-4"` = fill space, blue background, padding).
  NativeWind brings Tailwind to React Native. Often easier to read than RN's
  StyleSheet because the styles sit right on the component.

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
  overhead you'd never actually use. (Boomerang's exact rules: `technical.md` → Git
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
  set — and nobody's real keys ever touched GitHub. (Full walkthrough in `setup.md`.)

- **Docker / docker-compose — a disposable, identical computer-in-a-box:** Your
  backend needs a PostgreSQL database to talk to. You *could* install Postgres
  directly on your Mac, but that's fiddly to set up, easy to misconfigure, and a pain
  to fully remove later. **Docker** solves this by running software inside a
  *container* — a lightweight, sealed-off mini-environment that's separate from the
  rest of your computer. **docker-compose** is a way to describe the containers you
  want in a single file (`docker-compose.yml`), then start them all with one command
  (`docker compose up -d`) and stop them with another (`docker compose down`). The big
  win: it's *reproducible and disposable*. Everyone on the project gets a byte-for-byte
  identical Postgres with one command, and if it ever gets messed up you just delete
  the container and recreate it — no trace left on your actual machine. (The word
  "image" you'll see, e.g. `postgres:16`, is the pre-built blueprint a container is
  started from.)

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

- **Base table + role-specific profile table:** One `User` table with a `role`
  field, plus a separate `DriverProfile` for driver-only fields, instead of three
  user tables or one bloated table full of nulls.

- **Event log / append-only status events:** Instead of overwriting a single
  `status` column, write a new `ReturnStatusEvent` row on every transition. You
  get the user-facing timeline AND an audit/anti-fraud trail from the same table;
  current status = the latest event.

- **Chain of custody:** QR code + timestamped photo at every handoff proves which
  item moved and that it reached the store — protects against "driver lost it" and
  "customer returned an empty box" disputes.

## Mistakes / Misunderstandings

- _(none yet)_

## Reusable Knowledge for Future Projects

- The four marketplace problems (matching, real-time, payments, trust) recur in
  any multi-sided app — this mental checklist transfers to the next idea.
- Decide native vs cross-platform by counting codebases you can realistically
  maintain, not by chasing the shiniest design feature.
- Match your Git workflow to team size: trunk-based + short-lived feature branches
  + PRs is the sane default for small projects; reach for heavier models like
  Gitflow only when a large team and versioned releases actually demand it.
