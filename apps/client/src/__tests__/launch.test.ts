/* eslint-disable @typescript-eslint/no-require-imports -- a fresh module load needs require() */

// What the app reads from the device when it opens: each test loads the app's modules fresh,
// after the device already holds a value.

test("a saved token opens the app signed in", () => {
  jest.isolateModules(() => {
    require("expo-secure-store").setItem("token", "saved");
    expect(require("../session").useSession.getState().token).toBe("saved");
  });
});

test("a saved language wins over the device language", () => {
  jest.isolateModules(() => {
    expect(require("expo-localization").getLocales()[0].languageCode).toBe(
      "en",
    );
    require("expo-secure-store").setItem("language", "fr");
    expect(require("../i18n").default.language).toBe("fr");
  });
});
