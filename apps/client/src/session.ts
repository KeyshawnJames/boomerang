import { client } from "api/client";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { queryClient } from "./api";

const TOKEN_KEY = "token";

type Session = {
  token: string | null;
  signIn: (token: string) => void;
  signOut: () => Promise<void>;
};

export const useSession = create<Session>()((set) => ({
  // Read synchronously at launch, so a returning user opens straight onto the signed-in app.
  token: SecureStore.getItem(TOKEN_KEY),
  signIn: (token) => {
    SecureStore.setItem(TOKEN_KEY, token);
    set({ token });
  },
  signOut: async () => {
    // Delete first: if it fails, the user stays visibly signed in rather than coming back.
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    queryClient.clear();
    set({ token: null });
  },
}));

client.setConfig({ auth: () => useSession.getState().token ?? undefined });

// The token lasts 24h with no refresh token, so a 401 while signed in means sign in again.
client.interceptors.response.use((response) => {
  if (response.status === 401 && useSession.getState().token) {
    useSession.getState().signOut();
  }
  return response;
});
