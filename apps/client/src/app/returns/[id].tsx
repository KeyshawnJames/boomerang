import { useStripe } from "@stripe/stripe-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  cancelReturn,
  payForReturn,
  type CreateReturnRequest,
  type ReturnStatus,
} from "api";
import { getReturnOptions, getReturnQueryKey } from "api/react-query";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { queryClient } from "../../api";
import { price, slotLabel } from "../../booking";
import { Button, Field } from "../../components/form";
import { Choice, Row, SectionTitle, Step } from "../../components/step";
import { errorMessage } from "../../errors";

// ADR 0018: fixed amounts, so they don't depend on tax. The server refuses over $50.
const TIPS = [0, 100, 200, 300];
const MAX_TIP = 5000;
const FINAL = ["completed", "cancelled", "failed_dropoff"];
type Paid = Exclude<ReturnStatus, "awaiting_payment">;

// "5", "5.50" or "5,50" in cents; NaN for anything else.
function cents(text: string): number {
  const amount = text.trim().replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(amount)
    ? Math.round(Number(amount) * 100)
    : NaN;
}

// After booking: tip and pay, then the confirmation, read back from the server.
export default function Booked() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [choice, setChoice] = useState<number | "other">(0);
  const [other, setOther] = useState("");
  // The total charged, once Stripe's card screen says it went through.
  const [paid, setPaid] = useState<number | null>(null);
  // Charged here, or already going through (409): either way the webhook books it.
  const [waiting, setWaiting] = useState(false);
  const [expired, setExpired] = useState(false);
  const booked = useQuery({
    ...getReturnOptions({ path: { return_id: id } }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Only the server's webhook books it (ADR 0018), so ask until it has.
      if (status === "awaiting_payment") return waiting ? 2000 : false;
      // Follow the driver's steps until the return is over (ADR 0019).
      return status && !FINAL.includes(status) ? 15_000 : false;
    },
  });
  const data = booked.data;
  const tip = choice === "other" ? cents(other) : choice;
  const tipOk = tip >= 0 && tip <= MAX_TIP;
  const total = (data?.pickup_fee ?? 0) + (tipOk ? tip : 0);
  const pay = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await payForReturn({
        path: { return_id: id },
        body: { tip },
      });
      if (error) {
        if (response?.status === 410) setExpired(true);
        if (response?.status === 409) setWaiting(true);
        throw error;
      }
      const init = await initPaymentSheet({
        merchantDisplayName: "Boomerang",
        paymentIntentClientSecret: data.client_secret,
        // Closes the bank's 3D Secure page and comes back to the app.
        returnURL: Linking.createURL("stripe-redirect"),
      });
      if (init.error) throw init.error;
      const { error: sheetError } = await presentPaymentSheet();
      if (sheetError?.code === "Canceled") return null;
      if (sheetError) throw sheetError;
      return data.total;
    },
    onSuccess: (charged) => {
      if (charged === null) return;
      setPaid(charged);
      setWaiting(true);
    },
    // Paid or cancelled meanwhile: the refetch shows it.
    onError: () => booked.refetch(),
  });
  const cancel = useMutation({
    mutationFn: async () => {
      const { data, error } = await cancelReturn({ path: { return_id: id } });
      if (error) throw error;
      return data;
    },
    onSuccess: (cancelled) =>
      queryClient.setQueryData(
        getReturnQueryKey({ path: { return_id: id } }),
        cancelled,
      ),
    // A driver accepted it meanwhile, say: the refetch shows it.
    onError: () => booked.refetch(),
  });
  const unpaid = data?.status === "awaiting_payment";
  const cancelled = data?.status === "cancelled";
  const confirming = unpaid && waiting;
  const droppedOff =
    data?.status === "dropped_off" || data?.status === "completed";
  // Before a driver accepts (ADR 0018). Not while the webhook is deciding.
  const cancellable =
    (unpaid && !confirming && !expired && !pay.isPending) ||
    data?.status === "requested";
  const confirmCancel = () =>
    Alert.alert(
      t("cancel.confirmTitle"),
      // Even unpaid, a charge may be going through: it's refunded too (ADR 0018).
      t("cancel.confirmBody"),
      [
        { text: t("cancel.keep"), style: "cancel" },
        {
          text: t("cancel.confirm"),
          style: "destructive",
          onPress: () => cancel.mutate(),
        },
      ],
    );
  const title = cancelled
    ? t("cancel.title")
    : data && !unpaid
      ? t("booked.title")
      : confirming
        ? t("pay.confirming")
        : t("pay.title");
  return (
    <Step
      title={title}
      // The booking flow was replaced, so Back goes home: say so.
      back={t("booked.home")}
      footer={
        <View className="gap-3">
          {pay.isError && unpaid && (
            <Text
              accessibilityRole="alert"
              className="font-sans text-base text-danger"
            >
              {errorMessage(pay.error)}
            </Text>
          )}
          {cancel.isError && (
            <Text
              accessibilityRole="alert"
              className="font-sans text-base text-danger"
            >
              {errorMessage(cancel.error)}
            </Text>
          )}
          {expired ? (
            <Button
              label={t("pay.bookAgain")}
              onPress={() => router.replace("/new-return")}
            />
          ) : unpaid && !confirming ? (
            <Button
              label={t("pay.pay", { total: price(total) })}
              busy={pay.isPending}
              disabled={!tipOk}
              onPress={() => pay.mutate()}
            />
          ) : (
            <Button
              label={t("booked.home")}
              onPress={() => router.dismissTo("/")}
            />
          )}
          {cancellable && (
            <Button
              label={t("cancel.button")}
              busy={cancel.isPending}
              secondary
              onPress={confirmCancel}
            />
          )}
        </View>
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
      {confirming && (
        <>
          <ActivityIndicator />
          <Text className="font-sans text-base text-ink">
            {t("pay.confirmingExplain")}
          </Text>
        </>
      )}
      {data && unpaid && !confirming && (
        <>
          <Text className="font-sans text-base text-ink">
            {t("pay.window")}
          </Text>
          <SectionTitle>{t("pay.tip")}</SectionTitle>
          <Text className="font-sans text-base text-muted">
            {t("pay.tipHint")}
          </Text>
          {TIPS.map((amount) => (
            <Choice
              key={amount}
              label={amount ? price(amount) : t("pay.noTip")}
              selected={choice === amount}
              onPress={() => setChoice(amount)}
            />
          ))}
          <Choice
            label={t("pay.other")}
            selected={choice === "other"}
            onPress={() => setChoice("other")}
          />
          {choice === "other" && (
            <>
              <Field
                label={t("pay.otherAmount")}
                value={other}
                onChangeText={setOther}
                keyboardType="decimal-pad"
                autoFocus
                maxLength={6}
              />
              <Text className="font-sans text-base text-muted">
                {t("pay.otherHint", { max: price(MAX_TIP) })}
              </Text>
            </>
          )}
          <Row label={t("pay.fee")} value={price(data.pickup_fee)} />
          <Row label={t("pay.total")} value={price(total)} />
        </>
      )}
      {data && !unpaid && (
        <>
          {(cancelled ||
            data.status === "requested" ||
            data.status === "driver_assigned") && (
            <Text className="font-sans text-base text-ink">
              {cancelled ? t("cancel.explain") : t("booked.explain")}
            </Text>
          )}
          <Row
            label={t("progress.label")}
            // Paid here, and the server only books its three carriers.
            value={t(`progress.${data.status as Paid}`, {
              name: data.driver_first_name,
              carrier: t(
                `carriers.${data.carrier as CreateReturnRequest["carrier"]}`,
              ),
            })}
          />
          {droppedOff && data.dropoff_location_name && (
            <Row
              label={t("progress.counter")}
              value={data.dropoff_location_name}
            />
          )}
          {droppedOff && data.carrier_tracking_number && (
            <Row
              label={t("progress.tracking")}
              value={data.carrier_tracking_number}
            />
          )}
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
          {!cancelled && (
            <Row
              label={t("review.price")}
              value={t("review.priceLine", { price: price(data.pickup_fee) })}
            />
          )}
          {paid !== null && (
            <Row
              label={cancelled ? t("cancel.refunded") : t("pay.paid")}
              value={price(paid)}
            />
          )}
        </>
      )}
    </Step>
  );
}
