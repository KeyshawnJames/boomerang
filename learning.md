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
