import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getExam } from "../src/lib/content";
import { remainingSeconds } from "../src/lib/act/exam-session";
import {
  ENGLISH_EXAM_SECONDS,
  englishExamStorageKey,
  englishExamSubmission,
  newEnglishExamSession,
  validateEnglishExamSession,
  validateEnglishExamSubmission,
} from "../src/lib/english-exam-session";

const exam = getExam("exam-1");
const owner = randomUUID();
const now = Date.parse("2026-10-12T19:00:00Z");
const question = exam.passages[0].questions[0];

test("English reload keeps answers, flags, position, attempt ID and original deadline", () => {
  const session = newEnglishExamSession(exam, owner, now);
  session.answers[question.number] = 2;
  session.flags = [question.number];
  session.activeQuestion = exam.passages[0].questions[1].number;
  const restored = validateEnglishExamSession(
    JSON.parse(JSON.stringify(session)),
    exam,
    owner,
    now + 120_000,
  )!;
  assert.deepEqual(restored, session);
  assert.equal(
    remainingSeconds(restored.deadline, now + 120_000),
    ENGLISH_EXAM_SECONDS - 120,
  );
  assert.equal(remainingSeconds(restored.deadline, now + 3_600_000), 0);
  assert.notEqual(
    englishExamStorageKey(owner, exam.id),
    englishExamStorageKey(randomUUID(), exam.id),
  );
  assert.equal(
    validateEnglishExamSession(session, exam, randomUUID(), now),
    null,
  );
});

test("submission retries retain their original identity, answers and duration", () => {
  const session = newEnglishExamSession(exam, owner, now);
  session.answers[question.number] = 1;
  session.finishedAt = now + 123_456;
  const first = englishExamSubmission(session);
  const restored = validateEnglishExamSession(
    JSON.parse(JSON.stringify(session)),
    exam,
    owner,
    now + 60_000_000,
  )!;
  assert.deepEqual(englishExamSubmission(restored), first);
  assert.equal(first.attemptId, session.id);
  assert.equal(first.durationSeconds, 123);
  assert(validateEnglishExamSubmission(first, exam));
});

test("malformed saved sessions cannot reset the clock or import foreign question state", () => {
  const session = newEnglishExamSession(exam, owner, now);
  for (const bad of [
    null,
    [],
    {},
    { ...session, id: "not-a-uuid" },
    { ...session, examId: "another-exam" },
    { ...session, deadline: session.deadline + 1000 },
    { ...session, startedAt: now + 1 },
    { ...session, finishedAt: session.deadline + 1 },
    { ...session, finishedAt: now - 1 },
    { ...session, answers: [] },
    { ...session, answers: { 99999: 0 } },
    { ...session, answers: { [question.number]: 4 } },
    { ...session, flags: [question.number, question.number] },
    { ...session, flags: [99999] },
    { ...session, activeQuestion: 99999 },
  ])
    assert.equal(validateEnglishExamSession(bad, exam, owner, now), null);
});

test("exam submissions reject malformed, duplicate, unknown and out-of-range answers", () => {
  const valid = {
    attemptId: randomUUID(),
    ownerId: owner,
    examId: exam.id,
    durationSeconds: 10,
    answers: [{ number: question.number, picked: null }],
  };
  assert(validateEnglishExamSubmission(valid, exam));
  assert(validateEnglishExamSubmission({ ...valid, answers: [] }, exam));
  for (const bad of [
    null,
    [],
    {},
    { ...valid, attemptId: "bad" },
    { ...valid, ownerId: "bad" },
    { ...valid, examId: "wrong" },
    ...[-1, 10.5, ENGLISH_EXAM_SECONDS + 1, NaN, Infinity, "10", null].map(
      (durationSeconds) => ({ ...valid, durationSeconds }),
    ),
    { ...valid, answers: null },
    { ...valid, answers: [null] },
    { ...valid, answers: [[], {}] },
    { ...valid, answers: [valid.answers[0], valid.answers[0]] },
    { ...valid, answers: [{ number: 99999, picked: 0 }] },
    { ...valid, answers: [{ number: String(question.number), picked: 0 }] },
    ...[-1, 4, 1.5, "1", undefined].map((picked) => ({
      ...valid,
      answers: [{ number: question.number, picked }],
    })),
  ])
    assert.equal(validateEnglishExamSubmission(bad, exam), null);
});
