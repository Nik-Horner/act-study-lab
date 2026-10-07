import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultState,
  getTopicStats,
  recordAnswer,
  recordExam,
  setPlanTaskComplete,
  validateState,
} from "../src/lib/act/progress-model";
import type { AnswerRecord, ExamAttempt } from "../src/lib/act/progress-model";
import type { Question } from "../src/lib/act/types";

const question = (
  id: string,
  difficulty: Question["difficulty"] = "medium",
): Question => ({
  id,
  topic: "math-algebra",
  subject: "math",
  category: "Algebra",
  difficulty,
  stem: "",
  questionText: "Solve",
  choices: ["1", "2", "3", "4"],
  answer: 1,
  explanation: "Explanation",
});
const answer = (
  id: string,
  questionId: string,
  chosen: number | null = 1,
  at = "2026-10-05T12:00:00Z",
): AnswerRecord => ({
  id,
  questionId,
  chosen,
  elapsedMs: 2000,
  confidence: "medium",
  cause: null,
  at,
  mode: "drill",
});

test("default profile uses the actual preparation target and round-trips", () => {
  const initial = createDefaultState();
  assert.equal(initial.profile.testDate, "2026-10-17");
  assert.equal(initial.profile.mathBaseline, 34);
  assert.equal(initial.profile.scienceBaseline, 27);
  assert.equal(initial.profile.minutesPerDay, 75);
  assert.equal(initial.planStartDate, "2026-10-05");
  assert.deepEqual(initial.planCheckDates, {});
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(initial))), initial);
  createDefaultState().answers.push(answer("temporary", "q1"));
  assert.deepEqual(createDefaultState().answers, []);
  initial.planCheckDates!["temporary"] = "2026-10-06";
  assert.deepEqual(createDefaultState().planCheckDates, {});
});

test("legacy backups normalize scheduler metadata without losing study history", () => {
  const seeded = recordExam(
    recordAnswer(createDefaultState(), answer("saved-drill", "q1")),
    {
      id: "saved-exam",
      examId: "math-1",
      startedAt: "2026-10-05T12:00:00Z",
      completedAt: "2026-10-05T12:50:00Z",
      elapsedSeconds: 3000,
      answers: { q2: 1 },
    },
    [question("q2")],
  );
  const legacy = {
    version: seeded.version,
    profile: seeded.profile,
    answers: seeded.answers,
    attempts: seeded.attempts,
    planChecks: ["2026-10-05:science-diagnostic", "2026-10-06:math-hard"],
  };
  const normalized = validateState(JSON.parse(JSON.stringify(legacy)));
  assert.ok(normalized);
  assert.equal(normalized.planStartDate, "2026-10-05");
  assert.deepEqual(normalized.planCheckDates, {});
  assert.deepEqual(normalized.profile, legacy.profile);
  assert.deepEqual(normalized.answers, legacy.answers);
  assert.deepEqual(normalized.attempts, legacy.attempts);
  assert.deepEqual(normalized.planChecks, legacy.planChecks);
  assert.deepEqual(
    validateState(JSON.parse(JSON.stringify(normalized))),
    normalized,
  );
});

test("legacy start inference keeps earlier valid task dates and ignores impossible dates", () => {
  const initial = createDefaultState();
  const legacy = {
    ...initial,
    planStartDate: undefined,
    planCheckDates: undefined,
    planChecks: [
      "2026-10-06:math-hard",
      "2026-09-24:science-review",
      "2026-02-30:invalid-calendar",
      "2026-09-20:math-review",
      "not-a-date:other",
    ],
  };
  assert.equal(validateState(legacy)?.planStartDate, "2026-09-20");
  assert.equal(
    validateState({ ...legacy, planStartDate: "2026-10-07" })?.planStartDate,
    "2026-10-07",
  );
  assert.equal(
    validateState({ ...legacy, planChecks: ["2026-10-09:later"] })
      ?.planStartDate,
    "2026-10-05",
  );
});

