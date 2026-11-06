import { useQuery } from "@tanstack/react-query";
import type { DriverJobRead } from "api";
import { listJobsOptions } from "api/react-query";
import { useTranslation } from "react-i18next";
import { FlatList, Text, View } from "react-native";

import { errorMessage } from "../errors";
import { money, windowLabel } from "../format";
import { useSession } from "../session";
import { Button } from "./form";
import { LanguageToggle } from "./language-toggle";

// Every open job on the island, soonest first, showing only what ADR 0019 allows before
// accepting: postal area, window, carrier, label type and earnings.
export function Jobs() {
  const { t } = useTranslation();
  const jobs = useQuery(listJobsOptions());
  const signOut = useSession((s) => s.signOut);

  const card = ({ item }: { item: DriverJobRead }) => (
    <View className="gap-2 rounded-sm border border-line/20 bg-surface p-4">
      <Text className="font-sans-extrabold text-2xl text-ink">
        {item.postal_area}
      </Text>
      <Text className="font-sans text-base text-ink">
        {windowLabel(item.pickup_window_start, item.pickup_window_end)}
      </Text>
      <Text className="font-sans text-base text-muted">
        {`${t(`carriers.${item.carrier}`)} · ${t(`labelTypes.${item.label_type}`)}`}
      </Text>
      <Text className="font-sans-bold text-base text-ink">
        {t("jobs.earn", { amount: money(item.driver_payout) })}
      </Text>
      <Button label={t("jobs.accept")} onPress={() => {}} />
    </View>
  );

  return (
    <FlatList
      testID="jobs"
      className="flex-1 bg-bg"
      contentContainerClassName="gap-4 px-6 py-16"
      data={jobs.data}
      keyExtractor={(job) => job.id}
      renderItem={card}
      refreshing={jobs.isRefetching}
      onRefresh={jobs.refetch}
      ListHeaderComponent={
        <View className="gap-4">
          <Text className="font-sans-extrabold text-3xl text-ink">
            {t("jobs.title")}
          </Text>
          {jobs.isError && (
            <Text
              accessibilityRole="alert"
              className="font-sans text-base text-danger"
            >
              {errorMessage(jobs.error)}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        jobs.isSuccess ? (
          <Text className="font-sans text-base text-muted">
            {t("jobs.empty")}
          </Text>
        ) : null
      }
      ListFooterComponent={
        <View className="gap-4">
          <Button label={t("home.signOut")} onPress={signOut} secondary />
          <View className="items-center">
            <LanguageToggle />
          </View>
        </View>
      }
    />
  );
}
