# 0006. Make the repository public

- **Status:** accepted
- **Date:** 2026-10-23

## Context

On the GitHub Free plan, private repos can't use branch protection or rulesets (the API
returns 403). The options were GitHub Pro, local-only guardrails, or going public.

## Decision

The repo is public. That gives us, at no cost: rulesets on `main`, secret scanning with push
protection, and unlimited CI minutes. Before the flip:

- Business strategy docs were moved to `docs/private/` (gitignored, local only) and purged
  from git history.
- Commit author emails were rewritten to the GitHub noreply address.
- The full history was scanned with gitleaks (clean).

There's no LICENSE file, so the code stays **all rights reserved**: visible, but not licensed
for reuse.

## Consequences

- Anyone can read the code and the product docs. The business moat (retailer relationships,
  the policy data, partner strategy) stays out of the repo.
- `docs/private/` and `presentation/` exist only on Keyshawn's machine, so they need their own
  backup (a private repo or Drive).
- Nothing sensitive goes into the repo from here on. gitleaks runs before each commit and in CI.
