# Apps (Expo)

Run JS commands from the repo root with pnpm (`pnpm --filter client …`). Never use npm or yarn.

- Add a dependency: `cd apps/client && npx expo install <pkg>` (dev: add `-- -D`). It picks
  the version that matches the Expo SDK. Commit `pnpm-lock.yaml`.
- **Expo Go, not development builds (ADR 0010).** Only use libraries Expo Go includes. If a
  library needs other native code, stop and raise it: switching to development builds is a
  decision.
- Before writing code against an Expo, React Native or library API, check the current docs
  (`https://docs.expo.dev/versions/v58.0.0/`, context7 or the Expo MCP), not memory.
- Layout: `src/app/` holds **routes only** (Expo Router bundles every file there, tests
  included). Tests go in `src/__tests__/`, everything else elsewhere under `src/`.
- Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test` (Jest + React Native Testing Library).
  CI runs the same three.
- Every user-facing string goes in both the `en` and `fr` locale files.
- `packages/api` is generated. Never hand-edit it; regenerate with `pnpm --filter api generate`.
