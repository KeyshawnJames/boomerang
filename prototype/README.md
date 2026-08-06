# Boomerang — Prototype

Standalone interactive UI mockup used to test the product flow and generate the
screenshots used in [`presentation/`](../presentation/). This is **not** part of
the real `apps/` codebase (React Native + Expo) — it's plain React/JSX loaded
via `index.html`, kept separate so it can iterate fast without touching the
actual mobile app build.

## Files

| Path | What it is |
|------|------------|
| `index.html` | Entry point — open directly or serve statically. |
| `app.jsx` | Top-level app shell / routing between screens. |
| `screens.jsx` | The individual mocked-up screens. |
| `components.jsx` | Shared UI pieces used across screens. |
| `flow.jsx` | Client → driver → store flow wiring between screens. |
| `ios-frame.jsx` | iPhone frame chrome used to present screens realistically. |
| `tweaks-panel.jsx` | Dev-only panel for live-tweaking styles/content while mocking. |
| `landing.png` | Screenshot of the prototype landing screen. |

## Live version

Deployed at: https://boomerang-prototype.netlify.app

Referenced from the pitch deck (`presentation/README.md`) as the source for the
real UI captures used in `presentation/ui-screenshots/`.
