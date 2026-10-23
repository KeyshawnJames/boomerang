# 0007. Quebec data residency and compliance rules in code

- **Status:** accepted (needs a lawyer's review before launch)
- **Date:** 2026-10-23

## Context

Boomerang launches in Montreal, so Quebec law shapes what we build:

- **Law 25:** privacy, consent, and transfers of personal data outside Quebec.
- **Charter of the French Language (Bill 96):** French availability.
- **Consumer Protection Act** (including the 2025 tipping and price-display changes).

Our sources were secondary (law firms, vendors). This ADR records the engineering
consequences we're designing for, not legal advice.

## Decision

**Hosting:** the database, API and photo storage live in **AWS ca-central-1 (Montreal)**.

- Neon, Railway and Cloudflare R2 have no Canadian region, so they're ruled out.
- Candidates at deploy time: Supabase (database only) or AWS RDS for Postgres. The API runs
  on AWS in the same region.
- Any vendor that processes personal data outside Quebec (PostHog, Expo push, Sentry) needs a
  privacy impact assessment before launch.

**Built into the code from day one:**

- **French**: the app is fully usable in French. French is the fallback when the device
  language is neither EN nor FR. CI fails if any French translation key is missing.
  Terms are shown in French first.
- **Location**: driver location tracking is off by default. It starts only during an active
  job, after an explanation screen.
- **Consent**: consent is collected separately for each purpose. Analytics (PostHog) only runs
  after explicit opt-in. Privacy-protective settings are the default.
- **Prices**: every price shown includes all fees.
- **Tips**: tip suggestions are calculated on the pre-tax amount, with equal-weight options
  and a custom amount that takes no extra steps.
- **Before launch**: publish the privacy officer's contact details, keep a privacy-incident
  register, and run a data retention and deletion job.

## Consequences

- No Neon or Railway. Slightly more setup at deploy time.
- These rules apply to every screen. They're repeated in `CLAUDE.md` so every session sees them.
