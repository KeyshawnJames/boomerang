// Tailwind's CSS is compiled by Metro, not Jest.
jest.mock("./src/global.css", () => ({}));

// An in-memory device keychain. jest-expo's own mock returns non-null and breaks i18n.
jest.mock("expo-secure-store", () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    setItemAsync: async (key: string, value: string) =>
      void items.set(key, value),
    deleteItemAsync: async (key: string) => void items.delete(key),
  };
});
