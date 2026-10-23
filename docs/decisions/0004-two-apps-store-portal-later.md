# 0004. Two Expo apps now, a web store portal later

- **Status:** accepted (replaces "three Expo apps: client, driver, store")
- **Date:** 2026-10-23

## Context

The plan had three separate Expo apps. With a carrier-first MVP (ADR 0003) the store app
isn't needed at launch. Gig marketplaces (Uber, DoorDash, Instacart) ship separate customer
and worker apps, partly because a driver app needs background location permission, which
complicates app-store review for a customer app.

## Decision

- `apps/client` and `apps/driver`: two Expo apps in a pnpm workspace, sharing a generated API
  client in `packages/api`.
- `apps/store` is removed. When partner stores arrive in phase 2, the store side is a small
  **web portal**: scanning a QR and confirming works in a browser, and it saves a third set of
  app-store listings and builds.

## Consequences

- One fewer app to build, sign and submit.
- Shared code goes into `packages/` only when both apps actually need it.
