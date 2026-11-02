import { useStripe } from "@stripe/stripe-react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { payForReturn } from "api";
import { getReturnOptions } from "api/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

import { price, slotLabel } from "../../booking";
import { Button, Field } from "../../components/form";
import { Choice, Row, SectionTitle, Step } from "../../components/step";
import { errorMessage } from "../../errors";

// ADR 0018: fixed amounts, so they don't depend on tax. The server refuses over $50.
const TIPS = [0, 100, 200, 300];
const MAX_TIP = 5000;

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
  const [expired, setExpired] = useState(false);
  const booked = useQuery({
    ...getReturnOptions({ path: { return_id: id } }),
    // Only the server's webhook books it (ADR 0018), so ask until it has.
    refetchInterval: (query) =>
      paid !== null && query.state.data?.status === "awaiting_payment"
        ? 2000
        : false,
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
        throw error;
      }
      const init = await initPaymentSheet({
        merchantDisplayName: "Boomerang",
        paymentIntentClientSecret: data.client_secret,
      });
      if (init.error) throw init.error;
      const { error: sheetError } = await presentPaymentSheet();
      if (sheetError?.code === "Canceled") return null;
      if (sheetError) throw sheetError;
      return data.total;
    },
    onSuccess: (charged) => charged !== null && setPaid(charged),
    // Paid or cancelled meanwhile: the refetch shows it.
    onError: () => booked.refetch(),
  });
  const unpaid = data?.status === "awaiting_payment";
  const confirming = unpaid && paid !== null;
  const title =
    data && !unpaid
      ? t("booked.title")
      : confirming
        ? t("pay.confirming")
        : t("pay.title");
  return (
    <Step
      title={title}
      footer={
        <View className="gap-3">
          {pay.isError && (
            <Text
              accessibilityRole="alert"
              className="font-sans text-base text-danger"
            >
              {errorMessage(pay.error)}
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
          />
          {paid !== null && <Row label={t("pay.paid")} value={price(paid)} />}
        </>
      )}
    </Step>
  );
}
