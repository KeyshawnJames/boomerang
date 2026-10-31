import { useQuery } from "@tanstack/react-query";
import { listRetailersOptions } from "api/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text } from "react-native";

import { Choice, Step } from "../../components/step";
import { useDraft } from "../../draft";
import { errorMessage } from "../../errors";

export default function Retailer() {
  const { t } = useTranslation();
  const retailers = useQuery(listRetailersOptions());
  const retailerId = useDraft((s) => s.retailerId);
  const update = useDraft((s) => s.update);
  return (
    <Step title={t("newReturn.retailerTitle")}>
      {retailers.isPending && <ActivityIndicator />}
      {retailers.isError && (
        <Text
          accessibilityRole="alert"
          className="font-sans text-base text-danger"
        >
          {errorMessage(retailers.error)}
        </Text>
      )}
      {retailers.data?.map((retailer) => (
        <Choice
          key={retailer.id}
          label={retailer.name}
          selected={retailer.id === retailerId}
          onPress={() => {
            update({ retailerId: retailer.id });
            router.push("/new-return/label");
          }}
        />
      ))}
    </Step>
  );
}
