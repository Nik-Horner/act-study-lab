import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getQuestions } from "../src/lib/content";
import { validateEnglishDrillAnswer } from "../src/lib/english-drill-answer";
import foundations from "../src/content/english-foundation-drills.json";

const question = getQuestions("commas")[0];
const input = {
  answerId: randomUUID(),
  topicSlug: "commas",
  questionId: question.id,
};

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

test("answers require an immutable submission ID and an actual choice", () => {
  for (const value of [
    { ...input, correct: true },
    { ...input, correct: false },
    { ...input, answerId: undefined, chosen: question.answer },
    { ...input, answerId: "invalid", chosen: question.answer },
  ])
    assert.equal(validateEnglishDrillAnswer(value), null);
});
test("focused foundation drills grade authoritatively and cannot move to another topic", () => {
  for (const question of foundations) {
    const value = {
      answerId: randomUUID(),
      topicSlug: question.topic,
      questionId: question.id,
      chosen: question.answer,
    };
    assert.equal(validateEnglishDrillAnswer(value)?.correct, true, question.id);
    assert.equal(
      validateEnglishDrillAnswer({ ...value, topicSlug: "commas" }),
      null,
    );
  }
});
