import { useQuery } from "@tanstack/react-query";
import { eligibilityQuestionsOptions } from "api/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "react-native";

import { Button } from "../../components/form";
import { Step } from "../../components/step";
import { useDraft } from "../../draft";
import { chosenOptions } from "../../eligibility";

// Where a blocking answer lands. Back lets a wrong tap be fixed; nothing here goes forward.
export default function Blocked() {
  const { t } = useTranslation();
  const questions = useQuery(eligibilityQuestionsOptions());
  const answers = useDraft((s) => s.answers);
  const blocking = chosenOptions(
    questions.data?.questions ?? [],
    answers,
  ).filter((c) => c.option.outcome === "block");
  return (
    <Step
      title={t("blocked.title")}
      footer={
        <Button
          label={t("blocked.home")}
          onPress={() => router.dismissTo("/")}
        />
      }
    >
      <Text className="font-sans text-base text-ink">
        {t("blocked.because")}
      </Text>
      {blocking.map(({ question, option }) => (
        <Text
          key={question.code}
          className="font-sans-semibold text-base text-ink"
        >
          {`${question.prompt} ${option.label}`}
        </Text>
      ))}
      <Text className="font-sans text-base text-muted">
        {t("blocked.explain")}
      </Text>
    </Step>
  );
}
