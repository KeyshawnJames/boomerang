# 0014. Photos go straight to storage through short-lived signed links

- **Status:** accepted
- **Date:** 2026-10-30

## Context

A client adds two photos while booking: the return label (or QR code) and the package.
[ADR 0009](0009-supabase-for-the-database.md) already decided where photos live once we
launch: Supabase Storage in Montreal. This ADR settles how the app sends them, and what we
use until M10, while there is no Supabase project yet.

## Decision

**The app asks for a signed upload link, then sends the photo to it.**

- `POST /uploads/presign` takes the kind of photo (label or package) and its file type
  (JPEG, PNG or HEIC). It returns a **key** (the photo's name in storage) and a **link**.
- The app sends the photo to that link within **15 minutes**, with the same file type. The
  link works once, for that one photo name only, and refuses anything over **10 MB** (a
  setting). A used link can't replace the photo, which keeps it trustworthy as proof.
  Expired, altered or mismatched links are refused, with a message in French or English.
- When the client books (#46), the app sends the key, not the photo.
- Every key starts with the client's own account id, so creating a return can refuse a
  photo another client uploaded.
- Only clients can ask for links for now. Drivers' pickup and drop-off photos come at M6.

**Until M10, the link points at our own API, which saves the photo in a local folder.**

- The link carries a signed token (the same signing we use for logins, but a separate kind
  that can't pass for a login). The folder is ignored by git.
- At M10 the server asks Supabase for the link instead. The app doesn't change: it still
  asks for a link and sends the photo to whatever link it gets.

**Options we rejected**

- **MinIO** (a copy of Amazon S3 that runs in Docker). Its free Docker image is no longer
  published, so it would add a dependency we can't keep up to date.
- **Sending the photo through our API** at launch. Photos are the biggest thing the app
  sends; going straight to storage keeps that load off our server.

## Consequences

- No new service or library for dev and tests.
- The server trusts the file type the app declares; it doesn't open the photo to check it.
  Supabase works the same way.
- Nobody can view the photos yet. Showing them to drivers and clients comes with M6 and M7.
