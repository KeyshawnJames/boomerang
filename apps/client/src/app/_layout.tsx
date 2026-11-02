import "../global.css";
import "../i18n";

import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { StripeProvider } from "@stripe/stripe-react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { queryClient } from "../api";
import { useSession } from "../session";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const signedIn = useSession((s) => s.token !== null);
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  // On a font error, show the app anyway (iOS/Android substitute the system font) rather
  // than leave the splash screen up forever.
  const ready = loaded || !!error;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <QueryClientProvider client={queryClient}>
      {/* The pk_test_ key is public by design; Apple/Google Pay wait for app builds (ADR 0018). */}
      <StripeProvider
        publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="index" />
            <Stack.Screen name="new-return" />
            <Stack.Screen name="returns/[id]" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
          </Stack.Protected>
        </Stack>
      </StripeProvider>
    </QueryClientProvider>
  );
}
