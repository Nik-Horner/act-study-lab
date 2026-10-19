/** Explicit campaign integration check. Uses only the synthetic live-account.ts
 * account and creates one second isolated account when email auto-confirm is on. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import {
  CAMPAIGN_RECORD,
  campaignCatalog,
  campaignMission,
  campaignRecordId,
} from "../src/lib/campaign";
import type { CampaignSnapshot } from "../src/lib/campaign-types";
const base = process.env.ACT_TEST_BASE ?? "http://localhost:3001";
const qa = JSON.parse(readFileSync(".env.qa-session", "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
function client() {
  const jar = new Map<string, string>();
  return {
    jar,
    db: createServerClient(url, key, {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (values) =>
          values.forEach(({ name, value }) => jar.set(name, value)),
      },
    }),
  };
}
const a = client();
const login = await a.db.auth.signInWithPassword({
  email: qa.email,
  password: qa.password,
});
assert.ifError(login.error);
assert.equal(login.data.user?.id, qa.userId);
const profile = await a.db
  .from("profiles")
  .select("display_name")
  .eq("id", qa.userId)
  .single();
assert.ifError(profile.error);
assert.equal(profile.data.display_name, "Isolated ACT integration QA");
async function originalRows() {
  const result = await a.db
    .from("exam_attempts")
    .select("*")
    .eq("user_id", qa.userId)
    .neq("exam_id", CAMPAIGN_RECORD)
    .order("id");
  assert.ifError(result.error);
  return result.data;
}
async function daily(body?: unknown) {
  const response = await fetch(base + "/api/daily", {
    method: body ? "POST" : "GET",
    headers: {
      Cookie: [...a.jar].map(([n, v]) => n + "=" + v).join("; "),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return result;
}
const prepared = await daily();
const activeDaily = await daily({ action: "start", planId: prepared.plan.id });
const baseline = await originalRows();
let requests = 0;
async function call(body?: unknown, expected = 200, path = "", jar = a.jar) {
  requests++;
  const r = await fetch(
    base +
      "/api/campaign" +
      (body === undefined ? "?ownerId=" + qa.userId + path : ""),
    {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Cookie: [...jar].map(([n, v]) => n + "=" + v).join("; "),
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  const result = await r.json();
  assert.equal(r.status, expected, JSON.stringify(result));
  return result;
}
await call(undefined, 401, "", new Map());
await call(
  {
    ownerId: qa.secondUserId,
    missionId: campaignCatalog()[0].id,
    action: "start",
  },
  409,
);
await call([], 400);
await call({ ownerId: qa.userId, missionId: "unknown", action: "start" }, 400);
const receipt = {
  subjects: [] as string[],
  beforeRows: baseline.length,
  requests: 0,
  concurrentChoicePreserved: false,
  ownProgressOnly: false,
  originalProgressUnchanged: false,
};
for (const subject of ["english", "math", "reading", "science"]) {
  const mission = campaignCatalog().find((m) => m.subject === subject)!;
  const canonical = campaignMission(mission.id)!;
  let snapshot = (await call(
    undefined,
    200,
    "&mission=" + mission.id,
  )) as CampaignSnapshot;
  if (snapshot.state) {
    assert(snapshot.state.completedAt);
    assert.equal(snapshot.correct, canonical.questions.length - 1);
    receipt.subjects.push(subject);
    continue;
  }
  assert(
    snapshot.questions.every((q) => !("answer" in q) && !("explanation" in q)),
  );
  snapshot = await call({
    ownerId: qa.userId,
    missionId: mission.id,
    action: "start",
  });
  const duplicate = await call({
    ownerId: qa.userId,
    missionId: mission.id,
    action: "start",
  });
  assert.deepEqual(duplicate, snapshot);
  await call(
    { ownerId: qa.userId, missionId: mission.id, action: "next", revision: 0 },
    409,
  );
  for (let i = 0; i < canonical.questions.length; i++) {
    const revision = snapshot.state!.revision,
      choice =
        i === 0
          ? (canonical.questions[i].answer + 1) % 4
          : canonical.questions[i].answer;
    const move = {
      ownerId: qa.userId,
      missionId: mission.id,
      action: "answer",
      revision,
      choice,
      seconds: 4,
    };
    snapshot = await call(move);
    assert.equal(snapshot.feedback.length, i + 1);
    assert.equal(snapshot.feedback[i].chosen, choice);
    assert.equal(snapshot.feedback[i].answer, canonical.questions[i].answer);
    assert.deepEqual(await call(move), snapshot);
    await call({ ...move, choice: (choice + 1) % 4 }, 409);
    const loaded = await call(undefined, 200, "&mission=" + mission.id);
    assert.deepEqual(loaded, snapshot);
    const next = {
      ownerId: qa.userId,
      missionId: mission.id,
      action: "next",
      revision: snapshot.state!.revision,
    };
    snapshot = await call(next);
    assert.deepEqual(await call(next), snapshot);
  }
  assert(snapshot.state!.completedAt);
  assert.equal(snapshot.correct, canonical.questions.length - 1);
  assert(snapshot.stars >= 1);
  assert.deepEqual(
    await call({ ownerId: qa.userId, missionId: mission.id, action: "start" }),
    snapshot,
  );
  receipt.subjects.push(subject);
}
// Two stale tabs choosing different answers must produce exactly one durable move.
const raceMission = campaignCatalog().filter((m) => m.subject === "english")[1];
let race = await call({
  ownerId: qa.userId,
  missionId: raceMission.id,
  action: "start",
});
if (!race.state.answers.length) {
  const responses = await Promise.all(
    [0, 1].map((choice) =>
      fetch(base + "/api/campaign", {
        method: "POST",
        headers: {
          Cookie: [...a.jar].map(([n, v]) => n + "=" + v).join("; "),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: qa.userId,
          missionId: raceMission.id,
          action: "answer",
          revision: 0,
          choice,
          seconds: 1,
        }),
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
  race = await call(undefined, 200, "&mission=" + raceMission.id);
  assert.equal(race.state.answers.length, 1);
  assert.equal(race.state.revision, 1);
}
receipt.concurrentChoicePreserved = true;
const settings = await fetch(url + "/auth/v1/settings", {
  headers: { apikey: key },
}).then((r) => r.json());
assert.equal(settings.mailer_autoconfirm, true);
const b = client();
const other = await b.db.auth.signUp({
  email: `act-campaign-qa-${Date.now()}@example.com`,
  password: randomBytes(32).toString("base64url"),
});
assert.ifError(other.error);
assert(other.data.user);
const id = await campaignRecordId(qa.userId, campaignCatalog()[0].id);
const foreign = await b.db.from("exam_attempts").select("id").eq("id", id);
assert.ifError(foreign.error);
assert.deepEqual(foreign.data, []);
await call(undefined, 409, "", b.jar);
receipt.ownProgressOnly = true;
assert.deepEqual(await originalRows(), baseline);
const retainedDaily = await daily();
assert.deepEqual(retainedDaily.plan, activeDaily.plan);
assert.deepEqual(retainedDaily.answers, activeDaily.answers);
assert.deepEqual(retainedDaily.lessons, activeDaily.lessons);
assert.equal(retainedDaily.deadline, activeDaily.deadline);
receipt.originalProgressUnchanged = true;
receipt.requests = requests;
mkdirSync(".impeccable/review/campaign", { recursive: true });
writeFileSync(
  ".impeccable/review/campaign/live-" +
    (new URL(base).hostname === "localhost" ? "local" : "production") +
    ".json",
  JSON.stringify(receipt, null, 2),
);
console.log(
  JSON.stringify({ result: "passed", host: new URL(base).host, ...receipt }),
);
