/** Explicit integration check: a new isolated QA account only. Run with
 * node --env-file=.env.local --import tsx tests/live-daily-retry.ts */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import {
  dailyDate,
  makeDailyPlan,
  type DailyPlan,
} from "../src/lib/daily-plan";
import { dailyConcepts, dailyStep } from "../src/lib/daily-flow";

const base = process.env.ACT_TEST_BASE ?? "http://127.0.0.1:3001";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
assert(url && key, "Public Supabase configuration is required.");
assert.equal(
  (
    await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then(
      (response) => response.json(),
    )
  ).mailer_autoconfirm,
  true,
  "Use an auto-confirmed isolated QA account.",
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
  email: `act-retry-qa-${Date.now()}@example.com`,
  password: randomBytes(32).toString("base64url"),
});
assert.ifError(error);
assert(data.user && data.session, "A new signed-in QA account is required.");
const owner = data.user.id;
const today = dailyDate();
const testDate = new Date(Date.parse(today) + 30 * 86400000)
  .toISOString()
  .slice(0, 10);
const settings = {
  minutesPerDay: 23,
  scores: { english: 32, math: 34, reading: 30, science: 27 },
};
assert.ifError(
  (
    await db
      .from("profiles")
      .update({
        display_name: "Isolated retry QA",
        current_score: 32,
        target_score: 36,
        test_date: testDate,
      })
      .eq("id", owner)
  ).error,
);
assert.ifError(
  (await db.auth.updateUser({ data: { act_study_settings: settings } })).error,
);

const generated = makeDailyPlan(
  owner,
  today,
  { ...settings, minutesPerDay: 75 },
  0,
);
const block = generated.blocks.find((item) => item.subject === "math")!;
const sourceUnit = block.units!.find(
  (unit) => (unit.practiceIds?.length ?? 0) >= 4,
)!;
assert(
  sourceUnit,
  "The fixture needs a genuine skill with independent retry questions.",
);
const original = sourceUnit.questions[0];
const unit = { ...sourceUnit, questions: [original] };
const plan: DailyPlan = {
  ...generated,
  id: randomUUID(),
  minutes: settings.minutesPerDay,
  previouslyAnsweredQuestions: [],
  course: {
    testDate,
    targetScore: 36,
    coverageVersion: 1,
    completedSessions: [],
    coveredUnits: [],
  },
  blocks: [
    {
      ...block,
      minutes: settings.minutesPerDay,
      units: [unit],
      reviewUnits: [],
      reviewQuestions: [],
      questions: [original],
    },
  ],
};
assert.ifError(
  (
    await db
      .from("exam_attempts")
      .insert({
        id: plan.id,
        user_id: owner,
        exam_id: "daily:plan",
        answers: plan as never,
        raw_correct: 0,
        raw_total: 0,
        scale_score: 0,
        duration_seconds: 0,
      })
  ).error,
);
const lessons = [
  unit.id,
  ...dailyConcepts(unit).map((index) => `${unit.id}:concept:${index}`),
];
assert.ifError(
  (
    await db
      .from("plan_checks")
      .insert(
        lessons.map((item) => ({
          user_id: owner,
          item_key: `daily:${plan.id}:step:${item}`,
        })),
      )
  ).error,
);

