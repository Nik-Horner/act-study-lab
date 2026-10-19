/** Exercises real endpoints using only a new synthetic live-account.ts account. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { makeDailyPlan, dailyDate, dailyHistory } from "../src/lib/daily-plan";
import type { DailyState } from "../src/components/DailyStudy";
const qa = JSON.parse(readFileSync(".env.qa-session", "utf8"));
const base = process.env.ACT_TEST_BASE ?? "http://localhost:3001";
const jar = new Map<string, string>();
const db = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (values) =>
        values.forEach(({ name, value }) => jar.set(name, value)),
    },
  },
);
const login = await db.auth.signInWithPassword({
  email: qa.email,
  password: qa.password,
});
assert.ifError(login.error);
assert.equal(login.data.user?.id, qa.userId);
const profile = await db
  .from("profiles")
  .select("display_name")
  .eq("id", qa.userId)
  .single();
assert.ifError(profile.error);
assert.equal(profile.data.display_name, "Isolated ACT integration QA");
const ownerId = qa.userId;
let requests = 0;
async function call(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
  status = 200,
) {
  requests++;
  const response = await fetch(base + path, {
    method,
    headers: {
      Cookie: [...jar].map(([n, v]) => n + "=" + v).join("; "),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  return result;
}
async function rows(table: "exam_attempts" | "plan_checks") {
  const result = await db
    .from(table)
    .select("*")
    .eq("user_id", ownerId)
    .order(table === "plan_checks" ? "item_key" : "id");
  assert.ifError(result.error);
  return result.data;
}
const before = await rows("exam_attempts");
assert(
  !before.some(
    (row) => row.exam_id === "daily:plan" || row.exam_id === "readiness:score",
  ),
  "Use a fresh synthetic account.",
);
const today = dailyDate();
const date = (days: number) =>
  new Date(Date.parse(today) + days * 86400000).toISOString().slice(0, 10);
const settings = {
  scores: { english: 30, math: 18, reading: 30, science: 30 },
  minutesPerDay: 15,
  includeScience: true,
};
await call(
  "/api/profile",
  {
    ownerId,
    study_settings: settings,
    current_score: 30,
    target_score: 30,
    test_date: date(45),
  },
  "PATCH",
);
const preview = (await call("/api/daily")) as DailyState;
assert.equal(preview.saved, false);
assert.equal(preview.plan.blocks[0].subject, "math");
assert.equal(preview.plan.minutes, 15);
// An older unfinished session exercises the public carryover action, not a reset.
const old = makeDailyPlan(
  ownerId,
  date(-1),
  settings,
  5,
  undefined,
  [],
  {},
  { targetScore: 30, testDate: date(45), ...dailyHistory([]) },
);
assert.ifError(
  (
    await db.from("exam_attempts").insert({
      id: old.id,
      user_id: ownerId,
      exam_id: "daily:plan",
      answers: old as never,
      raw_correct: 0,
      raw_total: 0,
      scale_score: 0,
      duration_seconds: 0,
    })
  ).error,
);
const active = (await call("/api/daily", {
  action: "start",
  planId: old.id,
})) as DailyState;
const originalRows = await rows("exam_attempts"),
  originalChecks = await rows("plan_checks");
const score = {
  ownerId,
  subject: "math",
  score: 30,
  formName: "QA unseen official form A",
  date: today,
  official: true,
  timed: true,
  firstAttempt: true,
};
await call("/api/score-checks", score);
await call("/api/score-checks", { ...score, subject: "english", score: 18 });
await call("/api/score-checks", {
  ...score,
  subject: "english",
  score: 36,
  timed: false,
  formName: "QA untimed form",
});
await call(
  "/api/score-checks",
  { ...score, ownerId: qa.secondUserId },
  "POST",
  409,
);
const resumed = (await call("/api/daily")) as DailyState;
for (const key of ["plan", "answers", "lessons", "deadline"] as const)
  assert.deepEqual(resumed[key], active[key], key);
const afterScores = await rows("exam_attempts");
assert.deepEqual(
  afterScores.filter((row) => row.exam_id !== "readiness:score"),
  originalRows,
);
assert.deepEqual(await rows("plan_checks"), originalChecks);
const next = (await call("/api/daily", {
  action: "next",
  planId: old.id,
})) as DailyState;
assert.notEqual(next.plan.id, old.id);
assert.equal(next.plan.sequence, 6);
assert.equal(
  next.plan.blocks[0].subject,
  "english",
  "Updated section evidence must change the next priority.",
);
assert.equal(next.plan.minutes, 15);
assert.equal(next.goal?.targetScore, 30);
assert.equal(next.goal?.testDate, date(45));
assert.deepEqual(
  (await rows("exam_attempts")).filter((row) =>
    originalRows.some((oldRow) => oldRow.id === row.id),
  ),
  originalRows,
);
assert.deepEqual(
  (await rows("exam_attempts")).filter((row) =>
    before.some((oldRow) => oldRow.id === row.id),
  ),
  before,
);
const auth = await db.auth.getUser();
assert.ifError(auth.error);
assert.deepEqual(
  auth.data.user!.user_metadata.act_study_settings.scores,
  settings.scores,
  "Starting scores remain editable and unchanged.",
);
const folder = ".impeccable/review/personalized-plan";
mkdirSync(folder, { recursive: true });
writeFileSync(
  folder +
    "/" +
    (base.includes("localhost") ? "local" : "production") +
    ".json",
  JSON.stringify({
    passed: true,
    requests,
    baselinePriority: preview.plan.blocks[0].subject,
    updatedPriority: next.plan.blocks[0].subject,
    savedSessionPreserved: true,
    priorRowsPreserved: before.length,
    ownerGuard: true,
  }),
);
console.log(
  JSON.stringify({
    passed: true,
    requests,
    baselinePriority: "math",
    updatedPriority: "english",
    savedSessionPreserved: true,
    priorRowsPreserved: before.length,
  }),
);
