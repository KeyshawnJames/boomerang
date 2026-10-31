import { useQuery } from "@tanstack/react-query";
import { eligibilityQuestionsOptions } from "api/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

import { Check, Choice, SectionTitle, Step } from "../../components/step";
import { useDraft } from "../../draft";
import { preview } from "../../eligibility";
import { errorMessage } from "../../errors";

export default function Eligibility() {
  const { t } = useTranslation();
  const questions = useQuery(eligibilityQuestionsOptions());
  const draft = useDraft();
  const { acknowledgedWarnings, attested, update } = draft;
  const data = questions.data;
  // Answers to an older question set don't count: POST /returns would refuse them.
  const answers =
    data && draft.policyVersion === data.policy_version ? draft.answers : {};
  const outcome = data ? preview(data.questions, answers) : null;
  return (
    <Step title={t("eligibility.title")}>
      {questions.isPending && <ActivityIndicator />}
      {questions.isError && (
        <Text
          accessibilityRole="alert"
          className="font-sans text-base text-danger"
        >
          {errorMessage(questions.error)}
        </Text>
      )}
      {data?.questions.map((q) => (
        <View key={q.code} className="gap-3">
          <SectionTitle>{q.prompt}</SectionTitle>
          {q.help && (
            <Text className="font-sans text-base text-muted">{q.help}</Text>
          )}
          {q.options.map((option) => (
            <Choice
              key={option.value}
              label={option.label}
              accessibilityLabel={`${q.prompt} ${option.label}`}
              selected={answers[q.code] === option.value}
              onPress={() => {
                // A changed answer voids what was acknowledged and attested.
                if (answers[q.code] !== option.value)
                  update({
                    answers: { ...answers, [q.code]: option.value },
                    policyVersion: data.policy_version,
                    acknowledgedWarnings: false,
                    attested: false,
                  });
                if (option.outcome === "block")
                  router.push("/new-return/blocked");
              }}
            />
          ))}
        </View>
      ))}
      {outcome === "block" && (
        <Text
          accessibilityRole="alert"
          className="mt-3 font-sans-semibold text-base text-danger"
        >
          {t("eligibility.blocked")}
        </Text>
      )}
      {outcome === "warn" && (
        <>
          <Text className="mt-3 font-sans-semibold text-base text-ink">
            {t("eligibility.warning")}
          </Text>
          <Check
            label={t("eligibility.acknowledge")}
            checked={acknowledgedWarnings}
            onPress={() =>
              update({
                acknowledgedWarnings: !acknowledgedWarnings,
                attested: false,
              })
            }
          />
        </>
      )}
      {(outcome === "pass" || (outcome === "warn" && acknowledgedWarnings)) && (
        <Check
          label={t("eligibility.attest")}
          checked={attested}
          onPress={() => update({ attested: !attested })}
        />
      )}
    </Step>
  );
}
