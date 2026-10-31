import { useQuery } from "@tanstack/react-query";
import { bookingOptionsOptions } from "api/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text } from "react-native";

import { sameSlot, slotLabel } from "../../booking";
import { Button } from "../../components/form";
import { Choice, Step } from "../../components/step";
import { useDraft } from "../../draft";
import { errorMessage } from "../../errors";

export default function Time() {
  const { t } = useTranslation();
  const options = useQuery(bookingOptionsOptions());
  const slot = useDraft((s) => s.slot);
  const update = useDraft((s) => s.update);
  // A slot chosen earlier may have passed since; only one still offered counts.
  const offered =
    !!slot && !!options.data?.slots.some((s) => sameSlot(s, slot));
  return (
    <Step
      title={t("time.title")}
      footer={
        <Button
          label={t("newReturn.next")}
          disabled={!offered}
          onPress={() => router.push("/new-return/review")}
        />
      }
    >
      <Text className="font-sans text-base text-muted">{t("time.hint")}</Text>
      {options.isPending && <ActivityIndicator />}
      {options.isError && (
        <Text
          accessibilityRole="alert"
          className="font-sans text-base text-danger"
        >
          {errorMessage(options.error)}
        </Text>
      )}
      {options.data?.slots.map((s) => (
        <Choice
          key={s.start}
          label={slotLabel(s)}
          selected={!!slot && sameSlot(s, slot)}
          onPress={() => update({ slot: s })}
        />
      ))}
    </Step>
  );
}
