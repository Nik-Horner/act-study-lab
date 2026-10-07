import { test } from "node:test";
import assert from "node:assert/strict";
import {
  QUESTION_TARGET_SECONDS,
  answerPacing,
} from "../src/lib/question-pacing";
test("question targets preserve English Lab and use the configured digital section averages", () => {
  assert.deepEqual(QUESTION_TARGET_SECONDS, {
    english: 42,
    math: 67,
    reading: 67,
    science: 60,
  });
});
test("feedback preserves the saved duration and marks answers above target as slow", () => {
  assert.deepEqual(answerPacing(12000, "english"), {
    seconds: 12,
    target: 42,
    onPace: true,
  });
  assert.deepEqual(answerPacing(43000, "english"), {
    seconds: 43,
    target: 42,
    onPace: false,
  });
  assert.equal(answerPacing(68000, "math").onPace, false);
  assert.equal(answerPacing(60000, "science").onPace, true);
  assert.equal(answerPacing(68000, "reading").onPace, false);
});
