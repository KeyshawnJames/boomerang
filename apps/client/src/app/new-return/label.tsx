import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Button, Field } from "../../components/form";
import { Choice, SectionTitle, Step } from "../../components/step";
import { useDraft } from "../../draft";

const LABEL_TYPES = ["qr_code", "printed_label"] as const;
const CARRIERS = ["canada_post", "ups", "purolator"] as const;

export default function Label() {
  const { t } = useTranslation();
  const { labelType, carrier, orderNumber, labelPhoto, update } = useDraft();
  return (
    <Step
      title={t("newReturn.labelTitle")}
      footer={
        <Button
          label={t("newReturn.next")}
          disabled={!labelType || !carrier}
          onPress={() => router.push("/new-return/photos")}
        />
      }
    >
      <SectionTitle>{t("newReturn.labelType")}</SectionTitle>
      {LABEL_TYPES.map((type) => (
        <Choice
          key={type}
          label={t(`labelTypes.${type}`)}
          selected={type === labelType}
          // A QR screenshot and a printed-label photo aren't interchangeable.
          onPress={() =>
            update({
              labelType: type,
              labelPhoto: type === labelType ? labelPhoto : null,
            })
          }
        />
      ))}
      <SectionTitle>{t("newReturn.carrier")}</SectionTitle>
      {CARRIERS.map((c) => (
        <Choice
          key={c}
          label={t(`carriers.${c}`)}
          selected={c === carrier}
          onPress={() => update({ carrier: c })}
        />
      ))}
      <Field
        label={t("newReturn.orderNumber")}
        value={orderNumber}
        onChangeText={(text) => update({ orderNumber: text })}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={100}
      />
    </Step>
  );
}
