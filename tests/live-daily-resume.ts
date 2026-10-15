/** Explicit integration check: creates an isolated QA account only when email
 * auto-confirmation is enabled. Never writes to an existing student account. */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { makeDailyPlan, type DailyPlan } from "../src/lib/daily-plan";
import { blockUnits, dailyStep, dailyReviewKey } from "../src/lib/daily-flow";
const base = process.env.ACT_TEST_BASE ?? "http://127.0.0.1:3100";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
assert.equal(
  (
    await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then(
      (r) => r.json(),
    )
  ).mailer_autoconfirm,
  true,
);
const jar = new Map<string, string>();
const db = createServerClient(url, key, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (values) =>
      values.forEach(({ name, value }) => jar.set(name, value)),
  },
});
const { data, error } = await db.auth.signUp({
  email: `act-resume-qa-${Date.now()}@example.com`,
  password: randomBytes(32).toString("base64url"),
});
assert.ifError(error);
assert(data.user);
assert(data.session);
async function call(body?: unknown, expectedStatus = 200) {
  const r = await fetch(base + "/api/daily", {
    method: body ? "POST" : "GET",
    headers: {
      Cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; "),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json();
  assert.equal(r.status, expectedStatus, JSON.stringify(json));
  return json as {
    plan: DailyPlan;
    answers: Record<string, number>;
    answerTimes: Record<string, number>;
    uncertainAnswers: Record<string, boolean>;
    lessons: string[];
    deadline: number | null;
    saved: boolean;
    goal: { targetScore: number; testDate: string };
    includeScience: boolean;
    coverage?: { covered: number };
  };
}
const settings = {
  scores: { english: 34, math: 34, reading: 33, science: 27 },
  minutesPerDay: 90,
};
const profile = await db
  .from("profiles")
  .update({
    display_name: "Isolated resume QA",
    current_score: 34,
    target_score: 36,
    test_date: "2026-10-17",
  })
  .eq("id", data.user.id);
assert.ifError(profile.error);
assert.ifError(
  (await db.auth.updateUser({ data: { act_study_settings: settings } })).error,
);
const old = makeDailyPlan(
  data.user.id,
  "2026-10-08",
  settings,
  0,
  undefined,
  [],
  { math: 12 },
  { testDate: "2026-10-17", coveredUnits: [] },
);
assert.ifError(
  (
    await db.from("exam_attempts").insert({
      id: old.id,
      user_id: data.user.id,
      exam_id: "daily:plan",
      answers: old as never,
      raw_correct: 0,
      raw_total: 0,
      scale_score: 0,
      duration_seconds: 0,
    })
  ).error,
);
const checks: string[] = [];
for (const block of old.blocks.slice(0, 2)) {
  for (const u of blockUnits(block))
    checks.push(
      u.id,
      ...u.lesson.sections.map((_, i) => `${u.id}:concept:${i}`),
    );
  checks.push(dailyReviewKey(block));
  for (const q of block.questions) {
    assert.ifError(
      (
        await db.from("exam_attempts").insert({
          user_id: data.user.id,
          exam_id:
            q.subject === "english" ? "daily:english" : `practice:${q.subject}`,
          answers: {
            kind: "answer",
            dailyPlanId: old.id,
            event: {
              id: crypto.randomUUID(),
              questionId: q.id,
              chosen: q.answer,
              elapsedMs: 15000,
              confidence: "medium",
              mode: "drill",
              at: new Date().toISOString(),
            },
          },
          raw_correct: 1,
          raw_total: 1,
          scale_score: 0,
          duration_seconds: 15,
        })
      ).error,
    );
  }
}
const math = old.blocks.find((b) => b.subject === "math")!,
  unit = blockUnits(math)[0];
checks.push(`${unit.id}:concept:0`);
assert.ifError(
  (
    await db.from("plan_checks").insert(
      checks.map((k) => ({
        user_id: data.user!.id,
        item_key: `daily:${old.id}:step:${k}`,
      })),
    )
  ).error,
);
let state = await call();
assert.equal(state.plan.id, old.id);
assert(state.saved);
assert.equal(state.deadline, null);
assert.deepEqual(
  state.plan.blocks.find((b) => b.subject === "math")!.units![0].sectionIndices,
  unit.sectionIndices,
);
let step = dailyStep(state.plan, state.answers, state.lessons);
assert(step.kind === "lesson");
assert.equal(step.block.subject, "math");
assert.equal(step.unit.id, unit.id);
assert(state.lessons.includes(`${unit.id}:concept:0`));
const before = { ...state.answers };
state = await call({ action: "start", planId: old.id });
assert.equal(state.plan.id, old.id);
assert(state.deadline);
const deadline = state.deadline;
const current = state.plan.blocks.find((b) => b.subject === "math")!.units![0];
for (let i = 1; i < current.lesson.sections.length; i++)
  state = await call({
    action: "concept",
    planId: old.id,
    unitId: unit.id,
    index: i,
  });
if (current.lesson.sections.length > 1) {
  assert(state.lessons.includes(unit.id));
  assert.equal(
    dailyStep(state.plan, state.answers, state.lessons).kind,
    "drill",
  );
}
state = await call({ action: "lesson", planId: old.id, unitId: unit.id });
step = dailyStep(state.plan, state.answers, state.lessons);
assert(step.kind === "drill");
const q = step.question;
state = await call({
  action: "answer",
  planId: old.id,
  questionId: q.id,
  chosen: q.answer,
  elapsedMs: 25000,
  uncertain: true,
});
assert.equal(state.answers[q.id], q.answer);
assert.equal(state.answerTimes[q.id], 25000);
assert.equal(state.uncertainAnswers[q.id], true);
assert.equal(state.coverage, undefined);
assert.deepEqual(state.goal, { targetScore: 36, testDate: "2026-10-17" });
assert.equal(state.deadline, deadline);
const duplicate = {
  action: "answer",
  planId: old.id,
  questionId: q.id,
  chosen: q.answer,
  elapsedMs: 0,
  uncertain: false,
};
for (const replay of await Promise.all([call(duplicate), call(duplicate)])) {
  assert.equal(replay.answers[q.id], q.answer);
  assert.equal(replay.answerTimes[q.id], 25000);
  assert.equal(replay.uncertainAnswers[q.id], true);
}
await call({ ...duplicate, chosen: (q.answer + 1) % 4 }, 409);
const reloaded = await call();
assert(reloaded.coverage);
assert.equal(reloaded.plan.id, old.id);
assert.equal(reloaded.deadline, deadline);
assert.equal(reloaded.answers[q.id], q.answer);
assert.equal(reloaded.answerTimes[q.id], 25000);
assert.equal(reloaded.uncertainAnswers[q.id], true);
assert(reloaded.lessons.includes(unit.id));
for (const [id, choice] of Object.entries(before))
  assert.equal(reloaded.answers[id], choice);
step = dailyStep(reloaded.plan, reloaded.answers, reloaded.lessons);
assert(step.kind !== "done");
assert.equal(step.block.subject, "math");
if (step.kind === "drill") assert.notEqual(step.question.id, q.id);
const earlier = {
  ...makeDailyPlan(data.user.id, "2026-10-07", settings, 5),
  complete: true,
};
const earlierUnits = earlier.blocks
  .flatMap(blockUnits)
  .map((unit) => unit.courseId ?? unit.id);
assert.ifError(
  (
    await db.from("exam_attempts").insert({
      id: earlier.id,
      user_id: data.user.id,
      exam_id: "daily:plan",
      answers: earlier as never,
      raw_correct: 0,
      raw_total: 0,
      scale_score: 0,
      duration_seconds: 0,
      completed_at: "2026-10-07T12:00:00Z",
    })
  ).error,
);
const legacy = { ...reloaded.plan };
delete legacy.course;
assert.ifError(
  (
    await db
      .from("exam_attempts")
      .update({ answers: legacy as never })
      .eq("id", old.id)
  ).error,
);
const bootstrapped = await call();
assert.equal(bootstrapped.coverage?.covered, new Set(earlierUnits).size);
assert.equal(bootstrapped.answers[q.id], q.answer);
const snapshot = {
  ...bootstrapped.plan,
  course: { testDate: "2026-10-17", coveredUnits: earlierUnits },
};
assert.ifError(
  (
    await db
      .from("exam_attempts")
      .update({ answers: snapshot as never })
      .eq("id", old.id)
  ).error,
);
assert.ifError(
  (await db.from("exam_attempts").delete().eq("id", earlier.id)).error,
);
const fromSnapshot = await call();
for (const id of earlierUnits)
  assert(fromSnapshot.plan.course?.coveredUnits.includes(id));
assert.equal(fromSnapshot.answers[q.id], q.answer);
assert.equal(fromSnapshot.deadline, deadline);
console.log(
  JSON.stringify({
    result: "passed",
    planIdentityPreserved: true,
    priorAnswers: Object.keys(before).length,
    conceptCheckpointPreserved: true,
    mathAnswerAndTimeAndUncertaintySaved: true,
    deadlinePreserved: true,
    immediateAnswerResponseVerified: true,
    concurrentRetriesPreserveOriginalEvidence: true,
    legacyCoverageAndLatestSnapshotPreserved: true,
  }),
);

// Score checkpoints use the same isolated account; a form correction is idempotent.
const scoreHeaders = {
  Cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; "),
  "Content-Type": "application/json",
};
const scoreInput = {
  subject: "math",
  score: 34,
  formName: "Isolated QA form",
  date: new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date()),
  official: true,
  timed: true,
  firstAttempt: true,
};
assert.equal((await fetch(base + "/api/score-checks")).status, 401);
const invalidScore = await fetch(base + "/api/score-checks", {
  method: "POST",
  headers: scoreHeaders,
  body: JSON.stringify({ ...scoreInput, score: 37 }),
});
assert.equal(invalidScore.status, 400);
for (const score of [34, 35]) {
  const response = await fetch(base + "/api/score-checks", {
    method: "POST",
    headers: scoreHeaders,
    body: JSON.stringify({ ...scoreInput, score }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(payload.checks.length, 1);
  assert.equal(payload.checks[0].score, score);
}
const savedScores = await fetch(base + "/api/score-checks", {
  headers: scoreHeaders,
});
assert.equal(savedScores.status, 200);
assert.equal((await savedScores.json()).checks[0].score, 35);
console.log(JSON.stringify({ scoreCheckpointSaveReloadCorrection: "passed" }));

const optionalScience = await fetch(base + "/api/profile", {
  method: "PATCH",
  headers: scoreHeaders,
  body: JSON.stringify({
    study_settings: { ...settings, includeScience: false },
  }),
});
assert.equal(optionalScience.status, 200);
const preserved = await call();
assert.equal(preserved.includeScience, false);
assert.equal(preserved.plan.id, old.id);
assert(preserved.plan.blocks.some((block) => block.subject === "science"));
assert.equal(preserved.answers[q.id], q.answer);
const threeSubjects = await call({ action: "next", planId: old.id });
assert.equal(threeSubjects.includeScience, false);
assert.deepEqual(
  threeSubjects.plan.blocks.map((block) => block.subject),
  ["english", "reading", "math"],
);
assert.equal(
  threeSubjects.plan.blocks.reduce((sum, block) => sum + block.minutes, 0),
  settings.minutesPerDay,
);
assert.equal((await call()).plan.id, threeSubjects.plan.id);
console.log(
  JSON.stringify({
    optionalScienceSavedAndNextSessionUsesThreeSubjects: "passed",
  }),
);

const englishSubmission = {
  attemptId: randomUUID(),
  ownerId: data.user.id,
  examId: "exam-1",
  answers: [{ number: 1, picked: 0 }],
  durationSeconds: 120,
};
async function submitEnglish(body: unknown, status = 200) {
  const response = await fetch(base + "/api/exam/submit", {
    method: "POST",
    headers: scoreHeaders,
    body: JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  return result;
}
const firstEnglish = await submitEnglish(englishSubmission);
const retryEnglish = await submitEnglish({
  ...englishSubmission,
  answers: [{ number: 1, picked: 1 }],
  durationSeconds: 150,
});
assert.equal(firstEnglish.attemptId, englishSubmission.attemptId);
assert.equal(retryEnglish.attemptId, firstEnglish.attemptId);
const englishSaved = await db
  .from("exam_attempts")
  .select("answers,duration_seconds")
  .eq("id", englishSubmission.attemptId)
  .eq("user_id", data.user.id);
assert.ifError(englishSaved.error);
assert.equal(englishSaved.data?.length, 1);
assert.equal(englishSaved.data[0].duration_seconds, 120);
assert.equal(
  (englishSaved.data[0].answers as { number: number; picked: number }[])[0]
    .picked,
  0,
);
for (const invalid of [
  null,
  { ...englishSubmission, answers: [null] },
  {
    ...englishSubmission,
    answers: [englishSubmission.answers[0], englishSubmission.answers[0]],
  },
  { ...englishSubmission, answers: [{ number: 1, picked: 4 }] },
  { ...englishSubmission, durationSeconds: 2101 },
])
  await submitEnglish(invalid, 400);
await submitEnglish({ ...englishSubmission, ownerId: randomUUID() }, 409);
const invalidJson = await fetch(base + "/api/exam/submit", {
  method: "POST",
  headers: scoreHeaders,
  body: "{",
});
assert.equal(invalidJson.status, 400);
console.log(
  JSON.stringify({ englishExamSubmitIdempotencyAndValidation: "passed" }),
);
const legacyExam = await submitEnglish({
  examId: "exam-2",
  answers: [{ number: 1, picked: 0 }],
  durationSeconds: 30,
});
assert.equal(typeof legacyExam.attemptId, "string");
console.log(
  JSON.stringify({ alreadyOpenLegacyEnglishExamCanStillSubmit: "passed" }),
);
