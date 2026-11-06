import i18n from "./i18n";

// Pickups happen in Montreal, so times read in its zone whatever the phone is set to.
const ZONE = "America/Toronto";
const DAY = 24 * 60 * 60 * 1000;

const locale = () => `${i18n.language}-CA`;

export function money(cents: number): string {
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

// "Today, 4:00 p.m. – 6:00 p.m." (same rules as the client app's slotLabel).
export function windowLabel(start: string, end: string, now = new Date()) {
  const from = new Date(start);
  const weekday = from.toLocaleDateString(locale(), {
    timeZone: ZONE,
    weekday: "long",
  });
  const name =
    day(from) === day(now)
      ? i18n.t("time.today")
      : // Back from the window, not forward from now: windows are daytime, so a DST
        // hour can't push this across midnight.
        day(new Date(from.getTime() - DAY)) === day(now)
        ? i18n.t("time.tomorrow")
        : weekday[0].toUpperCase() + weekday.slice(1);
  return `${name}, ${time(start)} – ${time(end)}`;
}
