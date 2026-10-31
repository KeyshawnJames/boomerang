import { eligibilityQuestionsQueryKey } from "api/react-query";
import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import { Pressable, Text } from "react-native";

import { queryClient } from "../api";
import { LANGUAGE_KEY } from "../i18n";

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("language.switchLabel")}
      onPress={() => {
        const next = i18n.resolvedLanguage === "en" ? "fr" : "en";
        i18n.changeLanguage(next);
        SecureStore.setItemAsync(LANGUAGE_KEY, next);
        // The questions come in the app's language; drop them so they never show in the old one.
        queryClient.removeQueries({ queryKey: eligibilityQuestionsQueryKey() });
      }}
      className="rounded-sm px-4 py-3"
    >
      <Text className="font-sans-semibold text-base text-primary">
        {t("language.switch")}
      </Text>
    </Pressable>
  );
}