type State = {
  plan: DailyPlan;
  answers: Record<string, number>;
  lessons: string[];
  retryQuestionId?: string | null;
  retryUnavailable?: boolean;
};
let requests = 0;
async function call(
  body?: Record<string, unknown>,
  expected = 200,
): Promise<State> {
  requests++;
  const response = await fetch(base + "/api/daily", {
    method: body ? "POST" : "GET",
    headers: {
      Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify({ planId: plan.id, ...body }) : undefined,
  });
  const result = await response.json();
  assert.equal(
    response.status,
    expected,
    result.error ?? `Unexpected Daily response for ${body?.action ?? "load"}`,
  );
  return result;
}
let state = await call({ action: "start" });
assert.equal(dailyStep(state.plan, state.answers, state.lessons).kind, "drill");
const wrong = (original.answer + 1) % original.choices.length;
state = await call({
  action: "answer",
  questionId: original.id,
  chosen: wrong,
  elapsedMs: 12000,
});
assert.equal(state.answers[original.id], wrong);
assert.equal(
  dailyStep(state.plan, state.answers, state.lessons).kind,
  "review",
);
const before = structuredClone(state);
state = await call({
  action: "retry",
  questionId: original.id,
  chosen: original.answer,
});
assert(state.retryQuestionId && state.retryQuestionId !== original.id);
assert.equal(state.retryUnavailable, false);
const retryId = state.retryQuestionId;
const firstRevision = state.plan.retryRevision;
assert.equal(
  firstRevision,
  1,
  "The legacy-null PostgREST revision guard must save once.",
);
assert.equal(state.answers[original.id], wrong);
assert.deepEqual(state.lessons, before.lessons);
assert.equal(state.plan.id, before.plan.id);
assert.equal(state.plan.minutes, before.plan.minutes);
assert.deepEqual(
  state.plan.nextCurriculumPositions,
  before.plan.nextCurriculumPositions,
);
state = await call();
const retry = state.plan.blocks[0].questions.find(
  (question) => question.id === retryId,
)!;
assert.equal(retry.retryOf, original.id);
assert.equal(retry.skillId, original.skillId);
assert.equal(dailyStep(state.plan, state.answers, state.lessons).kind, "drill");
const duplicate = await call({ action: "retry", questionId: original.id });
assert.equal(duplicate.retryQuestionId, retryId);
assert.equal(duplicate.plan.retryRevision, firstRevision);
assert.equal(duplicate.answers[original.id], wrong);

const retryWrong = (retry.answer + 1) % retry.choices.length;
state = await call({
  action: "answer",
  questionId: retry.id,
  chosen: retryWrong,
  elapsedMs: 9000,
});
assert.equal(
  state.answers[retry.id],
  retryWrong,
  "A fresh retry uses the normal immutable answer endpoint.",
);
state = await call({ action: "retry", questionId: retry.id });
assert(state.retryQuestionId && state.retryQuestionId !== retry.id);
assert.equal(
  state.plan.retryRevision,
  2,
  "The numeric PostgREST revision guard must save the next retry.",
);
const secondRetry = state.plan.blocks[0].questions.find(
  (question) => question.id === state.retryQuestionId,
)!;
state = await call({
  action: "answer",
  questionId: secondRetry.id,
  chosen: secondRetry.answer,
  elapsedMs: 8000,
});
await call({ action: "retry", questionId: secondRetry.id }, 409);
await call(
  { action: "answer", questionId: original.id, chosen: original.answer },
  409,
);

// A stale completion cannot overwrite the two saved recovery questions.
const stale = await db
  .from("exam_attempts")
  .update({ answers: { ...before.plan, complete: true } as never })
  .eq("id", plan.id)
  .eq("user_id", owner)
  .is("answers->>retryRevision", null)
  .select("id");
assert.ifError(stale.error);
assert.deepEqual(stale.data, []);
state = await call();
assert.equal(state.plan.retryRevision, 2);
assert.equal(state.answers[original.id], wrong);
assert.equal(state.answers[retry.id], retryWrong);
assert.equal(state.answers[secondRetry.id], secondRetry.answer);
assert(
  state.plan.blocks[0].questions.some((question) => question.id === retryId),
);
state = await call({ action: "review", subject: "math" });
assert(state.plan.complete);
assert.equal(
  state.plan.retryRevision,
  3,
  "Ordinary completion carries the recovery questions into the next revision.",
);
state = await call();
assert(state.plan.complete);
assert.equal(state.answers[original.id], wrong);
assert.equal(state.answers[secondRetry.id], secondRetry.answer);
console.log(
  JSON.stringify({
    result: "passed",
    host: new URL(base).host,
    isolatedAccount: true,
    originalMissPreserved: true,
    freshSameSkillRetry: true,
    duplicateRetryStable: true,
    normalAnswerGrading: true,
    correctAnswerRetryDenied: true,
    nullAndNumericRevisionGuards: true,
    staleCompletionBlocked: true,
    savedAndReloaded: true,
    completionPreservesRetries: true,
    requests,
  }),
);
