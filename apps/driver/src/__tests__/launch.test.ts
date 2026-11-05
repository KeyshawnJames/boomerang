/* eslint-disable @typescript-eslint/no-require-imports -- a fresh module load needs require() */

// What the app reads from the device when it opens: the app's modules load fresh, after the
// device already holds a value.

test("a saved token opens the app signed in", () => {
  jest.isolateModules(() => {
    require("expo-secure-store").setItem("token", "saved");
    expect(require("../session").useSession.getState().token).toBe("saved");
  });
});
