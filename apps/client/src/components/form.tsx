import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { errorMessage } from "../errors";
import { LanguageToggle } from "./language-toggle";

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View className="gap-1">
      <Text className="font-sans-semibold text-sm text-ink">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        className="rounded-sm border border-line/20 bg-surface px-4 py-3 font-sans text-base text-ink"
        {...props}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || disabled, busy }}
      disabled={busy || disabled}
      onPress={onPress}
      className={`items-center rounded-sm bg-primary px-4 py-4 ${busy || disabled ? "opacity-60" : ""}`}
    >
      <Text className="font-sans-bold text-base text-on-primary">{label}</Text>
    </Pressable>
  );
}

// The frame shared by the login and register screens.
export function AuthForm({
  title,
  submitLabel,
  onSubmit,
  busy,
  error,
  footer,
  children,
}: {
  title: string;
  submitLabel: string;
  onSubmit: () => void;
  busy: boolean;
  error: unknown;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 justify-center gap-4 bg-bg px-6"
    >
      <Text className="font-sans-extrabold text-3xl text-ink">{title}</Text>
      {children}
      {error != null && (
        <Text
          accessibilityRole="alert"
          className="font-sans text-base text-danger"
        >
          {errorMessage(error)}
        </Text>
      )}
      <Button label={submitLabel} onPress={onSubmit} busy={busy} />
      {footer}
      <View className="items-center">
        <LanguageToggle />
      </View>
    </KeyboardAvoidingView>
  );
}
