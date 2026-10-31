import type {
  AnswerOutcome,
  EligibilityQuestionRead,
  QuestionOption,
} from "api";

// The option picked for each answered question, in question order.
export function chosenOptions(
  questions: EligibilityQuestionRead[],
  answers: Record<string, string>,
): { question: EligibilityQuestionRead; option: QuestionOption }[] {
  return questions.flatMap((question) => {
    const option = question.options.find(
      (o) => o.value === answers[question.code],
    );
    return option ? [{ question, option }] : [];
  });
}

// A preview only: POST /returns decides again on the server. A block shows at once; pass or
// warn waits for every answer (null until then).
export function preview(
  questions: EligibilityQuestionRead[],
  answers: Record<string, string>,
): AnswerOutcome | null {
  const outcomes = chosenOptions(questions, answers).map(
    (c) => c.option.outcome,
  );
  if (outcomes.includes("block")) return "block";
  if (outcomes.length < questions.length) return null;
  return outcomes.includes("warn") ? "warn" : "pass";
}
