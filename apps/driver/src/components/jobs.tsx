import { useMutation, useQuery } from "@tanstack/react-query";
import type { DriverJobRead } from "api";
import {
  acceptJobMutation,
  listJobsOptions,
  listJobsQueryKey,
} from "api/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { FlatList, Text, View } from "react-native";

import { queryClient } from "../api";
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
  // First tap wins on the server; a lost race comes back as 409 "This job was just
  // taken", and the list refreshes either way so a taken job disappears.
  const accept = useMutation({
    ...acceptJobMutation(),
    onSuccess: () => router.replace("/job"),
    // Not awaited: the mutation would wait for the refetch (and its retries) first.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listJobsQueryKey() });
    },
  });
  const error = accept.error ?? jobs.error;

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
      <Button
        label={t("jobs.accept")}
        onPress={() => accept.mutate({ path: { job_id: item.id } })}
        busy={accept.isPending && accept.variables?.path.job_id === item.id}
        disabled={accept.isPending}
      />
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
      // Cells re-render only when data or extraData change.
      extraData={accept.isPending}
      refreshing={jobs.isRefetching}
      onRefresh={jobs.refetch}
      ListHeaderComponent={
        <View className="gap-4">
          <Text className="font-sans-extrabold text-3xl text-ink">
            {t("jobs.title")}
          </Text>
          {error && (
            <Text
              accessibilityRole="alert"
              className="font-sans text-base text-danger"
            >
              {errorMessage(error)}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        jobs.isSuccess ? (
          <Text className="font-sans text-base text-muted">
            {t("jobs.empty")}
          </Text>
        ) : undefined
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
