#!/usr/bin/env bash
# PreToolUse(Bash): Claude never merges PRs, pushes to main, or force-pushes (ADR 0002).
cmd=$(jq -r '.tool_input.command // ""')
block() { echo "Blocked by .claude/hooks/guard-git.sh: $1. Keyshawn merges; main is PR-only (ADR 0002)." >&2; exit 2; }

grep -qE 'gh[[:space:]]+pr[[:space:]]+merge' <<<"$cmd" && block "gh pr merge"
grep -qE 'gh[[:space:]]+api.*/merge' <<<"$cmd" && block "merge via gh api"
if grep -qE 'git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push' <<<"$cmd"; then
  grep -qE '[[:space:]](--force|--force-with-lease|-f)([[:space:]=]|$)|[[:space:]]\+[^[:space:]]' <<<"$cmd" && block "force push"
  grep -qE '[[:space:]:]main([[:space:]]|$)' <<<"$cmd" && block "push to main"
  [ "$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)" = main ] && block "push while on main"
fi
exit 0
