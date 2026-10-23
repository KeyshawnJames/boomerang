# 0002. Claude builds, Keyshawn plans and merges

- **Status:** accepted (supersedes the per-stack "guided / explain-as-you-go" modes)
- **Date:** 2026-10-23

## Context

The original plan had Keyshawn writing the backend himself, with Claude scaffolding and
checking, as a way to learn. That made progress slow, and the priority is now a working
product.

## Decision

- Claude Code writes all the code, tests and docs.
- Keyshawn and Claude plan together: scope, product behavior and trade-offs are Keyshawn's call.
- Claude opens a PR for every change. **Keyshawn merges every PR. Claude never merges.**
  A Claude Code hook enforces this by blocking `gh pr merge` and pushes to `main`.
- Commits are authored as Keyshawn, with no co-author trailer.
- Explanations go into PR descriptions and ADRs in plain English, so the business partner can
  follow along too.

## Consequences

- Much faster build. Keyshawn's review on each PR is the main quality gate besides CI and the
  AI reviewers.
- The learning log becomes occasional notes rather than a running tutorial.
