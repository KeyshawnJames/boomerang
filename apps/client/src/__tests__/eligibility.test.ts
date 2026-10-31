import type { EligibilityQuestionRead } from "api";

import { preview } from "../eligibility";

const questions: EligibilityQuestionRead[] = [
  {
    code: "sealed",
    prompt: "Is it sealed?",
    help: null,
    options: [
      { value: "yes", label: "Yes", outcome: "pass" },
      { value: "no", label: "No", outcome: "block" },
      { value: "not_sure", label: "Not sure", outcome: "warn" },
    ],
  },
  {
    code: "label_ready",
    prompt: "Do you have the label?",
    help: null,
    options: [
      { value: "yes", label: "Yes", outcome: "pass" },
      { value: "no", label: "No", outcome: "block" },
    ],
  },
];

test("every answer passing passes", () => {
  expect(preview(questions, { sealed: "yes", label_ready: "yes" })).toBe(
    "pass",
  );
});

test("one warning makes the whole set a warning", () => {
  expect(preview(questions, { sealed: "not_sure", label_ready: "yes" })).toBe(
    "warn",
  );
});

test("one block makes the whole set blocked, even over a warning", () => {
  expect(preview(questions, { sealed: "not_sure", label_ready: "no" })).toBe(
    "block",
  );
});

test("a block shows before every question is answered", () => {
  expect(preview(questions, { sealed: "no" })).toBe("block");
});

test("an unanswered question leaves no verdict yet", () => {
  expect(preview(questions, { sealed: "yes" })).toBeNull();
});

test("an answer from an older question set doesn't count", () => {
  expect(
    preview(questions, { sealed: "yes", label_ready: "maybe", gone: "no" }),
  ).toBeNull();
});
