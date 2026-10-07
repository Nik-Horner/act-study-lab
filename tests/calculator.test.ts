import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/lib/act/calculator";
import { remainingSeconds, validateSession } from "../src/lib/act/exam-session";
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
  examId: exam.id,
  startedAt: "2026-10-05T12:00:00.000Z",
  deadline: Date.parse("2026-10-05T12:50:00.000Z"),
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
  assert.deepEqual(validateSession(session, exam), session);
  assert.equal(
    validateSession({ ...session, deadline: session.deadline + 1000 }, exam),
    null,
  );
  assert.equal(validateSession({ ...session, answers: { a: 4 } }, exam), null);
  assert.equal(validateSession({ ...session, flags: ["c"] }, exam), null);
  assert.equal(validateSession({ ...session, index: 2 }, exam), null);
});
