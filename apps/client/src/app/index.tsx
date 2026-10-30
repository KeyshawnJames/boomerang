import { useQuery } from "@tanstack/react-query";
import { healthOptions, meOptions } from "api/react-query";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Button } from "../components/form";
import { LanguageToggle } from "../components/language-toggle";
import { useSession } from "../session";

export default function Home() {
  const { t } = useTranslation();
  const health = useQuery(healthOptions());
  const me = useQuery(meOptions());
  const signOut = useSession((s) => s.signOut);
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-bg px-6">
      <Text className="font-sans-extrabold text-4xl text-primary">
        {t("home.title")}
      </Text>
      <Text className="font-sans text-base text-muted">
        {t("home.tagline")}
      </Text>
      {me.data && (
        <Text className="font-sans-semibold text-lg text-ink">
          {t("home.greeting", { name: me.data.name })}
        </Text>
      )}
      {!health.isPending && (
        <Text className="font-sans text-sm text-muted">
          {health.isSuccess ? t("home.apiOk") : t("home.apiDown")}
        </Text>
      )}
      <View className="mt-6 items-center">
        <LanguageToggle />
      </View>
      <View className="w-full">
        <Button label={t("home.signOut")} onPress={signOut} />
      </View>
    </View>
  );
}
