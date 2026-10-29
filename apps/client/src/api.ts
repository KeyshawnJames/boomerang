import { QueryClient } from "@tanstack/react-query";
import { client } from "api/client";
import Constants from "expo-constants";

// shortcut: dev only, the API runs on port 8000 of the Mac serving Metro. Read an
// EXPO_PUBLIC_API_URL instead once the API is deployed.
const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
client.setConfig({ baseUrl: `http://${host}:8000` });

export const queryClient = new QueryClient();
