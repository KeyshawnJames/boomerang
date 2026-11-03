# 0020. Three founders: who decides what

- **Status:** accepted. Changes who the plain-English writing in [0002](0002-claude-builds-user-merges.md) is for
- **Date:** 2026-11-03

## Context

ADR 0002 was written when Boomerang was Keyshawn plus one business partner. Boomerang Returns
Inc. now has three founders, each with a set role. The repo is public, so it names roles,
not people.

## Decision

- **CEO:** strategy, pricing and the business model, finances, legal and compliance,
  investors.
- **CTO (Keyshawn):** the tech platform and its roadmap, routine technical and architecture
  decisions, infrastructure. He still plans with Claude and merges every PR (ADR 0002).
- **Chief Growth Officer:** partners, communications, user acquisition, user feedback,
  branding.
- A technical ADR needs only the CTO's OK. When Claude picks a default for a business question
  (a price, a tax, a refund rule), the ADR marks it as a placeholder for the CEO to confirm.
- PR descriptions, journal lines and ADRs are written in plain English for all three founders.

## Consequences

- Business placeholders already in the repo (the $4.99 fee, the 9:00–21:00 hours, GST/QST in
  ADR 0018) are the CEO's to confirm.
- How the code gets built doesn't change.
