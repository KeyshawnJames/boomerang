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
