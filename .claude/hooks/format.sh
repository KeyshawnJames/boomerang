#!/usr/bin/env bash
# PostToolUse(Edit|Write): auto-format the file Claude just edited. Never blocks.
f=$(jq -r '.tool_input.file_path // ""')
case "$f" in
  */backend/*.py) (cd "${CLAUDE_PROJECT_DIR}/backend" && uv run --quiet ruff format "$f" && uv run --quiet ruff check --fix --quiet "$f") >/dev/null 2>&1 ;;
esac
# TS/TSX formatting (prettier) is added in M3 with the first app.
exit 0
