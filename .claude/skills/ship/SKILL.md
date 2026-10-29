---
name: ship
description: Open a pull request for the current Boomerang branch the house way — run the checks, add the docs/JOURNAL.md line, fill the PR template. Use whenever work on a branch is ready for Keyshawn's review. Also covers closing a milestone (changelog + tag).
---

# /ship

Never merge, push to `main`, or force-push. A hook blocks these, and Keyshawn merges
(ADR 0002).

## Open a PR

1. **Preconditions.**
   - You're on a `type/area-desc` branch, not `main`.
   - All work is committed.
   - The branch is up to date with `origin/main` (`git fetch && git rebase origin/main`).
2. **Run the checks for every area the branch touches.** Stop and fix anything that fails.
   - backend: `cd backend && uv run ruff check . && uv run ruff format --check . && uv run pytest`
   - secrets: `gitleaks git --log-opts="origin/main..HEAD" --redact`
3. **Docs that must move with the code:**
   - Did this change make a decision (scope, stack, architecture, process)? Then an ADR
     exists in `docs/decisions/`.
   - Did the stack, structure or status change meaningfully? Then `README.md` is updated.
   - Did an API route or schema change? Then the generated client in `packages/api` is
     regenerated.
4. **Journal.** Add one line to `docs/JOURNAL.md` under today's `## YYYY-MM-DD` heading at the
   top. Create the heading if it's missing.
   - Format: `- **[Claude]** <what changed and why, in plain English> (#<issue>)`
   - Commit it as `docs: journal entry for <topic>`.
5. **Push and open the PR.**
   - Push: `git push -u origin HEAD`.
   - Run `gh pr create` with a **Conventional Commit title**, since it becomes the commit on
     `main`.
   - Fill every section of `.github/pull_request_template.md`.
     - **What** and **Why**: plain English for a non-developer.
     - **Closes #N**: the issue number.
     - **Decisions**: the ADR links.
     - **How it was tested**: the commands you actually ran and their results.
     - **Journal**: the line you added.
   - End the body with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
6. **Report.**
   - Run `gh pr checks <n> --watch` and report the PR URL and CI result.
   - If CodeRabbit or Claude review comments arrive, triage them: fix what's right, and
     reply with your reasoning to what isn't.

## Close a milestone

Do this when the last issue in milestone `mN` is merged.

1. Branch from fresh main: `git fetch && git switch -c chore/release-mN origin/main`.
2. Regenerate the changelog: `git cliff --tag mN -o CHANGELOG.md`.
3. Update the "Current status" section of `docs/roadmap.md`.
4. Add a JOURNAL line summarizing the milestone.
5. Open the PR with the title `chore(release): mN`.
6. After Keyshawn merges it, tag the merge commit. Use `gh api` so no `git push` is needed:
   `gh api repos/KeyshawnJames/boomerang/git/refs -f ref=refs/tags/mN -f sha=$(git rev-parse origin/main)`.
   Run `git fetch` first so `origin/main` is the merge commit.
