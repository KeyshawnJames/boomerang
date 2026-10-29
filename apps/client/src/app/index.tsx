import { useQuery } from "@tanstack/react-query";
import { healthOptions } from "api/react-query";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

export default function Home() {
  const { t, i18n } = useTranslation();
  const health = useQuery(healthOptions());
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-bg px-6">
      <Text className="font-sans-extrabold text-4xl text-primary">
        {t("home.title")}
      </Text>
      <Text className="font-sans text-base text-muted">
        {t("home.tagline")}
      </Text>
      {!health.isPending && (
        <Text className="font-sans text-sm text-muted">
          {health.isSuccess ? t("home.apiOk") : t("home.apiDown")}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("language.switchLabel")}
        onPress={() =>
          i18n.changeLanguage(i18n.resolvedLanguage === "en" ? "fr" : "en")
        }
        className="mt-6 rounded-sm px-4 py-3"
      >
        <Text className="font-sans-semibold text-base text-primary">
          {t("language.switch")}
        </Text>
      </Pressable>
    </View>
  );
}
