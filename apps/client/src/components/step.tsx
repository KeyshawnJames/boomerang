import { router } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// The frame shared by the new-return steps.
export function Step({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="self-start px-6 py-3"
        >
          <Text className="font-sans-semibold text-base text-primary">
            {t("newReturn.back")}
          </Text>
        </Pressable>
        <ScrollView contentContainerClassName="gap-3 px-6 pb-6">
          <Text className="mb-2 font-sans-extrabold text-3xl text-ink">
            {title}
          </Text>
          {children}
        </ScrollView>
        {footer && <View className="px-6 pb-4">{footer}</View>}
      </SafeAreaView>
    </View>
  );
}

// One option in a list; the selected one stays highlighted when you come back.
export function Choice({
  label,
  selected = false,
  disabled = false,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`rounded-sm border px-4 py-4 ${selected ? "border-primary bg-primary/10" : "border-line/20 bg-surface"} ${disabled ? "opacity-60" : ""}`}
    >
      <Text className="font-sans-semibold text-base text-ink">{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mt-3 font-sans-bold text-lg text-ink">{children}</Text>
  );
}