test("scheduler metadata rejects malformed dates, maps and orphan task entries", () => {
  const initial = createDefaultState();
  const id = "2026-10-05:science-diagnostic";
  const checked = { ...initial, planChecks: [id] };
  for (const planStartDate of [
    null,
    42,
    "",
    "10/05/2026",
    "2026-02-29",
    "2026-13-01",
  ]) {
    assert.equal(validateState({ ...checked, planStartDate }), null);
  }
  assert.equal(
    validateState({ ...checked, planStartDate: "2024-02-29" })?.planStartDate,
    "2024-02-29",
  );
  for (const planCheckDates of [null, [], "2026-10-06", 42]) {
    assert.equal(validateState({ ...checked, planCheckDates }), null);
  }
  for (const date of [null, 42, "", "2026-02-30", "2026-10-06T12:00:00Z"]) {
    assert.equal(
      validateState({ ...checked, planCheckDates: { [id]: date } }),
      null,
    );
  }
  assert.equal(
    validateState({ ...checked, planCheckDates: { orphan: "2026-10-06" } }),
    null,
  );
  assert.equal(
    validateState({ ...checked, planCheckDates: { " ": "2026-10-06" } }),
    null,
  );
  assert.equal(
    validateState({
      ...checked,
      planCheckDates: { ["x".repeat(201)]: "2026-10-06" },
    }),
    null,
  );
  const planChecks = Array.from({ length: 10_000 }, (_, i) => `task-${i}`);
  const planCheckDates = Object.fromEntries(
    planChecks.map((key) => [key, "2026-10-06"]),
  );
  assert.ok(validateState({ ...initial, planChecks, planCheckDates }));
  assert.equal(
    validateState({
      ...initial,
      planChecks,
      planCheckDates: { ...planCheckDates, overflow: "2026-10-06" },
    }),
    null,
  );
});

test("plan completion stores the actual day, stays immutable and preserves unrelated state", () => {
  const initial = recordAnswer(createDefaultState(), answer("one", "q1"));
  const id = "2026-10-05:science-diagnostic";
  const next = setPlanTaskComplete(initial, id, true, "2026-10-07");
  assert.deepEqual(initial.planChecks, []);
  assert.deepEqual(initial.planCheckDates, {});
  assert.deepEqual(next.planChecks, [id]);
  assert.deepEqual(next.planCheckDates, { [id]: "2026-10-07" });
  assert.equal(next.answers, initial.answers);
  assert.equal(next.attempts, initial.attempts);
  assert.equal(next.profile, initial.profile);
  assert.equal(next.planStartDate, initial.planStartDate);
  assert.equal(setPlanTaskComplete(next, id, true, "2026-10-08"), next);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(next))), next);

  const otherId = "2026-10-06:math-hard";
  const both = setPlanTaskComplete(next, otherId, true, "2026-10-08");
  const undone = setPlanTaskComplete(both, id, false, "2026-10-09");
  assert.deepEqual(undone.planChecks, [otherId]);
  assert.deepEqual(undone.planCheckDates, { [otherId]: "2026-10-08" });
  assert.deepEqual(both.planCheckDates, {
    [id]: "2026-10-07",
    [otherId]: "2026-10-08",
  });
  assert.equal(setPlanTaskComplete(undone, id, false, "2026-10-10"), undone);
  const redone = setPlanTaskComplete(undone, id, true, "2026-10-11");
  assert.equal(redone.planCheckDates?.[id], "2026-10-11");
});

test("legacy checked tasks remain idempotent without inventing a completion day", () => {
  const id = "2026-10-05:science-diagnostic";
  const legacy = {
    ...createDefaultState(),
    planChecks: [id],
    planCheckDates: undefined,
  };
  assert.equal(setPlanTaskComplete(legacy, id, true, "2026-10-07"), legacy);
  const undone = setPlanTaskComplete(legacy, id, false, "2026-10-07");
  assert.deepEqual(undone.planCheckDates, {});
  assert.deepEqual(undone.planChecks, []);
});

test("plan completion validates task IDs and calendar days before accepting metadata", () => {
  const initial = createDefaultState();
  assert.throws(() => setPlanTaskComplete(initial, " ", true, "2026-10-07"));
  assert.throws(() =>
    setPlanTaskComplete(initial, "x".repeat(201), true, "2026-10-07"),
  );
  assert.throws(() => setPlanTaskComplete(initial, "task", true, "2026-02-30"));
  assert.throws(() =>
    setPlanTaskComplete(initial, "task", true, "2026-10-07T12:00:00Z"),
  );
});

test("identifier-like object keys round-trip as data without changing object prototypes", () => {
  const initial = createDefaultState();
  const next = setPlanTaskComplete(initial, "__proto__", true, "2026-10-07");
  const restored = validateState(JSON.parse(JSON.stringify(next)));
  assert.ok(restored);
  assert.equal(restored.planCheckDates?.["__proto__"], "2026-10-07");
  assert.equal(
    Object.getPrototypeOf(restored.planCheckDates),
    Object.prototype,
  );
  assert.deepEqual(
    setPlanTaskComplete(restored, "__proto__", false, "2026-10-08")
      .planCheckDates,
    {},
  );
});

