import { router } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// The frame shared by the new-return steps.
export function Step({
  title,
  back,
  footer,
  children,
}: {
  title: string;
  // Where the top link really goes, when that isn't the step before.
  back?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    // Keeps the footer button above the keyboard on the steps with text fields.
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-bg"
    >
      <SafeAreaView style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="self-start px-6 py-3"
        >
          <Text className="font-sans-semibold text-base text-primary">
            {back ?? t("newReturn.back")}
          </Text>
        </Pressable>
        {/* "handled": a tap on an address suggestion picks it instead of only closing the keyboard. */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-3 px-6 pb-6"
        >
          <Text className="mb-2 font-sans-extrabold text-3xl text-ink">
            {title}
          </Text>
          {children}
        </ScrollView>
        {footer && <View className="px-6 pb-4">{footer}</View>}
      </SafeAreaView>
    </KeyboardAvoidingView>
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

// A tick box; the label is set so screen readers don't read the tick mark.
export function Check({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onPress}
      className="flex-row items-start gap-3 py-2"
    >
      <View
        className={`mt-0.5 h-6 w-6 items-center justify-center rounded-sm border-2 ${checked ? "border-primary bg-primary" : "border-line/40 bg-surface"}`}
      >
        {checked && (
          <Text className="font-sans-bold text-sm text-on-primary">✓</Text>
        )}
      </View>
      <Text className="flex-1 font-sans text-base text-ink">{label}</Text>
    </Pressable>
  );
}

// One labelled line of a summary, with an optional second line under the value.
export function Row({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string | null;
}) {
  return (
    <View className="gap-1 border-b border-line/10 py-3">
      <Text className="font-sans text-sm text-muted">{label}</Text>
      <Text className="font-sans-semibold text-base text-ink">{value}</Text>
      {note ? (
        <Text className="font-sans text-base text-muted">{note}</Text>
      ) : null}
    </View>
  );
}
