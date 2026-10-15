import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readScoreCheck,
  scoreCheckEvidence,
  scoreCheckId,
  validateScoreCheck,
  type ScoreCheck,
} from "../src/lib/score-checks";

const today = "2026-10-12";
const check = (changes: Partial<ScoreCheck> = {}): ScoreCheck => ({
  id: "12345678-1234-8234-8234-123456789012",
  subject: "math",
  score: 35,
  formName: "ACT form A",
  date: today,
  official: true,
  timed: true,
  firstAttempt: true,
  recordedAt: "2026-10-12T15:00:00.000Z",
  ...changes,
});

test("score checks validate section, score, date, form and explicit confirmations", () => {
  const valid = validateScoreCheck(
    check({ formName: "  ACT   form A  " }),
    today,
  )!;
  assert.equal(valid.formName, "ACT form A");
  assert.equal("id" in valid, false);
  assert(validateScoreCheck(check({ timed: false }), today));
  for (const invalid of [
    null,
    [],
    {},
    { ...check(), subject: "writing" },
    { ...check(), score: "35" },
    check({ score: 0 }),
    check({ score: 37 }),
    check({ score: 35.5 }),
    check({ formName: " " }),
    check({ formName: "a".repeat(101) }),
    check({ date: "2026-02-30" }),
    check({ date: "2026-10-13" }),
    check({ date: "2026-1-01" }),
    check({ date: "2026-10-12T12:00:00Z" }),
    { ...check(), official: undefined },
    { ...check(), timed: "true" },
    { ...check(), firstAttempt: null },
  ])
    assert.equal(validateScoreCheck(invalid, today), null);
});

test("stored records require a valid ID and server timestamp", () => {
  assert.deepEqual(readScoreCheck(check(), today), check());
  assert.equal(readScoreCheck(check({ id: "bad" }), today), null);
  assert.equal(readScoreCheck(check({ recordedAt: "tomorrow" }), today), null);
});

test("form corrections use the same key, scoped to the owner and section", async () => {
  const id = await scoreCheckId("owner-1", "math", "ACT form A");
  assert.equal(id, await scoreCheckId("owner-1", "math", "  act  FORM a  "));
  assert.notEqual(id, await scoreCheckId("owner-2", "math", "ACT form A"));
  assert.notEqual(id, await scoreCheckId("owner-1", "english", "ACT form A"));
  assert(readScoreCheck(check({ id }), today));
});

test("only the latest two distinct fresh official timed forms support the target", () => {
  const evidence = scoreCheckEvidence(
    [
      check({ formName: "A", date: "2026-10-08", score: 36 }),
      check({ formName: "B", date: "2026-10-09", score: 36 }),
      check({ formName: "C", date: "2026-10-10", score: 30 }),
      check({ formName: "D", date: "2026-10-11", score: 32 }),
      check({ formName: "E", timed: false }),
      check({ formName: "F", firstAttempt: false }),
      check({ formName: "G", official: false }),
      check({ formName: "old", subject: "english", date: "2026-09-12" }),
    ],
    35,
    today,
  );
  assert.deepEqual(
    evidence.math.checks.map((entry) => entry.formName),
    ["D", "C"],
  );
  assert.equal(evidence.math.targetHits, 0);
  assert.equal(evidence.english.checks.length, 0);
  assert.equal(evidence.reading.targetHits, 0);
});

test("duplicate forms cannot manufacture two hits and recency includes the last 30 dates", () => {
  const evidence = scoreCheckEvidence(
    [
      check({ formName: "form A", score: 34 }),
      check({ formName: " FORM   a ", date: "2026-10-11", score: 36 }),
      check({ formName: "B", date: "2026-09-13", score: 36 }),
      check({ formName: "C", date: "2026-09-12", score: 36 }),
      check({ formName: "future", date: "2026-10-13", score: 36 }),
    ],
    35,
    today,
  ).math;
  assert.equal(evidence.checks.length, 2);
  assert.equal(evidence.targetHits, 1);
  assert.equal(evidence.checks[0].score, 34);
  assert.equal(evidence.checks[1].formName, "B");
});
