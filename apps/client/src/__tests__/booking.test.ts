import { price, sameSlot, slotLabel } from "../booking";
import i18n from "../i18n";

const NOW = new Date("2026-10-31T14:07:00-04:00");
const ASAP = {
  start: "2026-10-31T14:07:00-04:00",
  end: "2026-10-31T16:07:00-04:00",
  asap: true,
};
const TODAY = {
  start: "2026-10-31T16:00:00-04:00",
  end: "2026-10-31T18:00:00-04:00",
  asap: false,
};
// The day after the clocks go back: still the next day in Montreal.
const TOMORROW = {
  start: "2026-11-01T09:00:00-05:00",
  end: "2026-11-01T11:00:00-05:00",
  asap: false,
};

beforeEach(() => i18n.changeLanguage("en"));

test("a price includes the currency the Canadian way", () => {
  expect(price(499)).toBe("$4.99");
  i18n.changeLanguage("fr");
  expect(price(499)).toMatch(/^4,99\s\$$/);
});

test("slots say today or tomorrow, in Montreal time", () => {
  expect(slotLabel(TODAY, NOW)).toMatch(/^Today, 4:00\sp\.m\. – 6:00\sp\.m\.$/);
  expect(slotLabel(TOMORROW, NOW)).toMatch(/^Tomorrow, 9:00\sa\.m\./);
  expect(slotLabel(ASAP, NOW)).toMatch(
    /^As soon as possible, by 4:07\sp\.m\.$/,
  );
  i18n.changeLanguage("fr");
  expect(slotLabel(TODAY, NOW)).toMatch(/^Aujourd'hui, 16\sh\s00 – 18\sh\s00$/);
});

test("tomorrow is still tomorrow the night the clocks go forward", () => {
  const night = new Date("2026-03-07T23:30:00-05:00");
  const sunday = {
    start: "2026-03-08T09:00:00-04:00",
    end: "2026-03-08T11:00:00-04:00",
    asap: false,
  };
  expect(slotLabel(sunday, night)).toMatch(/^Tomorrow, /);
});

test("a later day is named, capitalized", () => {
  const monday = { ...TOMORROW, start: "2026-11-02T09:00:00-05:00" };
  expect(slotLabel(monday, NOW)).toMatch(/^Monday, /);
  i18n.changeLanguage("fr");
  expect(slotLabel(monday, NOW)).toMatch(/^Lundi, /);
});

test("the phone's own time zone doesn't change the times", () => {
  const zone = process.env.TZ;
  process.env.TZ = "Asia/Tokyo";
  try {
    expect(slotLabel(TODAY, NOW)).toMatch(/^Today, 4:00\sp\.m\./);
  } finally {
    process.env.TZ = zone;
  }
});

test("ASAP is the same slot even though its start moves", () => {
  expect(sameSlot(ASAP, { ...ASAP, start: "2026-10-31T14:20:00-04:00" })).toBe(
    true,
  );
  expect(sameSlot(TODAY, { ...TODAY })).toBe(true);
  expect(sameSlot(ASAP, TODAY)).toBe(false);
  expect(sameSlot(TODAY, TOMORROW)).toBe(false);
});
