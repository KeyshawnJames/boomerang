#!/usr/bin/env bash
# PreToolUse(Bash): Claude never merges PRs, pushes to main, or force-pushes (ADR 0002).
cmd=$(jq -r '.tool_input.command // ""')
block() { echo "Blocked by .claude/hooks/guard-git.sh: $1. Keyshawn merges; main is PR-only (ADR 0002)." >&2; exit 2; }

# Check each command segment on its own, so text elsewhere (e.g. a PR body) can't trigger it.
while IFS= read -r seg; do
  grep -qE '^[[:space:]]*gh[[:space:]]+pr[[:space:]]+merge' <<<"$seg" && block "gh pr merge"
  grep -qE '^[[:space:]]*gh[[:space:]]+api.*/merge' <<<"$seg" && block "merge via gh api"
  grep -qE '^[[:space:]]*git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push' <<<"$seg" || continue
  grep -qE '[[:space:]](--force|--force-with-lease|-f)([[:space:]=]|$)|[[:space:]]\+[^[:space:]]' <<<"$seg" && block "force push"
  grep -qE '[[:space:]:]main([[:space:]]|$)' <<<"$seg" && block "push to main"
  [ "$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)" = main ] && block "push while on main"
done < <(sed -E 's/(&&|\|\||;|\||\(|\))/\n/g' <<<"$cmd")
exit 0
