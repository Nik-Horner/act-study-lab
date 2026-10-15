import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/lib/act/calculator";
import {
  finalizeSession,
  remainingSeconds,
  validateSession,
} from "../src/lib/act/exam-session";
import type { Exam } from "../src/lib/act/types";
test("calculator obeys precedence, powers, unary signs, functions and angle mode", () => {
  assert.equal(calculate("2+3*4"), 14);
  assert.equal(calculate("(2+3)*4"), 20);
  assert.equal(calculate("2^3^2"), 512);
  assert.equal(calculate("-2^2"), -4);
  assert.equal(calculate("sqrt(81)+25%"), 9.25);
  assert.ok(Math.abs(calculate("sin(30)") - 0.5) < 1e-10);
  assert.ok(Math.abs(calculate("sin(pi/2)", false) - 1) < 1e-10);
  assert.equal(calculate("log(100)"), 2);
});
test("calculator rejects code, syntax errors and nonfinite arithmetic", () => {
  for (const s of [
    "alert(1)",
    "1;2",
    "2(3)",
    "sqrt(-1)",
    "tan(90)",
    "1/0",
    "2+",
    "(3",
  ])
    assert.throws(() => calculate(s));
});
const exam: Exam = {
  id: "math-1",
  title: "Math",
  subject: "math",
  minutes: 50,
  questionIds: ["a", "b"],
  description: "",
};
const session = {
  id: "session1",
  ownerId: "account-a",
  examId: exam.id,
  startedAt: "2026-10-05T12:00:00.000Z",
  deadline: Date.parse("2026-10-05T12:50:00.000Z"),
  finishedAt: null,
  answers: { a: 1 },
  flags: ["b"],
  eliminated: { b: [0] },
  index: 1,
};
test("absolute deadline cannot reset on reload or go negative", () => {
  assert.equal(
    remainingSeconds(session.deadline, Date.parse("2026-10-05T12:10:00.000Z")),
    2400,
  );
  assert.equal(remainingSeconds(session.deadline, session.deadline + 100), 0);
  assert.equal(remainingSeconds(1001, 1000), 1);
});
test("saved section validates correct format, questions, deadline and answer choices", () => {
  assert.deepEqual(validateSession(session, exam, session.ownerId), session);
  assert.equal(
    validateSession(
      { ...session, deadline: session.deadline + 1000 },
      exam,
      session.ownerId,
    ),
    null,
  );
  assert.equal(
    validateSession({ ...session, answers: { a: 4 } }, exam, session.ownerId),
    null,
  );
  assert.equal(
    validateSession({ ...session, flags: ["c"] }, exam, session.ownerId),
    null,
  );
  assert.equal(
    validateSession({ ...session, index: 2 }, exam, session.ownerId),
    null,
  );
});
test("sections retain their original owner and legacy drafts upgrade only from that account's key", () => {
  assert.equal(validateSession(session, exam, "account-b"), null);
  const { ownerId, finishedAt, ...legacy } = session;
  assert.deepEqual(validateSession(legacy, exam, ownerId), {
    ...legacy,
    ownerId,
    finishedAt,
  });
});
test("finalized section answers and elapsed time remain fixed through a failed save and reload", () => {
  const ended = Date.parse("2026-10-05T12:10:00.000Z");
  const finalized = finalizeSession(session, ended);
  assert.equal(finalized.finishedAt, ended);
  assert.notEqual(finalized.answers, session.answers);
  const restored = validateSession(
    JSON.parse(JSON.stringify(finalized)),
    exam,
    session.ownerId,
  )!;
  assert.deepEqual(finalizeSession(restored, ended + 60000), finalized);
  assert.equal(
    finalizeSession(session, session.deadline + 1000).finishedAt,
    session.deadline,
  );
  assert.equal(
    validateSession(
      { ...session, finishedAt: session.deadline + 1 },
      exam,
      session.ownerId,
    ),
    null,
  );
});
