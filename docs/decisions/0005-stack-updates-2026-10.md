# 0005. Stack updates after the October 2026 review

- **Status:** accepted
- **Date:** 2026-10-23

## Context

The stack was locked in mid-2026 before any code was written. A review against current
releases (October 2026) found several libraries that are unmaintained or superseded.

## Decision

| Area | Was | Now | Why |
|---|---|---|---|
| JWT | python-jose | **PyJWT** | python-jose is barely maintained. FastAPI's docs use PyJWT. |
| Password hashing | passlib[bcrypt] | **pwdlib[argon2]** | passlib's last release was 2020, and it breaks on Python 3.13. |
| Python tooling | pip + venv, Python ≥3.11 | **uv**, Python **3.13** | uv manages Python, the venv and a lockfile. FastAPI's template uses it. |
| Database image | postgres:16 | **postgis/postgis** | A `geography` column + `ST_DWithin` handles nearby drivers and drop-offs. |
| Expo | unspecified SDK | **SDK 58** (React Native 0.88), development builds | Current SDK. Only the New Architecture is supported now. |
| Monorepo | plain folders | **pnpm workspaces** | Expo's official monorepo guide. No Turborepo. |
| API contract | hand-written fetch client | **@hey-api/openapi-ts** + TanStack Query plugin, exact version pinned | Typed client generated from FastAPI's OpenAPI schema. |
| Maps | Google Maps or Mapbox | **react-native-maps** (Google tiles) | Mature, works on the New Architecture. Mapbox costs more for no MVP gain. |
| Stripe | Connect Express accounts | **Connect Accounts v2** (recipient configuration), separate charges and transfers | Express is now documented for existing platforms only. |
| Photos | "S3 or similar, later" | **S3 in ca-central-1**, presigned PUT uploads (local folder in dev) | Cloudflare R2 has no Canadian region (see ADR 0007). |

**Kept:** FastAPI, PostgreSQL, SQLModel (still labeled beta, but the official template uses
it), Alembic, sync DB sessions, NativeWind v4 (v5 is still a release candidate), Expo Router,
TanStack Query, Zustand, i18next, FastAPI WebSockets on a single instance (Redis only when we
run a second instance), PostHog (opt-in only), EAS, pytest.

**Testing:** pytest against a real PostGIS container (testcontainers). Jest + React Native
Testing Library for logic-heavy components. Maestro for end-to-end tests later.

## Consequences

- `backend/pyproject.toml` moves to uv with the new dependencies.
- Pin `@hey-api/openapi-ts` exactly; it's pre-1.0 and has frequent breaking changes.
- `@stripe/stripe-react-native` needs `useFrameworks: "dynamic"` on iOS in Expo.
