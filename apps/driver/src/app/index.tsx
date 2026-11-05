import { useQuery } from "@tanstack/react-query";
import { healthOptions } from "api/react-query";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { LanguageToggle } from "../components/language-toggle";

// Placeholder until sign-up and the job list arrive (#77, #82).
export default function Home() {
  const { t } = useTranslation();
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
      <View className="mt-6 items-center">
        <LanguageToggle />
      </View>
    </View>
  );
}
