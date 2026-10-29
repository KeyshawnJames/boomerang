# 0010. Expo Go for now, development builds later

- **Status:** accepted. Partly supersedes [0005](0005-stack-updates-2026-10.md) (development builds)
- **Date:** 2026-10-29

## Context

[ADR 0005](0005-stack-updates-2026-10.md) said the apps would run as **development builds**:
a custom copy of the app that we compile ourselves (locally with Xcode/Android Studio, or in
the cloud with EAS Build). That's needed once the app uses native code that Expo's ready-made
**Expo Go** app doesn't include.

The client app's first milestone (M3: sign-up, log-in, theme, French and English) only needs
libraries that Expo Go already includes. Building our own app now would add a build step and a
wait on every native change, for no gain yet.

## Decision

- The apps run in **Expo Go** for now. Scan the QR code from `pnpm --filter client start`
  and the app opens on the phone.
- Only libraries that Expo Go includes are used. Before adding a library with native code,
  check that it works in Expo Go.
- We switch to development builds when a feature needs native code that Expo Go lacks. That
  switch gets its own ADR.

## Consequences

- No Xcode, Android Studio or EAS build is needed to try the app during M3.
- Likely triggers for the switch: push notifications on Android (M7), which Expo Go no
  longer supports, and background location for live tracking (M8). The latest by M10, since
  the store builds are development-build style anyway.
- Expo Go only runs the current Expo SDK, so the app has to stay on the SDK the store
  version of Expo Go supports (SDK 58 today).
