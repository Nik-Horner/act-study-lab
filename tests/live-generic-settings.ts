/** Explicit settings QA on the synthetic account created by live-account.ts only. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
const session = JSON.parse(readFileSync(".env.qa-session", "utf8"));
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
  email: session.email,
  password: session.password,
});
assert.ifError(login.error);
assert.equal(login.data.user?.id, session.userId);
const owner = session.userId;
const profile = await db
  .from("profiles")
  .select("display_name")
  .eq("id", owner)
  .single();
assert.ifError(profile.error);
assert.equal(
  profile.data.display_name,
  "Isolated ACT integration QA",
  "Never modify a real student account.",
);
const folder = ".impeccable/review/generic-settings";
mkdirSync(folder, { recursive: true });
const baselinePath = folder + "/records-before.json";
const base = process.env.ACT_TEST_BASE ?? "http://localhost:3001";
async function records() {
  const result = await db
    .from("exam_attempts")
    .select("*")
    .eq("user_id", owner)
    .order("id");
  assert.ifError(result.error);
  return result.data;
}
const legacy = {
  scores: { english: 32, math: 34, reading: 30, science: 27 },
  minutesPerDay: 75,
  mathFocus: "geometry-trig",
  mathCoveredTopics: ["math-algebra", "math-functions"],
  scienceScoreRepresentative: false,
  includeScience: true,
};
const mode = process.argv[2];
if (mode === "legacy") {
  assert.ifError(
    (await db.auth.updateUser({ data: { act_study_settings: legacy } })).error,
  );
  const date = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  assert.ifError(
    (
      await db
        .from("profiles")
        .update({ target_score: 28, test_date: date, current_score: 32 })
        .eq("id", owner)
    ).error,
  );
  const headers = {
    Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
    "Content-Type": "application/json",
  };
  const response = await fetch(base + "/api/daily", { headers });
  assert.equal(response.status, 200);
  const state = await response.json();
  const started = await fetch(base + "/api/daily", {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "start", planId: state.plan.id }),
  });
  assert.equal(started.status, 200);
  writeFileSync(baselinePath, JSON.stringify(await records()));
} else if (mode === "onboarding") {
  assert.ifError(
    (
      await db.auth.updateUser({
        data: {
          act_study_settings: {
            scores: { english: null, math: null, reading: null, science: null },
          },
        },
      })
    ).error,
  );
  assert.ifError(
    (
      await db
        .from("profiles")
        .update({ target_score: null, test_date: null, current_score: null })
        .eq("id", owner)
    ).error,
  );
} else {
  assert(
    ["verify-preserved", "verify-standard", "verify-onboarding"].includes(mode),
    "Select an explicit QA scenario.",
  );
  const auth = await db.auth.getUser();
  assert.ifError(auth.error);
  const settings = auth.data.user!.user_metadata.act_study_settings;
  if (mode === "verify-preserved")
    assert.deepEqual(settings, { ...legacy, minutesPerDay: 45 });
  if (mode === "verify-standard")
    assert.deepEqual(settings, {
      ...legacy,
      minutesPerDay: 45,
      mathFocus: "all",
      mathCoveredTopics: [],
      scienceScoreRepresentative: true,
    });
  if (mode === "verify-onboarding") {
    assert.equal(settings.minutesPerDay, 30);
    assert.equal(settings.mathFocus, undefined);
    assert.equal(settings.mathCoveredTopics, undefined);
    assert.equal(settings.scienceScoreRepresentative, undefined);
    assert.deepEqual(settings.scores, {
      english: null,
      math: null,
      reading: null,
      science: null,
    });
  }
  assert.deepEqual(
    await records(),
    JSON.parse(readFileSync(baselinePath, "utf8")),
    "All saved answers, scores and active Daily snapshots must remain unchanged.",
  );
}
console.log(JSON.stringify({ result: "passed", mode, isolatedAccount: true }));
