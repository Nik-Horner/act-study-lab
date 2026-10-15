import { test } from "node:test";
import assert from "node:assert/strict";
import { getQuestions } from "../src/lib/content";
import { validateEnglishDrillAnswer } from "../src/lib/english-drill-answer";

const question = getQuestions("commas")[0];
const input = { topicSlug: "commas", questionId: question.id };

test("English drill correctness comes from the authored answer for current clients", () => {
  assert.equal(
    validateEnglishDrillAnswer({
      ...input,
      chosen: question.answer,
      correct: false,
    })?.correct,
    true,
  );
  assert.equal(
    validateEnglishDrillAnswer({
      ...input,
      chosen: (question.answer + 1) % 4,
      correct: true,
    })?.correct,
    false,
  );
});

test("English answers reject unknown or mismatched topics and invalid choices", () => {
  for (const value of [
    null,
    [],
    { ...input, topicSlug: "invented", chosen: 0 },
    { ...input, topicSlug: "verbs", chosen: 0 },
    { ...input, questionId: "missing", chosen: 0 },
    { ...input, chosen: -1, correct: true },
    { ...input, chosen: 4, correct: true },
    { ...input, chosen: 1.5, correct: true },
    { ...input, chosen: "1", correct: true },
    { ...input, chosen: null, correct: true },
    { ...input, chosen: NaN, correct: true },
    input,
  ])
    assert.equal(validateEnglishDrillAnswer(value), null);
});

test("old open clients retain boolean correctness compatibility for authored questions", () => {
  assert.equal(
    validateEnglishDrillAnswer({ ...input, correct: false })?.correct,
    false,
  );
  assert.equal(
    validateEnglishDrillAnswer({ ...input, correct: true })?.correct,
    true,
  );
  assert.equal(validateEnglishDrillAnswer({ ...input, correct: "true" }), null);
  assert.equal(
    validateEnglishDrillAnswer({
      ...input,
      questionId: "missing",
      correct: true,
    }),
    null,
  );
});