test("untrusted imports reject impossible dates, scores, choices, timing, and duplicate IDs", () => {
  const initial = createDefaultState();
  for (const testDate of ["2026-02-30", "2026-13-01", "10/17/2026"]) {
    assert.equal(
      validateState({ ...initial, profile: { ...initial.profile, testDate } }),
      null,
    );
  }
  assert.equal(validateState({ ...initial, version: 2 }), null);
  assert.equal(
    validateState({
      ...initial,
      profile: { ...initial.profile, mathBaseline: 37 },
    }),
    null,
  );
  assert.equal(
    validateState({
      ...initial,
      profile: { ...initial.profile, minutesPerDay: Number.NaN },
    }),
    null,
  );
  const valid = answer("one", "q1");
  for (const chosen of [-1, 1.5, 4, 9, "1"]) {
    assert.equal(
      validateState({ ...initial, answers: [{ ...valid, chosen }] }),
      null,
    );
  }
  assert.equal(
    validateState({ ...initial, answers: [{ ...valid, elapsedMs: -1 }] }),
    null,
  );
  assert.equal(validateState({ ...initial, answers: [valid, valid] }), null);
  assert.equal(
    validateState({ ...initial, planChecks: ["same", "same"] }),
    null,
  );
  assert.equal(
    validateState({
      ...initial,
      answers: [{ ...valid, confidence: "certain" }],
    }),
    null,
  );
  const badAttempt: ExamAttempt = {
    id: "bad",
    examId: "math-1",
    startedAt: valid.at,
    completedAt: valid.at,
    elapsedSeconds: 0,
    answers: { q1: 4 },
  };
  assert.equal(validateState({ ...initial, attempts: [badAttempt] }), null);
});

test("answer recording is immutable and idempotent", () => {
  const initial = createDefaultState();
  const next = recordAnswer(initial, answer("one", "q1"));
  assert.equal(initial.answers.length, 0);
  assert.equal(next.answers.length, 1);
  assert.equal(recordAnswer(next, answer("one", "q1", 0)), next);
});

test("repetition of one easy question cannot produce mastery", () => {
  const questions = [question("q1", "easy")];
  const records = Array.from({ length: 30 }, (_, index) =>
    answer(`a${index}`, "q1"),
  );
  const stats = getTopicStats("math-algebra", questions, records);
  assert.equal(stats.attempted, 30);
  assert.equal(stats.unique, 1);
  assert.equal(stats.accuracy, 1);
  assert.equal(stats.mastered, false);
});

test("mastery needs six distinct answers and two hard successes; a later miss revokes it", () => {
  const questions = Array.from({ length: 6 }, (_, index) =>
    question(`q${index}`, index < 2 ? "hard" : "medium"),
  );
  const records = questions.map((item, index) => answer(`a${index}`, item.id));
  assert.equal(
    getTopicStats("math-algebra", questions, records).mastered,
    true,
  );
  assert.equal(
    getTopicStats(
      "math-algebra",
      questions.map((item) => ({ ...item, difficulty: "easy" })),
      records,
    ).mastered,
    false,
  );
  const laterMiss = answer("miss", "q0", 0, "2026-10-06T12:00:00Z");
  const stats = getTopicStats("math-algebra", questions, [
    ...records,
    laterMiss,
  ]);
  assert.equal(stats.mastered, false);
  assert.equal(stats.accuracy, 5 / 6);
  assert.deepEqual(stats.unresolvedIds, ["q0"]);
  const corrected = answer("fixed", "q0", 1, "2026-10-07T12:00:00Z");
  assert.deepEqual(
    getTopicStats("math-algebra", questions, [...records, corrected, laterMiss])
      .unresolvedIds,
    [],
  );
});

test("exam recording commits all questions, counts skips as misses, and is idempotent", () => {
  const initial = createDefaultState();
  const questions = [question("q1"), question("q2"), question("q3")];
  const attempt: ExamAttempt = {
    id: "exam-attempt",
    examId: "math-1",
    startedAt: "2026-10-05T12:00:00Z",
    completedAt: "2026-10-05T12:50:00Z",
    elapsedSeconds: 3000,
    answers: { q1: 1, q2: 0 },
  };
  const next = recordExam(initial, attempt, questions);
  assert.equal(initial.attempts.length, 0);
  assert.equal(next.attempts.length, 1);
  assert.equal(next.answers.length, 3);
  assert.equal(next.attempts[0].answers.q3, null);
  assert.ok(
    next.answers.every(
      (item) => item.mode === "exam" && item.attemptId === attempt.id,
    ),
  );
  assert.equal(recordExam(next, attempt, questions), next);
  const stats = getTopicStats("math-algebra", questions, next.answers);
  assert.equal(stats.accuracy, 1 / 3);
  assert.equal(stats.unique, 2);
  assert.deepEqual(stats.unresolvedIds, ["q2", "q3"]);
  assert.deepEqual(validateState(next), next);
});
