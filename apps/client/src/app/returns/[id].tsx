import { useQuery } from "@tanstack/react-query";
import { getReturnOptions } from "api/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text } from "react-native";

import { price, slotLabel } from "../../booking";
import { Button } from "../../components/form";
import { Row, Step } from "../../components/step";
import { errorMessage } from "../../errors";

// The confirmation after booking, read back from the server so it shows what was saved.
export default function Booked() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const booked = useQuery(getReturnOptions({ path: { return_id: id } }));
  const data = booked.data;
  return (
    <Step
      title={t("booked.title")}
      footer={
        <Button
          label={t("booked.home")}
          onPress={() => router.dismissTo("/")}
        />
      }
    >
      {booked.isPending && <ActivityIndicator />}
      {booked.isError && (
        <Text
          accessibilityRole="alert"
          className="font-sans text-base text-danger"
        >
          {errorMessage(booked.error)}
        </Text>
      )}
      {data && (
        <>
          <Text className="font-sans text-base text-ink">
            {t("booked.explain")}
          </Text>
          <Row
            label={t("review.address")}
            value={data.pickup_address}
            note={data.pickup_notes}
          />
          <Row
            label={t("review.time")}
            value={slotLabel({
              start: data.pickup_window_start,
              end: data.pickup_window_end,
              asap: false,
            })}
          />
          <Row
            label={t("review.price")}
            value={t("review.priceLine", { price: price(data.pickup_fee) })}
            note={t("review.taxes")}
          />
        </>
      )}
    </Step>
  );
}
