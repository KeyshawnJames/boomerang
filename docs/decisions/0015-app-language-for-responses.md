# 0015. The server answers in the language the app is showing

- **Status:** accepted
- **Date:** 2026-10-31

## Context

Each account has a profile language, chosen at sign-up. The app also has a language button
(English / Français). The button changes the app's own text but not the profile.

Testing #48 on a phone, the app was in French but the eligibility questions came back in
English. The server picked the questions' language from the profile. The same would have
happened to error messages and address suggestions in the booking flow.

## Decision

**Anything the server sends back to the app is in the language the app is showing.** The
app sends its language with every request, and the server uses that. This covers the
eligibility questions, address suggestions and every error message.

- When a return is booked, the question and answer text saved with it is copied in that
  same language, so it matches what the client read.
- If a request doesn't say which language, the server answers in French (ADR 0007).
- **The profile language is for messages sent outside the app**, such as texts and emails
  later on. Keeping it in step with the app's language button is for when those messages
  exist.

**Option we rejected**

- **Making the language button update the profile.** The button would have to wait for the
  server before the questions could reload in the new language, and it would fail with no
  connection. Letting the app say its language on every request has neither problem.

## Consequences

- Switching language in the app changes the server's text right away; the app also drops
  the questions it already loaded so they reload in the new language.
- A person whose phone is set to French but whose profile says English gets French in the
  app and English in future texts and emails until we sync the two.
