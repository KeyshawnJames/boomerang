import { useMutation, useQuery } from "@tanstack/react-query";
import { createReturn, updateMe } from "api";
import {
  bookingOptionsOptions,
  bookingOptionsQueryKey,
  listRetailersOptions,
  meOptions,
  meQueryKey,
} from "api/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { queryClient } from "../../api";
import { price, sameSlot, slotLabel } from "../../booking";
import { Button, Field } from "../../components/form";
import { Row, Step } from "../../components/step";
import { useDraft } from "../../draft";
import { errorMessage } from "../../errors";

export default function Review() {
  const { t } = useTranslation();
  const draft = useDraft();
  const retailers = useQuery(listRetailersOptions());
  const options = useQuery(bookingOptionsOptions());
  const me = useQuery(meOptions());
  const [phone, setPhone] = useState("");
  // ADR 0012: the phone is asked for at the first booking, not at sign-up. If the
  // profile didn't load, asking is safer than a booking the server will refuse.
  const needsPhone = !me.isPending && !me.data?.phone;
  // The offered copy of the slot: an ASAP window moves on while the client reads.
  const slot =
    draft.slot && options.data?.slots.find((s) => sameSlot(s, draft.slot!));
  const slotGone = !!options.data && !!draft.slot && !slot;
  const book = useMutation({
    mutationFn: async () => {
      if (needsPhone) {
        const { data } = await updateMe({
          body: { phone: phone.trim() },
          throwOnError: true,
        });
        queryClient.setQueryData(meQueryKey(), data);
      }
      const d = useDraft.getState();
      const { data } = await createReturn({
        body: {
          retailer_id: d.retailerId!,
          carrier: d.carrier!,
          label_type: d.labelType!,
          order_number: d.orderNumber.trim() || null,
          label_photo_key: d.labelPhoto!.key,
          package_photo_key: d.packagePhoto!.key,
          address_token: d.address!.token,
          pickup_notes: d.pickupNotes.trim() || null,
          asap: d.slot!.asap,
          pickup_window_start: d.slot!.asap ? null : d.slot!.start,
          answers: d.answers,
          policy_version: d.policyVersion!,
          acknowledged_warnings: d.acknowledgedWarnings,
          attested: d.attested,
        },
        throwOnError: true,
      });
      return data;
    },
    onSuccess: (data) => {
      // Replaces the whole booking flow, so Back from the confirmation goes home.
      router.replace(`/returns/${data.id}`);
      useDraft.getState().reset();
    },
    // A slot that has passed is the likeliest cause; the refetch shows slotGone if so.
    onError: () =>
      queryClient.invalidateQueries({ queryKey: bookingOptionsQueryKey() }),
  });
  const retailer = retailers.data?.find((r) => r.id === draft.retailerId);
  return (
    <Step
      title={t("review.title")}
      footer={
        <View className="gap-3">
          {slotGone && (
            <Text
              accessibilityRole="alert"
              className="font-sans text-base text-danger"
            >
              {t("review.slotGone")}
            </Text>
          )}
          {book.isError && !slotGone && (
            <Text
              accessibilityRole="alert"
              className="font-sans text-base text-danger"
            >
              {errorMessage(book.error)}
            </Text>
          )}
          <Button
            label={t("review.book")}
            busy={book.isPending}
            disabled={me.isPending || !slot || (needsPhone && !phone.trim())}
            onPress={() => book.mutate()}
          />
        </View>
      }
    >
      {retailer && <Row label={t("review.retailer")} value={retailer.name} />}
      {draft.labelType && draft.carrier && (
        <Row
          label={t("review.label")}
          value={`${t(`labelTypes.${draft.labelType}`)}, ${t(`carriers.${draft.carrier}`)}`}
          note={draft.orderNumber.trim()}
        />
      )}
      {draft.address && (
        <Row
          label={t("review.address")}
          value={draft.address.address}
          note={draft.pickupNotes.trim()}
        />
      )}
      {slot && <Row label={t("review.time")} value={slotLabel(slot)} />}
      {options.data && (
        <Row
          label={t("review.price")}
          value={t("review.priceLine", {
            price: price(options.data.pickup_fee),
          })}
          note={t("review.taxes")}
        />
      )}
      {needsPhone && (
        <>
          <Field
            label={t("review.phone")}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={30}
          />
          <Text className="font-sans text-base text-muted">
            {t("review.phoneHint")}
          </Text>
        </>
      )}
    </Step>
  );
}
