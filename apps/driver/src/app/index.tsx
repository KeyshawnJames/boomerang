import { useQuery } from "@tanstack/react-query";
import { meOptions, myJobsOptions } from "api/react-query";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

import { CurrentJob } from "../components/current-job";
import { Button } from "../components/form";
import { Jobs } from "../components/jobs";
import { LanguageToggle } from "../components/language-toggle";
import { errorMessage } from "../errors";
import { useSession } from "../session";

// Approved drivers see their job in progress, else the open jobs; other drivers wait
// for a founder to run the approve command, then tap Refresh.
export default function Home() {
  const { t } = useTranslation();
  const me = useQuery(meOptions());
  const signOut = useSession((s) => s.signOut);
  // No data means the first load failed: say only that, since we don't know who they are.
  const driver = me.data?.role === "driver";
  const approved = driver && me.data?.is_approved === true;
  const waiting = driver && !approved;
  const mine = useQuery({ ...myJobsOptions(), enabled: approved });

  if (me.isPending || (approved && mine.isPending)) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator />
      </View>
    );
  }
  const job = mine.data?.[0];
  if (approved) return job ? <CurrentJob job={job} /> : <Jobs />;
  return (
    <View className="flex-1 justify-center gap-4 bg-bg px-6">
      {driver && (
        <Text className="font-sans-extrabold text-3xl text-ink">
          {t("waiting.title")}
        </Text>
      )}
      {me.data && (
        <Text className="font-sans text-base text-muted">
          {waiting ? t("waiting.body") : t("waiting.notDriver")}
        </Text>
      )}
      {me.isError && (
        <Text
          accessibilityRole="alert"
          className="font-sans text-base text-danger"
        >
          {errorMessage(me.error)}
        </Text>
      )}
      {(waiting || !me.data) && (
        <Button
          label={t("waiting.refresh")}
          onPress={() => me.refetch()}
          busy={me.isFetching}
        />
      )}
      <Button label={t("home.signOut")} onPress={signOut} secondary />
      <View className="items-center">
        <LanguageToggle />
      </View>
    </View>
  );
}
