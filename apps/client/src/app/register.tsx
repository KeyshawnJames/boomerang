import { useMutation } from "@tanstack/react-query";
import { login, register, type RegisterRequest } from "api";
import { Link } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "react-native";

import { AuthForm, Field } from "../components/form";
import { pickLanguage } from "../i18n";
import { useSession } from "../session";

export default function Register() {
  const { t, i18n } = useTranslation();
  const signIn = useSession((s) => s.signIn);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signUp = useMutation({
    mutationFn: async (body: RegisterRequest) => {
      await register({ body, throwOnError: true });
      // Registering returns the user, not a token, so log straight in.
      const { data } = await login({
        body: { email: body.email, password: body.password },
        throwOnError: true,
      });
      return data;
    },
    onSuccess: (token) => signIn(token.access_token),
  });
  return (
    <AuthForm
      title={t("auth.registerTitle")}
      submitLabel={t("auth.register")}
      onSubmit={() =>
        signUp.mutate({
          role: "client",
          name,
          email: email.trim(),
          password,
          locale: pickLanguage(i18n.resolvedLanguage ?? null),
        })
      }
      busy={signUp.isPending}
      error={signUp.error}
      footer={
        <Link href="/login" replace className="py-3 text-center">
          <Text className="font-sans-semibold text-base text-primary">
            {t("auth.toLogin")}
          </Text>
        </Link>
      }
    >
      <Field
        label={t("auth.name")}
        value={name}
        onChangeText={setName}
        autoComplete="name"
      />
      <Field
        label={t("auth.email")}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <Field
        label={t("auth.password")}
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        secureTextEntry
      />
    </AuthForm>
  );
}
