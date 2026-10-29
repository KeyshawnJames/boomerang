import { pickLanguage } from "../i18n";
import en from "../locales/en.json";
import fr from "../locales/fr.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

test("en and fr have the same keys", () => {
  expect(keys(fr).sort()).toEqual(keys(en).sort());
});

test.each([
  ["en", "en"],
  ["fr", "fr"],
  ["es", "fr"],
  [null, "fr"],
])("device language %p shows %p", (device, shown) => {
  expect(pickLanguage(device)).toBe(shown);
});
