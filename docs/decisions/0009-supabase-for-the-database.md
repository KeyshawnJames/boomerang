# 0009. Supabase (Canada region) for the database and photos, free until launch

- **Status:** accepted
- **Date:** 2026-10-29

## Context

[ADR 0007](0007-quebec-residency-and-compliance.md) requires personal data to live in AWS
ca-central-1 (Montreal) and left two database candidates open: Supabase or AWS RDS.
[ADR 0005](0005-stack-updates-2026-10.md) put photos in S3.

We want everything free until launch. AWS's free plan for new accounts is now a credit
(US$100–200) that closes the account after six months unless it's upgraded, so it doesn't
work as a long-running free option. Supabase's free plan has no time limit, and it offers
Canada (Central), ca-central-1, which is AWS Montreal.

## Decision

**Database:** Supabase Postgres + PostGIS in **Canada (Central), ca-central-1**, on the free
plan until launch.

**Photos:** Supabase Storage in the same project, uploaded through signed upload URLs. This
replaces S3 from ADR 0005. A local folder is still used in development.

**Supabase is used as plain infrastructure, nothing more:**

- Auth stays in our FastAPI backend (PyJWT, ADR 0005).
- The **Data API (PostgREST) is turned off**. Only our backend talks to the database. If it
  were left on, tables we create could be readable with Supabase's public key.
- Schema changes go through Alembic, not the Supabase dashboard.
- Because it's standard Postgres, PostGIS and S3-style storage, moving to AWS RDS and S3
  later is a data copy, not a rewrite.

**Free until launch:** local development and tests run on Docker PostGIS (testcontainers),
so nothing hosted is needed before M10. The API host is picked at M10 in its own ADR. The
leading candidate is Google Cloud Run in Montreal (northamerica-northeast1), which has a
free monthly allowance and supports WebSockets. That would change ADR 0007's "API on AWS".

## Consequences

- Free-plan limits: 500 MB database, 1 GB storage, 5 GB egress a month, no automatic
  backups, and the project pauses after 7 days without traffic. Fine for a demo.
- **Before real customers' data goes in:** move to Supabase Pro (US$25/month, backups, no
  pausing) or to RDS and S3. Cover Supabase in the privacy impact assessment as a vendor
  that processes personal data.
- **Check at sign-up:** the Canada region can be chosen on the free plan, the PostGIS
  extension can be enabled, and the Data API is off.
- Connect through Supabase's connection pooler. The direct connection is IPv6-only on the
  free plan.
