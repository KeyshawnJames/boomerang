"""Drivers finding and accepting jobs (ADR 0019)."""

import re

# A Canadian postal code: H2T 1A1, with or without the space.
POSTAL_CODE = re.compile(r"([A-Z]\d[A-Z])\s?\d[A-Z]\d", re.IGNORECASE)


def postal_area(address: str) -> str:
    """The first three characters of the address's postal code (H2T), or "" if it has none."""
    matches = POSTAL_CODE.findall(address)
    return matches[-1].upper() if matches else ""
