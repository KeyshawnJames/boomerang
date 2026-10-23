# 0008. Superpowers as the one Claude Code workflow

- **Status:** accepted
- **Date:** 2026-10-23

## Context

Several overlapping Claude Code workflow systems were installed: GSD (with about 10 hooks
firing on every tool call and about 70 commands), Superpowers, and the project-planner skill.
They give conflicting instructions for the same jobs (plan, execute, review), and Anthropic's
docs note that when instructions conflict, Claude may pick one arbitrarily. Running them all
also slows every action and adds context to every request.

## Decision

Superpowers is the only workflow framework. Each feature runs:

1. Brainstorm, only when product behavior is unclear.
2. `writing-plans`.
3. `subagent-driven-development` with test-first coding.
4. `verification-before-completion`.
5. `/code-review`, plus `/security-review` for auth and payments.
6. A PR, opened via the project's `/ship` skill.

- GSD is removed.
- The project-planner skill stays installed but is no longer referenced. The planning phases
  are done.
- claude-mem, caveman, ponytail and the design plugins stay, by choice.
- PR descriptions, journal entries and ADRs are always written in plain English, whatever the
  output-style plugins are set to.

## Consequences

- One predictable workflow and fewer hooks.
- If claude-mem's background worker causes slowdowns, it's the first thing to disable.
