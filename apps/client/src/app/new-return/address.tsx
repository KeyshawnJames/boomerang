import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { resolveAddress } from "api";
import { autocompleteAddressOptions } from "api/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text } from "react-native";

import { Button, Field } from "../../components/form";
import { Choice, Row, Step } from "../../components/step";
import { useDraft } from "../../draft";
import { errorMessage } from "../../errors";

// Groups one search's Google calls for billing (ADR 0013). It guards nothing, so
// Math.random is enough.
const newSession = () =>
  "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );

export default function Address() {
  const { t } = useTranslation();
  const { address, pickupNotes, update } = useDraft();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [session, setSession] = useState(newSession);
  // Every lookup is a paid Google call: search only once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);
  const searching = q.length >= 3;
  const suggestions = useQuery({
    ...autocompleteAddressOptions({ query: { q, session } }),
    enabled: searching,
    // Keeps the last list up while the next one loads, so it doesn't flicker.
    placeholderData: keepPreviousData,
  });
  const resolve = useMutation({
    mutationFn: async (placeId: string) => {
      const draft = useDraft.getState().id;
      const { data } = await resolveAddress({
        query: { place_id: placeId, session },
        throwOnError: true,
      });
      if (useDraft.getState().id === draft) update({ address: data });
      setText("");
      setQ("");
      // Choosing ends the Google session; a new search starts another.
      setSession(newSession());
    },
  });
  return (
    <Step
      title={t("address.title")}
      footer={
        <Button
          label={t("newReturn.next")}
          disabled={!address}
          onPress={() => router.push("/new-return/time")}
        />
      }
    >
      {address && <Row label={t("address.chosen")} value={address.address} />}
      <Field
        label={t("address.search")}
        value={text}
        onChangeText={(value) => {
          setText(value);
          resolve.reset();
        }}
        placeholder={t("address.searchHint")}
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        autoCorrect={false}
        maxLength={200}
      />
      {(suggestions.isFetching || resolve.isPending) && <ActivityIndicator />}
      {[searching && suggestions.error, resolve.error].map(
        (error, i) =>
          error && (
            <Text
              key={i}
              accessibilityRole="alert"
              className="font-sans text-base text-danger"
            >
              {errorMessage(error)}
            </Text>
          ),
      )}
      {searching &&
        suggestions.data?.map((s) => (
          <Choice
            key={s.place_id}
            label={s.text}
            disabled={resolve.isPending}
            onPress={() => resolve.mutate(s.place_id)}
          />
        ))}
      <Field
        label={t("address.notes")}
        value={pickupNotes}
        onChangeText={(value) => update({ pickupNotes: value })}
        maxLength={500}
      />
    </Step>
  );
}
