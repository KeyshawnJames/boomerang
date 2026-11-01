import type { BookingOptionsData, PickupSlot } from "api";
import { bookingOptionsOptions } from "api/react-query";

import i18n from "./i18n";

// Pickups happen in Montreal, so times read in its zone whatever the phone is set to.
const ZONE = "America/Toronto";
const DAY = 24 * 60 * 60 * 1000;

const locale = () => `${i18n.language}-CA`;

export function price(cents: number): string {
  return (cents / 100).toLocaleString(locale(), {
    style: "currency",
    currency: "CAD",
  });
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(locale(), {
    timeZone: ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

// The calendar day in Montreal, only for comparing.
function day(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: ZONE });
}

// "Today, 4:00 p.m. – 6:00 p.m."; ASAP shows when it ends, since it starts now.
export function slotLabel(slot: PickupSlot, now = new Date()): string {
  if (slot.asap) return i18n.t("time.asap", { end: time(slot.end) });
  const start = new Date(slot.start);
  const weekday = start.toLocaleDateString(locale(), {
    timeZone: ZONE,
    weekday: "long",
  });
  const name =
    day(start) === day(now)
      ? i18n.t("time.today")
      : // Back from the slot, not forward from now: slots are daytime, so a DST hour
        // can't push this across midnight.
        day(new Date(start.getTime() - DAY)) === day(now)
        ? i18n.t("time.tomorrow")
        : weekday[0].toUpperCase() + weekday.slice(1);
  return `${name}, ${time(slot.start)} – ${time(slot.end)}`;
}

// ASAP's start is "now", which moves on every fetch, so it matches by kind.
export function sameSlot(a: PickupSlot, b: PickupSlot): boolean {
  return a.asap === b.asap && (a.asap || a.start === b.start);
}

// Windows are asked for this carrier near this address (ADR 0017). Both are set by the steps
// before the time step; the draft empties once a return is booked, so the query waits then.
export function bookingOptionsQuery(draft: {
  carrier: BookingOptionsData["query"]["carrier"] | null;
  address: { token: string } | null;
}) {
  const { carrier, address } = draft;
  return {
    ...bookingOptionsOptions({
      query: { carrier: carrier!, address_token: address?.token ?? "" },
    }),
    enabled: !!carrier && !!address,
  };
}
