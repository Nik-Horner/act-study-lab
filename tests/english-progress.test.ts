import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getQuestions } from "../src/lib/content";
import {
  englishProgress,
  type EnglishAnswerRow,
} from "../src/lib/english-progress";
import type { Tables } from "../src/lib/supabase/database.types";

const userId = randomUUID();
const [question, second] = getQuestions("commas");
function answer(q = question, correct = true, second = 1): EnglishAnswerRow {
  const id = randomUUID();
  return {
    id,
    completed_at: `2026-10-14T12:00:0${second}.000Z`,
    answers: {
      answerId: id,
      topicSlug: "commas",
      questionId: q.id,
      chosen: correct ? q.answer : (q.answer + 1) % 4,
      correct: !correct,
    },
  };
}
const baseline: Tables<"topic_progress"> = {
  user_id: userId,
  topic_slug: "commas",
  attempts: 10,
  correct: 8,
  current_streak: 6,
  best_streak: 6,
  last_practiced_at: "2026-10-13T12:00:00.000Z",
};
const legacyMiss: Tables<"question_misses"> = {
  user_id: userId,
  topic_slug: "commas",
  question_id: question.id,
  missed_at: "2026-10-13T12:00:00.000Z",
};

test("concurrent immutable English events both count and preserve legacy mastery", () => {
  const first = answer(),
    next = answer(second, true, 2);
  const result = englishProgress(
    userId,
    [baseline],
    [legacyMiss],
    [next, first, first],
  );
  assert.equal(result.progress[0].attempts, 12);
  assert.equal(result.progress[0].correct, 10);
  assert.equal(result.progress[0].current_streak, 8);
  assert.equal(result.progress[0].best_streak, 8);
  assert.equal(result.misses.length, 0);
  assert.equal(baseline.attempts, 10, "The legacy baseline is never mutated");
});

test("English misses follow answer order and server grading, including legacy misses", () => {
  const wrong = answer(question, false, 1),
    right = answer(question, true, 2),
    other = answer(second, false, 3);
  const result = englishProgress(
    userId,
    [baseline],
    [legacyMiss],
    [other, right, wrong],
  );
  assert.equal(result.progress[0].attempts, 13);
  assert.equal(result.progress[0].correct, 9);
  assert.equal(result.progress[0].current_streak, 0);
  assert.equal(result.progress[0].best_streak, 6);
  assert.deepEqual(
    result.misses.map((miss) => miss.question_id),
    [second.id],
  );
});

test("equal-time English answers use the same stable order on every read", () => {
  const first = answer(question, false),
    next = answer(second, true);
  assert.deepEqual(
    englishProgress(userId, [], [], [first, next]),
    englishProgress(userId, [], [], [next, first]),
  );
});

test("unreadable English history cannot become successful empty progress", () => {
  const valid = answer();
  for (const bad of [
    { ...valid, answers: {} },
    { ...valid, id: randomUUID() },
    { ...valid, completed_at: "invalid" },
  ])
    assert.throws(
      () => englishProgress(userId, [], [], [bad]),
      /could not be read/,
    );
});
