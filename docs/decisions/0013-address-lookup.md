# 0013. Pickup addresses are looked up by the server, through Google Places

- **Status:** accepted (the service-area radius is a placeholder until the business sets it)
- **Date:** 2026-10-29

## Context

A client types their pickup address while booking. We need three things from that:

- suggestions while they type, so the address is spelled the way a map knows it;
- the exact point on the map, so a driver can find the door;
- proof that the point is real and inside the area we serve. If the app sent its own
  coordinates, anyone could book from anywhere by sending made-up numbers.

## Decision

**The server does the lookup, with Google Places (New).**

- `GET /addresses/autocomplete` returns suggestions as the client types. They're limited to
  Canada and favour addresses near downtown Montreal.
- `GET /addresses/resolve` takes the suggestion the client picked and asks Google for its
  full address and coordinates.
- The Google key stays on the server, so it never ships inside the app where anyone could
  copy it.
- The app sends one "session" number with every call in a search. Google then bills the
  search as one: at most 12 suggestion calls are charged per search, the rest are free, and
  the final lookup is charged at the cheapest level (address and coordinates only).

**The server checks the service area and vouches for the address.**

- The point must be within **15 km of downtown Montreal** (a setting). That circle stands in
  for the island of Montreal from [ADR 0012](0012-booking-rules.md): it also takes in nearby
  parts of Laval and Longueuil, and misses the far west of the island. A real map outline can
  replace it later.
- Outside the area, the client gets a clear message in French or English.
- It must be a real street address (with a house number), not a city, a street or a
  neighbourhood, so the driver has a door to go to. Suggestions only offer street addresses,
  and the server checks again when the client picks one.
- Inside it, the server hands back a signed **address token**. It holds the address and
  coordinates, works only for the client it was made for, and expires after one hour. Creating
  a return (#46) accepts the token instead of an address, so the app can't change the
  coordinates, and we don't pay Google for a second lookup.
- An address token can't be used to log in, and a login token can't pass for an address token.

**Options we rejected**

- **Geocoding on the phone** (the phone's built-in address lookup). On Android it needs
  location permission, and asking for location just to type an address is a bad first
  impression. Its coordinates would also come from the app, which we can't trust.
- **Canada Post AddressComplete.** It keeps the data in Canada and knows Canadian addresses
  well. Google's free monthly usage and its documentation won for the MVP. If the privacy
  review below goes badly, this is the fallback.

## Consequences

- Google receives what the client types and the address they choose. Google is added to the
  list of vendors that need a Law 25 privacy impact assessment before launch
  ([ADR 0007](0007-quebec-residency-and-compliance.md)). We don't store anything at Google.
- Google costs money past the free tier. The key is restricted to Places API (New) and gets a
  daily cap (#43), so a bug or an abusive user can't run up a large bill.
- Tests use a fake Google, so they run without a key or network.
