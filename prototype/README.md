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
| `screens.jsx` | The individual mocked-up screens, plus the seed data (stores, reasons, pickup windows, eligibility questions). |
| `components.jsx` | Shared UI pieces used across screens. |
| `flow.jsx` | Client → driver → store flow wiring between screens. |
| `ios-frame.jsx` | iPhone frame chrome used to present screens realistically. |
| `tweaks-panel.jsx` | Dev-only panel for live-tweaking styles/content while mocking. |
| `landing.png` | Screenshot of the prototype landing screen. |

## Client flow

Store → item details → **eligibility** → schedule → review → QR → matching →
tracking → done.

The eligibility step is the safeguard: seven questions whose answers are `pass` /
`warn` / `block`. A blocking answer refuses the return before payment and shows
self-return guidance; warnings need an explicit acknowledgment. Both states are
worth demoing — pick "Yes, I've used or worn it" to see the block. The real
version re-checks the answers server-side (see
[`docs/research/return-eligibility-attestation.md`](../docs/research/return-eligibility-attestation.md)).

## Live version

Deployed at: https://boomerang-prototype.netlify.app

Referenced from the pitch deck (`presentation/README.md`) as the source for the
real UI captures used in `presentation/ui-screenshots/`.
