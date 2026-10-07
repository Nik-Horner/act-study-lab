import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  cloudInsert,
  hydrateCloudState,
  validateCloudRecord,
} from "../src/lib/act/cloud-records";
import {
  getQuestions,
  getExamQuestions,
  getExams,
} from "../src/lib/act/content";
import type { AnswerRecord } from "../src/lib/act/progress-model";
import type { Tables } from "../src/lib/supabase/database.types";
const q = getQuestions("reading-inference")[0];
const event = (change: Partial<AnswerRecord> = {}) => ({
  id: randomUUID(),
  questionId: q.id,
  chosen: q.answer,
  elapsedMs: 12000,
  confidence: "high" as const,
  cause: null,
  at: "2026-10-06T21:00:00Z",
  mode: "drill" as const,
  ...change,
});
test("cloud records validate real questions, valid UUIDs, choices, mode and timing", () => {
  assert(validateCloudRecord({ kind: "answer", event: event() }));
  for (const bad of [
    event({ id: "invented" }),
    event({ questionId: "not-real" }),
    event({ chosen: 4 }),
    event({ elapsedMs: -1 }),
    event({ mode: "exam" }),
  ])
    assert.equal(validateCloudRecord({ kind: "answer", event: bad }), null);
  assert.equal(
    validateCloudRecord({
      kind: "answer",
      event: event({ questionId: getExamQuestions("reading-1")[0].id }),
    }),
    null,
  );
});
test("server grading ignores forged correctness and grades blanks as misses", () => {
  const record = validateCloudRecord({
    kind: "answer",
    event: { ...event({ chosen: (q.answer + 1) % 4 }), correct: true },
  })!;
  const row = cloudInsert(record, randomUUID());
  assert.equal(row.raw_correct, 0);
  assert.equal(row.raw_total, 1);
  assert.equal(row.scale_score, 0);
  assert.equal(row.exam_id, "practice:reading");
  const attempt = {
    id: randomUUID(),
    examId: "reading-1",
    startedAt: "2026-10-06T20:00:00Z",
    completedAt: "2026-10-06T20:40:00Z",
    elapsedSeconds: 2400,
    answers: {
      [getExamQuestions("reading-1")[0].id]:
        getExamQuestions("reading-1")[0].answer,
    },
  };
  const saved = validateCloudRecord({ kind: "exam", attempt })!;
  assert.equal(cloudInsert(saved, randomUUID()).raw_correct, 1);
  assert.equal(cloudInsert(saved, randomUUID()).raw_total, 36);
  assert.equal(
    validateCloudRecord({
      kind: "exam",
      attempt: { ...attempt, elapsedSeconds: 2401 },
    }),
    null,
  );
  assert.equal(
    validateCloudRecord({
      kind: "exam",
      attempt: {
        ...attempt,
        answers: { ...attempt.answers, "other-question": 0 },
      },
    }),
    null,
  );
});
test("cloud hydration preserves account settings and check dates in the student time zone", () => {
  const record = { kind: "answer" as const, event: event() };
  const profile = {
    test_date: "2026-12-12",
    target_score: 35,
  } as Tables<"profiles">;
  const checks = [
    {
      item_key: "2026-10-05:reading-diagnostic",
      checked_at: "2026-10-07T02:00:00Z",
    },
  ] as Tables<"plan_checks">[];
  const state = hydrateCloudState(
    [
      { answers: record },
      { answers: record },
      { answers: { legacy: true } },
    ] as unknown as Pick<Tables<"exam_attempts">, "answers">[],
    profile,
    checks,
    "America/Chicago",
  );
  assert.equal(state.profile.testDate, "2026-12-12");
  assert.equal(state.profile.targetScore, 35);
  assert.equal(state.profile.mathBaseline, null);
  assert.equal(state.profile.scienceBaseline, null);
  assert.equal(state.answers.length, 1);
  assert.equal(state.planCheckDates?.[checks[0].item_key], "2026-10-06");
  assert.equal(state.planStartDate, "2026-11-30");
});
test("every non-English subject has two correctly timed held-out forms", () => {
  for (const subject of ["math", "science", "reading"] as const) {
    const exams = getExams(subject);
    assert.equal(exams.length, 2);
    for (const exam of exams) {
      assert.equal(exam.minutes, subject === "math" ? 50 : 40);
      assert.equal(
        exam.questionIds.length,
        subject === "math" ? 45 : subject === "reading" ? 36 : 40,
      );
      const drillIds = new Set(getQuestions().map((q) => q.id));
      assert(exam.questionIds.every((id) => !drillIds.has(id)));
    }
  }
});

test("subject baseline never mislabels Science as Reading", async () => {
  const { subjectBaseline, createDefaultState } =
    await import("../src/lib/act/progress-model");
  const profile = {
    ...createDefaultState().profile,
    mathBaseline: 34,
    scienceBaseline: 27,
  };
  assert.equal(subjectBaseline(profile, "math"), 34);
  assert.equal(subjectBaseline(profile, "science"), 27);
  assert.equal(subjectBaseline(profile, "reading"), null);
});
