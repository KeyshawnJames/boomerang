import * as SecureStore from "expo-secure-store";
import { useTranslation } from "react-i18next";
import { Pressable, Text } from "react-native";

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
      }}
      className="rounded-sm px-4 py-3"
    >
      <Text className="font-sans-semibold text-base text-primary">
        {t("language.switch")}
      </Text>
    </Pressable>
  );
}
