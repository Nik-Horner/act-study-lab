/** Explicit authenticated integration check; writes only to a new isolated QA account. */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import fixtures from "./fixtures/focused-curriculum-legacy.json";
import { dailyDate, type DailyPlan } from "../src/lib/daily-plan";
import { dailyConcepts, dailyStep } from "../src/lib/daily-flow";
const base = process.env.ACT_TEST_BASE ?? "http://localhost:3004";
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
  email: `act-focused-qa-${Date.now()}@example.com`,
  password: randomBytes(32).toString("base64url"),
});
assert.ifError(error);
assert(data.user && data.session);
assert.ifError(
  (
    await db
      .from("profiles")
      .update({
        display_name: "Isolated focused Daily QA",
        current_score: 32,
        target_score: 36,
        test_date: "2026-10-17",
      })
      .eq("id", data.user.id)
  ).error,
);
assert.ifError(
  (
    await db.auth.updateUser({
      data: {
        act_study_settings: { ...fixtures.settings, includeScience: true },
      },
    })
  ).error,
);
const fresh = process.env.ACT_TEST_FRESH_DAILY === "1";
const sample = fixtures.cases.find((c) => c.subject === "math" && c.partial)!;
const old = {
  ...structuredClone(sample.plan),
  id: randomUUID(),
  date: dailyDate(),
} as DailyPlan;
if (!fresh) {
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
  for (const [id, chosen] of Object.entries(sample.answers)) {
    const q = old.blocks.flatMap((b) => b.questions).find((q) => q.id === id)!;
    assert.ifError(
      (
        await db.from("exam_attempts").insert({
          user_id: data.user.id,
          exam_id: `practice:${q.subject}`,
          answers: {
            kind: "answer",
            dailyPlanId: old.id,
            event: {
              id: randomUUID(),
              questionId: id,
              chosen,
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
  assert.ifError(
    (
      await db.from("plan_checks").insert(
        sample.lessons.map((k) => ({
          user_id: data.user!.id,
          item_key: `daily:${old.id}:step:${k}`,
        })),
      )
    ).error,
  );
}
type State = {
  plan: DailyPlan;
  answers: Record<string, number>;
  lessons: string[];
  deadline: number | null;
  answerTimes: Record<string, number>;
  uncertainAnswers: Record<string, boolean>;
};
async function call(body?: unknown, status = 200): Promise<State> {
  const response = await fetch(base + "/api/daily", {
    method: body ? "POST" : "GET",
    headers: {
      Cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; "),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await response.json();
  assert.equal(
    response.status,
    status,
    JSON.stringify({ response: value, request: body }),
  );
  return value;
}
let state = await call();
const planId = fresh ? state.plan.id : old.id;
if (!fresh) {
  assert.equal(state.plan.id, planId);
  assert.equal(state.plan.plannerVersion, 2);
  for (const [id, choice] of Object.entries(sample.answers))
    assert.equal(state.answers[id], choice);
  const migrated = state.plan.blocks.find((b) => b.subject === "math")!
    .units![0];
  assert(
    migrated.questions.some(
      (q) =>
        q.id ===
          old.blocks.find((b) => b.subject === "math")!.reviewQuestions![0]
            .id && q.phase === "drill",
    ),
    JSON.stringify({
      units: state.plan.blocks
        .find((b) => b.subject === "math")!
        .units!.map((u) => ({
          id: u.id,
          skill: u.skillId,
          qs: u.questions.map((q) => q.id),
        })),
      answers: state.answers,
    }),
  );
}
const reloaded = await call();
assert.deepEqual(reloaded.plan, state.plan);
assert.deepEqual(reloaded.answers, state.answers);
state = await call({ action: "start", planId });
const deadline = state.deadline;
assert(deadline);
const taught = new Set<string>(),
  drilled = new Set<string>(),
  concepts = new Set<string>();
let requests = 0,
  blocked = false,
  retried = false;
while (requests++ < 240) {
  const step = dailyStep(state.plan, state.answers, state.lessons);
  if (step.kind === "done") break;
  assert.equal(state.plan.id, planId);
  assert.equal(state.deadline, deadline);
  if (step.kind === "lesson") {
    taught.add(step.block.subject);
    assert(step.unit.skillId);
    const visible = dailyConcepts(step.unit);
    assert(visible.length);
    assert(step.unit.lesson.sections.some((s) => s.activity));
    if (!blocked) {
      const q = step.unit.questions.find(
        (q) => state.answers[q.id] === undefined,
      )!;
      assert(q);
      await call(
        {
          action: "answer",
          planId,
          questionId: q.id,
          chosen: q.answer,
          elapsedMs: 1000,
        },
        409,
      );
      blocked = true;
    }
    const index = visible.find(
      (i) => !state.lessons.includes(`${step.unit.id}:concept:${i}`),
    );
    if (index !== undefined) {
      concepts.add(`${step.unit.id}:${index}`);
      state = await call({
        action: "concept",
        planId,
        unitId: step.unit.id,
        index,
      });
    } else
      state = await call({
        action: "lesson",
        planId,
        unitId: step.unit.id,
      });
  } else if (step.kind === "drill") {
    drilled.add(step.block.subject);
    assert(step.unit.skillId);
    assert.equal(step.question.skillId, step.unit.skillId, step.question.id);
    const body = {
      action: "answer",
      planId,
      questionId: step.question.id,
      chosen: step.question.answer,
      elapsedMs: 23000,
      uncertain: true,
    };
    state = await call(body);
    assert.equal(state.answers[step.question.id], step.question.answer);
    assert.equal(state.answerTimes[step.question.id], 23000);
    if (!retried) {
      state = await call({ ...body, elapsedMs: 0, uncertain: false });
      assert.equal(state.answerTimes[step.question.id], 23000);
      assert.equal(state.uncertainAnswers[step.question.id], true);
      retried = true;
    }
  } else
    state = await call({
      action: "review",
      planId,
      subject: step.block.subject,
    });
}
assert(requests < 240);
assert.equal(dailyStep(state.plan, state.answers, state.lessons).kind, "done");
for (const subject of ["english", "math", "reading", "science"]) {
  assert(taught.has(subject));
  assert(drilled.has(subject));
}
state = await call();
assert.equal(state.plan.id, planId);
assert(state.plan.complete);
assert.equal(state.deadline, deadline);
if (!fresh)
  assert.equal(
    state.answers["math-geometry-d3"],
    sample.answers["math-geometry-d3"],
  );
console.log(
  JSON.stringify({
    result: "passed",
    host: new URL(base).host,
    scenario: fresh ? "fresh" : "legacy",
    legacySource: fresh ? null : fixtures.source,
    identityAndAnswersPreserved: true,
    allFourSubjectsTaughtAndDrilled: true,
    visibleConcepts: concepts.size,
    answered: Object.keys(state.answers).length,
    orderedTeachingEnforced: blocked,
    idempotentAnswerRetry: retried,
    deadlinePreserved: true,
    completedAndReloaded: true,
    requests,
  }),
);
