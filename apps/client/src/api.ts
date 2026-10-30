import { QueryClient } from "@tanstack/react-query";
import { client } from "api/client";
import Constants from "expo-constants";

import i18n from "./i18n";

// shortcut: dev only, the API runs on port 8000 of the Mac serving Metro. Read an
// EXPO_PUBLIC_API_URL instead once the API is deployed.
const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
client.setConfig({ baseUrl: `http://${host}:8000` });

// The API answers errors in this language until the user is signed in.
client.interceptors.request.use((request) => {
  request.headers.set("Accept-Language", i18n.language);
  return request;
});

export const queryClient = new QueryClient();
