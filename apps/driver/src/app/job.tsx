import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

// The job the driver just accepted. A placeholder until #83 shows its details.
export default function Job() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 justify-center gap-4 bg-bg px-6">
      <Text className="font-sans-extrabold text-3xl text-ink">
        {t("job.title")}
      </Text>
      <Text className="font-sans text-base text-muted">{t("job.body")}</Text>
    </View>
  );
}
