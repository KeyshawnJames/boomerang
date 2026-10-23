# 0001. Record decisions as ADRs

- **Status:** accepted
- **Date:** 2026-10-23

## Context

Decisions used to live inside the planning docs and the journal. When a decision changed, the
old reasoning got overwritten, so it was hard to tell *when* and *why* something was decided.

## Decision

Every decision that changes scope, stack, architecture or process gets a short record in
`docs/decisions/NNNN-title.md`, using a lightweight [MADR](https://adr.github.io/madr/) shape:
Context → Decision → Consequences.

- Records are append-only. To change a decision, write a new ADR that supersedes the old one
  and set the old one's status to `superseded by NNNN`.
- PRs that implement a decision link its ADR.

## Consequences

- The reasoning survives later rewrites of `architecture.md` and `roadmap.md`.
- A small overhead for each real decision. Routine changes don't need one.
