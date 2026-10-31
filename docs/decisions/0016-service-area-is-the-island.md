# 0016. The service area is the island of Montreal's real outline

- **Status:** accepted. Replaces the circle in [0013](0013-address-lookup.md)
- **Date:** 2026-10-31

## Context

[ADR 0012](0012-booking-rules.md) says we pick up on the island of Montreal. ADR 0013 stood
in for the island with a circle: 15 km around downtown. In the first real test, a West Island
address was refused with "we only serve Montreal". The island is about 50 km long, so a
15 km circle left out Pierrefonds, Rivière-des-Prairies, Pointe-aux-Trembles and the whole
West Island. Any circle big enough to reach Senneville (32 km away) also takes in Laval,
Longueuil and Châteauguay, which aren't on the island.

## Decision

**An address is in the service area when it's inside the official outline of the
agglomeration of Montreal.** That's the whole island plus the islands that belong to it:
Île Bizard, Nuns' Island, Île Sainte-Hélène, Île Notre-Dame and Île Dorval. Laval, the South
Shore, Île Perrot and Repentigny are outside.

- The outline comes from the City of Montreal's open data ("Limites administratives de
  l'agglomération de Montréal", licence CC BY 4.0, which only asks us to credit the City).
- We merged the 19 boroughs and 15 cities into one shape and simplified it to about 20 m.
  We also widened it by 150 m so an address right on the shore isn't refused. It's a small
  file in the code (`backend/app/services/montreal.wkt`), so no setting is involved.
- Address suggestions still favour places within 35 km of downtown, which reaches both
  ends of the island.

**Option we rejected**

- **A bigger circle.** It's one number to change, but it would let through bookings from
  Laval and the South Shore, which drivers wouldn't expect to cover.

## Consequences

- Clients anywhere on the island can book; nobody off it can.
- Growing to Laval or the South Shore later means adding their outlines, not changing a
  number.
- The radius setting (`SERVICE_AREA_RADIUS_M`) is gone. If it's still in your `.env`, it's
  ignored.
