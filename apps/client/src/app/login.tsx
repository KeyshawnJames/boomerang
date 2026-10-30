import { useMutation } from "@tanstack/react-query";
import { loginMutation } from "api/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "react-native";

import { AuthForm, Field } from "../components/form";
import { useSession } from "../session";

export default function Login() {
  const { t } = useTranslation();
  const signIn = useSession((s) => s.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    ...loginMutation(),
    onSuccess: (token) => signIn(token.access_token),
  });
  return (
    <AuthForm
      title={t("auth.loginTitle")}
      submitLabel={t("auth.login")}
      onSubmit={() => login.mutate({ body: { email: email.trim(), password } })}
      busy={login.isPending}
      error={login.error}
      footer={
        <Link href="/register" replace className="py-3 text-center">
          <Text className="font-sans-semibold text-base text-primary">
            {t("auth.toRegister")}
          </Text>
        </Link>
      }
    >
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
        autoComplete="current-password"
        secureTextEntry
      />
    </AuthForm>
  );
}
