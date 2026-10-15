/** Explicit live smoke test. Creates isolated QA accounts only when Supabase
 * confirms email auto-confirmation, and never writes to an existing account. */
import { createServerClient } from "@supabase/ssr";
import { randomUUID, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { getQuestions, getExamQuestions } from "../src/lib/act/content";
import { getQuestions as englishQuestions } from "../src/lib/content";
async function main() {
  const base = process.env.ACT_TEST_BASE ?? "http://localhost:3100";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const settings = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
  }).then((r) => r.json());
  assert.equal(
    settings.mailer_autoconfirm,
    true,
    "Do not create accounts that send confirmation emails.",
  );
  async function makeAccount() {
    const jar = new Map<string, string>();
    const client = createServerClient(url, key, {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (values) =>
          values.forEach(({ name, value }) => jar.set(name, value)),
      },
    });
    const email = `act-study-qa-${Date.now()}-${randomBytes(3).toString("hex")}@example.com`,
      password = randomBytes(32).toString("base64url");
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: "Isolated ACT integration QA" } },
    });
    assert.ifError(error);
    assert(data.user);
    assert(data.session);
    return {
      client,
      email,
      password,
      id: data.user.id,
      cookie: () =>
        [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
    };
  }
  const a = await makeAccount(),
    b = await makeAccount();
  writeFileSync(
    ".env.qa-session",
    JSON.stringify({
      email: a.email,
      password: a.password,
      userId: a.id,
      cookie: a.cookie(),
      secondUserId: b.id,
    }),
    { mode: 0o600 },
  );
  async function call(
    path: string,
    body?: unknown,
    owner = a,
    method = body === undefined ? "GET" : "POST",
  ) {
    const response = await fetch(base + path, {
      method,
      headers: { Cookie: owner.cookie(), "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { response, data: data as Record<string, unknown> };
  }
  for (const owner of [a, b]) {
    const r = await call(
      "/api/profile",
      {
        ownerId: owner.id,
        display_name: "Isolated ACT integration QA",
        current_score: 32,
        target_score: 36,
        test_date: "2026-10-17",
      },
      owner,
      "PATCH",
    );
    assert.equal(r.response.status, 200);
  }
  const unauthorized = await fetch(base + "/api/study/progress", {
    redirect: "manual",
  });
  assert.equal(unauthorized.status, 401);
  const ids: string[] = [];
  for (const subject of ["math", "science", "reading"] as const) {
    const q = getQuestions().find((q) => q.subject === subject)!;
    const id = randomUUID();
    ids.push(id);
    const event = {
      id,
      questionId: q.id,
      chosen: q.answer,
      elapsedMs: 12000,
      confidence: "high",
      cause: null,
      at: new Date().toISOString(),
      mode: "drill",
    };
    const body = { ownerId: a.id, record: { kind: "answer", event } };
    assert.equal((await call("/api/study/event", body)).response.status, 200);
    assert.equal((await call("/api/study/event", body)).response.status, 200);
    assert.equal(
      (await call("/api/study/event", { ...body, ownerId: b.id })).response
        .status,
      409,
    );
    const attemptCross = await call(
      "/api/study/event",
      { ...body, ownerId: b.id },
      b,
    );
    assert.equal(
      attemptCross.response.status,
      409,
      "A duplicate belonging to a different account cannot report a successful save.",
    );
    const row = await a.client
      .from("exam_attempts")
      .select("*")
      .eq("id", id)
      .single();
    assert.ifError(row.error);
    assert.equal(row.data.raw_correct, 1);
    assert.equal(row.data.scale_score, 0);
    assert.equal(
      (await b.client.from("exam_attempts").select("id").eq("id", id)).data
        ?.length,
      0,
      "RLS hides another account history.",
    );
    const classified = {
      ...body,
      record: { kind: "answer", event: { ...event, cause: "careless" } },
    };
    assert.equal(
      (await call("/api/study/event", classified)).response.status,
      200,
    );
  }
  const rq = getExamQuestions("reading-1")[0],
    attemptId = randomUUID();
  ids.push(attemptId);
  const attempt = {
    id: attemptId,
    examId: "reading-1",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    elapsedSeconds: 20,
    answers: { [rq.id]: rq.answer },
  };
  const sectionBody = { ownerId: a.id, record: { kind: "exam", attempt } };
  assert.equal(
    (await call("/api/study/event", sectionBody)).response.status,
    200,
  );
  assert.equal(
    (await call("/api/study/event", sectionBody)).response.status,
    200,
  );
  const row = await a.client
    .from("exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();
  assert.ifError(row.error);
  assert.equal(row.data.raw_correct, 1);
  assert.equal(row.data.raw_total, 36);
  const itemKey = "2026-10-05:reading-diagnostic";
  assert.equal(
    (await call("/api/plan-check", { ownerId: a.id, itemKey, checked: true }))
      .response.status,
    200,
  );
  const firstCheck = await a.client
    .from("plan_checks")
    .select("checked_at")
    .eq("item_key", itemKey)
    .single();
  assert.ifError(firstCheck.error);
  assert.equal(
    (await call("/api/plan-check", { ownerId: a.id, itemKey, checked: true }))
      .response.status,
    200,
  );
  const repeated = await a.client
    .from("plan_checks")
    .select("checked_at")
    .eq("item_key", itemKey)
    .single();
  assert.ifError(repeated.error);
  assert(repeated.data);
  assert.equal(firstCheck.data.checked_at, repeated.data.checked_at);
  const eq = englishQuestions("commas")[0];
  const englishAnswerId = randomUUID();
  ids.push(englishAnswerId);
  const eng = await call("/api/drill/answer", {
    ownerId: a.id,
    answerId: englishAnswerId,
    topicSlug: "commas",
    questionId: eq.id,
    chosen: (eq.answer + 1) % 4,
  });
  assert.equal(eng.response.status, 200);
  const english = await call("/api/exam/submit", {
    attemptId: randomUUID(),
    ownerId: a.id,
    examId: "exam-1",
    answers: [],
    durationSeconds: 10,
  });
  assert.equal(english.response.status, 200);
  const englishId = english.data.attemptId as string;
  ids.push(englishId);
  const loaded = await call("/api/study/progress?timeZone=America%2FChicago");
  assert.equal(loaded.response.status, 200);
  const state = loaded.data.state as {
    answers: unknown[];
    attempts: { id: string }[];
    planChecks: string[];
  };
  assert.equal(state.answers.length, 39);
  assert.equal(state.attempts.length, 1);
  assert(state.planChecks.includes(itemKey));
  const other = await call("/api/study/progress", undefined, b);
  assert.equal((other.data.state as typeof state).answers.length, 0);
  for (const path of [
    "/dashboard",
    "/study/math",
    "/study/science",
    "/study/reading",
    "/learn/reading-inference",
    "/drill/reading-details",
    "/exam",
    "/exam/reading-1",
    `/exam/reading-1/results/${attemptId}`,
    `/exam/exam-1/results/${englishId}`,
  ]) {
    const response = await fetch(base + path, {
      headers: { Cookie: a.cookie() },
      redirect: "manual",
    });
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert(!html.includes("NEXT_HTTP_ERROR_FALLBACK;500"), path);
  }
  console.log(
    "Live account smoke passed: all subjects save/reload; authoritative grades; raw Reading results; idempotence; timestamps; two-account RLS; English drill/exam compatibility; authenticated routes.",
  );
  // Keep only these isolated QA records until UI verification; cleanup is explicit.
  writeFileSync(
    ".env.qa-records",
    JSON.stringify({ userId: a.id, ids, itemKey, englishQuestion: eq.id }),
    { mode: 0o600 },
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
