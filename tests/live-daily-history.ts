/** Explicit integration check: creates an isolated QA account only when email
 * auto-confirmation is enabled. Never writes to an existing student account. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import {
  makeDailyPlan,
  dailyHistory,
  dailyDate,
  type DailyPlan,
} from "../src/lib/daily-plan";
import fixture from "./fixtures/focused-curriculum-legacy.json";
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
  email: `act-history-qa-${Date.now()}@example.com`,
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
    coverage?: { covered: number; completedSessions: number };
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
const today = dailyDate();
const history = Array.from({ length: 10 }, (_, i) => ({
  ...(structuredClone(fixture.cases[0].plan) as DailyPlan),
  id: crypto.randomUUID(),
  complete: true,
  date: `2026-10-${String(i + 1).padStart(2, "0")}`,
}));
const current = makeDailyPlan(
  data.user.id,
  today,
  settings,
  10,
  undefined,
  [],
  {},
  {
    testDate: "2026-10-17",
    coveredUnits: [],
  },
);
for (const [i, plan] of [...history, current].entries()) {
  assert.ifError(
    (
      await db.from("exam_attempts").insert({
        id: plan.id,
        user_id: data.user.id,
        exam_id: "daily:plan",
        answers: plan as never,
        completed_at: new Date(Date.now() - (11 - i) * 1000).toISOString(),
        raw_correct: 0,
        raw_total: 0,
        scale_score: 0,
        duration_seconds: 0,
      })
    ).error,
  );
}
const checkpoint = `daily:${current.id}:step:${current.blocks[0].units![0].id}:concept:0`;
assert.ifError(
  (
    await db
      .from("plan_checks")
      .insert({ user_id: data.user.id, item_key: checkpoint })
  ).error,
);
const expected = dailyHistory(history);
for (let i = 0; i < 2; i++) {
  const state = await call();
  assert.equal(state.plan.id, current.id);
  assert(state.lessons.includes(`${current.blocks[0].units![0].id}:concept:0`));
  assert.equal(state.coverage?.completedSessions, 10);
  assert(state.coverage.covered > 3);
  assert.equal(state.plan.course?.coverageVersion, 1);
  for (const id of expected.coveredUnits)
    assert(state.plan.course.coveredUnits.includes(id), id);
}
const retained = await db
  .from("plan_checks")
  .select("item_key")
  .eq("user_id", data.user.id)
  .eq("item_key", checkpoint);
assert.ifError(retained.error);
assert.equal(retained.data?.length, 1);
console.log(
  JSON.stringify({
    base,
    completedSessions: 10,
    legacySkillsRecovered: expected.coveredUnits.filter((id) =>
      id.includes(":skill:"),
    ).length,
    stableReload: true,
    checkpointRetained: true,
  }),
);
