import { useMutation } from "@tanstack/react-query";
import type { DriverCurrentJobRead } from "api";
import {
  markArrivedMutation,
  myJobsQueryKey,
  releaseJobMutation,
} from "api/react-query";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";

import { queryClient } from "../api";
import { errorMessage } from "../errors";
import { time, windowLabel } from "../format";
import { useSession } from "../session";
import { Button } from "./form";
import { LanguageToggle } from "./language-toggle";

// Directions in the phone's own maps app; the app itself never reads the location (ADR 0019).
function directions(address: string) {
  const to = encodeURIComponent(address);
  return Platform.OS === "ios"
    ? `https://maps.apple.com/?daddr=${to}`
    : `https://www.google.com/maps/dir/?api=1&destination=${to}`;
}

// The job the driver accepted: everything they need at the door (ADR 0019).
export function CurrentJob({ job }: { job: DriverCurrentJobRead }) {
  const { t } = useTranslation();
  const signOut = useSession((s) => s.signOut);
  const refetchMine = () =>
    queryClient.invalidateQueries({ queryKey: myJobsQueryKey() });
  const path = { path: { job_id: job.id } };
  // Returned, so the button stays busy until the arrival time shows.
  const arrive = useMutation({
    ...markArrivedMutation(),
    onSuccess: refetchMine,
  });
  const release = useMutation({
    ...releaseJobMutation(),
    // No job any more: the home screen switches to the list.
    onSuccess: () => queryClient.setQueryData(myJobsQueryKey(), []),
    // The job may have changed under us (404/409): show what's true now.
    onError: () => void refetchMine(),
  });
  const error = arrive.error ?? release.error;
  const waiting = job.status === "driver_assigned";

  const confirmHandBack = () =>
    Alert.alert(t("job.handBackTitle"), t("job.handBackBody"), [
      { text: t("job.keep"), style: "cancel" },
      {
        text: t("job.handBack"),
        style: "destructive",
        onPress: () => release.mutate(path),
      },
    ]);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="gap-4 px-6 py-16"
    >
      <Text className="font-sans-extrabold text-3xl text-ink">
        {t("job.title")}
      </Text>
      <Text className="font-sans-bold text-base text-ink">
        {windowLabel(job.pickup_window_start, job.pickup_window_end)}
      </Text>
      <Text className="font-sans-bold text-2xl text-ink">
        {job.pickup_address}
      </Text>
      {job.pickup_notes && (
        <Text className="font-sans text-base text-ink">{job.pickup_notes}</Text>
      )}
      <Text className="font-sans text-base text-muted">
        {t("job.client", { name: job.client_first_name })}
      </Text>
      <Text className="font-sans text-base text-muted">
        {`${t(`carriers.${job.carrier}`)} · ${t(`labelTypes.${job.label_type}`)}`}
      </Text>
      {job.package_photo_url && (
        <Image
          source={{ uri: job.package_photo_url }}
          accessibilityLabel={t("job.photo")}
          accessibilityIgnoresInvertColors
          className="h-64 w-full rounded-sm"
          resizeMode="cover"
        />
      )}
      {job.client_phone && (
        <Button
          label={t("job.call", { name: job.client_first_name })}
          onPress={() => Linking.openURL(`tel:${job.client_phone}`)}
          secondary
        />
      )}
      <Button
        label={t("job.maps")}
        onPress={() => Linking.openURL(directions(job.pickup_address))}
        secondary
      />
      {error && (
        <Text
          accessibilityRole="alert"
          className="font-sans text-base text-danger"
        >
          {errorMessage(error)}
        </Text>
      )}
      {waiting &&
        (job.arrived_at ? (
          <Text className="font-sans-bold text-base text-ink">
            {t("job.arrivedAt", { time: time(job.arrived_at) })}
          </Text>
        ) : (
          <Button
            label={t("job.arrive")}
            onPress={() => arrive.mutate(path)}
            busy={arrive.isPending}
          />
        ))}
      {waiting && (
        <Button
          label={t("job.handBack")}
          onPress={confirmHandBack}
          busy={release.isPending}
          secondary
        />
      )}
      <Button label={t("home.signOut")} onPress={signOut} secondary />
      <View className="items-center">
        <LanguageToggle />
      </View>
    </ScrollView>
  );
}
