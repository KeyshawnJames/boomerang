#!/usr/bin/env bash
# PostToolUse(Edit|Write): auto-format the file Claude just edited. Never blocks.
# Format only: lint --fix would delete an import added one edit before its first use.
# lefthook runs `ruff check --fix` on the finished file at commit.
f=$(jq -r '.tool_input.file_path // ""')
case "$f" in
  */backend/*.py) (cd "${CLAUDE_PROJECT_DIR}/backend" && uv run --quiet ruff format "$f") >/dev/null 2>&1 ;;
esac
# TS/TSX formatting (prettier) is added in M3 with the first app.
exit 0
