/** Authenticated HTTP/render sweep using an explicitly-created isolated QA session.
 * This never submits answers. It does not replace browser interaction/visual QA. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { getLearningSkills, skillHref } from "../src/lib/learning-skills";
import { getTopics as englishTopics } from "../src/lib/content";
import { getTopics, getExams } from "../src/lib/act/content";
import { campaignCatalog } from "../src/lib/campaign";

type Session = { userId: string; cookie: string; secondUserId: string };
const session =
  (globalThis as typeof globalThis & { actRouteQaSession?: Session })
    .actRouteQaSession ??
  (JSON.parse(readFileSync(".env.qa-session", "utf8")) as Session);
const base = process.env.ACT_TEST_BASE ?? "http://127.0.0.1:3001";
const jar = new Map(
  session.cookie.split(/;\s*/).map((entry) => {
    const split = entry.indexOf("=");
    return [entry.slice(0, split), entry.slice(split + 1)];
  }),
);
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
const auth = await db.auth.getUser();
assert.ifError(auth.error);
assert.equal(
  auth.data.user?.id,
  session.userId,
  "The isolated QA identity must match.",
);
const profile = await db
  .from("profiles")
  .select("display_name")
  .eq("id", session.userId)
  .single();
assert.ifError(profile.error);
assert.match(
  profile.data.display_name,
  /Isolated .*QA/,
  "Do not sweep a real student account.",
);

type Snapshot = {
  id: string;
  exam_id: string;
  answers: unknown;
  raw_correct: number;
  raw_total: number;
  scale_score: number;
  duration_seconds: number;
  completed_at: string;
};
async function snapshot() {
  const rows: Snapshot[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await db
      .from("exam_attempts")
      .select(
        "id,exam_id,answers,raw_correct,raw_total,scale_score,duration_seconds,completed_at",
      )
      .eq("user_id", session.userId)
      .order("id")
      .range(offset, offset + 499);
    assert.ifError(page.error);
    rows.push(...(page.data as Snapshot[]));
    if (page.data.length < 500) return rows;
  }
}
const before = await snapshot();
const historical = before.filter((row) => row.exam_id !== "daily:plan");
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const stableRows = new Map(historical.map((row) => [row.id, hash(row)]));
const fixtureFiles = execFileSync("git", ["ls-files", "tests/fixtures"], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);
const fixtureHashes = new Map(
  fixtureFiles.map((path) => [path, hash(readFileSync(path))]),
);
const fixturesMatchHead = () => {
  try {
    execFileSync("git", ["diff", "--quiet", "HEAD", "--", "tests/fixtures"]);
    return true;
  } catch {
    return false;
  }
};
assert(fixturesMatchHead(), "Historical fixture files must start unchanged.");
const startedAt = new Date().toISOString();
const skills = getLearningSkills();
const topics = [...englishTopics(), ...getTopics()];
const englishExams = readdirSync("src/content/exams")
  .filter((name) => name.endsWith(".json"))
  .map(
    (name) =>
      JSON.parse(readFileSync(`src/content/exams/${name}`, "utf8")) as {
        id: string;
      },
  );
const exams = [...englishExams, ...getExams()];
const examIds = new Set(exams.map((exam) => exam.id));
const actualResults = before.filter((row) => examIds.has(row.exam_id));
type Case = {
  path: string;
  category: string;
  auth: boolean;
  status: number;
  location?: string;
};
const cases = new Map<string, Case>();
function add(
  path: string,
  category: string,
  auth = true,
  status = 200,
  location?: string,
) {
  cases.set(`${auth}:${path}`, {
    path,
    category,
    auth,
    status,
    ...(location && { location }),
  });
}
for (const skill of skills) {
  add(skillHref(skill), "skill-lesson");
  add(skillHref(skill, true), "skill-drill");
}
for (const topic of topics) {
  add(`/learn/${topic.slug}`, "topic-catalog");
  add(`/learn/${topic.slug}?reference=1`, "topic-reference");
  add(`/drill/${topic.slug}`, "topic-drill");
}
for (const subject of ["english", "math", "reading", "science"]) {
  add(`/study/${subject}`, "subject-dashboard");
  add(`/learn?subject=${subject}`, "subject-course");
  for (const mode of subject === "english"
    ? ["weak", "misses"]
    : ["mixed", "hard", "weak", "misses"])
    add(
      `/drill/${mode}${subject === "english" ? "" : `?subject=${subject}`}`,
      "practice-mode",
    );
}
const staticPages = [
  "/play",
  "/dashboard",
  "/daily",
  "/practice",
  "/progress",
  "/math-formulas",
  "/learn/math-formulas",
  "/account",
  "/exam",
  "/learn",
];
for (const path of staticPages) add(path, "static-page");
for (const subject of ["english", "math", "reading", "science"])
  add(`/play?subject=${subject}`, "campaign-subject");
for (const mission of campaignCatalog())
  add(`/play?mission=${mission.id}`, "campaign-mission");
add(`/api/campaign?ownerId=${session.userId}`, "campaign-read-api");
add(
  `/api/campaign?ownerId=${session.secondUserId}`,
  "campaign-owner-guard",
  true,
  409,
);
add("/play?mission=unknown-mission", "campaign-not-found", true, 404);
for (const exam of exams) add(`/exam/${exam.id}`, "exam-runner");
for (const row of actualResults)
  add(`/exam/${row.exam_id}/results/${row.id}`, "owned-exam-results");
for (const path of ["/", "/login", "/signup", "/auth/auth-error"])
  add(path, "public-auth", false);
add("/auth/callback", "public-auth", false, 307, "/auth/auth-error");
for (const path of ["/", "/login", "/signup"])
  add(path, "signed-in-auth-redirect", true, 307, "/dashboard");
for (const path of staticPages)
  add(
    path,
    "anonymous-page-boundary",
    false,
    307,
    `/login?next=${encodeURIComponent(path)}`,
  );
const apiPaths = [
  "/api/daily",
  "/api/formulas",
  "/api/profile",
  "/api/plan-check",
  "/api/score-checks",
  "/api/study/progress",
  "/api/study/event",
  "/api/drill/answer",
  "/api/exam/submit",
];
for (const path of apiPaths) add(path, "anonymous-api-boundary", false, 401);
add("/api/daily", "authenticated-read-api");
add("/api/study/progress?timeZone=America%2FChicago", "authenticated-read-api");
add(`/api/score-checks?ownerId=${session.userId}`, "authenticated-read-api");
add(
  `/api/score-checks?ownerId=${session.secondUserId}`,
  "cross-account-read-boundary",
  true,
  409,
);
const englishTopic = englishTopics()[0];
const foreignSkill = skills.find((skill) => skill.subject === "math")!;
add(
  `/learn/${englishTopic.slug}?skill=${encodeURIComponent(foreignSkill.id)}`,
  "invalid-skill-pair",
  true,
  404,
);
add(
  `/drill/${englishTopic.slug}?skill=${encodeURIComponent(foreignSkill.id)}`,
  "invalid-skill-pair",
  true,
  404,
);
add(`/study/${englishTopic.slug}`, "invalid-subject", true, 404);
add(`/exam/${englishTopic.slug}`, "invalid-exam", true, 404);
const nonEnglishResult = actualResults.find(
  (row) => !englishExams.some((exam) => exam.id === row.exam_id),
);
if (nonEnglishResult)
  add(
    `/exam/${englishExams[0].id}/results/${nonEnglishResult.id}`,
    "mismatched-exam-result",
    true,
    404,
  );

const inventory = Object.fromEntries(
  [...cases.values()].reduce(
    (counts, item) =>
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1),
    new Map<string, number>(),
  ),
);
console.log(
  JSON.stringify({
    phase: "inventory",
    skills: skills.length,
    topics: topics.length,
    exams: exams.length,
    ownedResults: actualResults.length,
    totalCases: cases.size,
    concurrency: 4,
    categories: inventory,
  }),
);
const queue = [...cases.values()];
const results: (Case & {
  actualStatus: number;
  pass: boolean;
  milliseconds: number;
  issue?: string;
})[] = [];
let cursor = 0;
async function worker() {
  while (cursor < queue.length) {
    const item = queue[cursor++];
    const began = Date.now();
    let status = 0,
      issue: string | undefined;
    try {
      const response = await fetch(base + item.path, {
        headers: item.auth
          ? {
              Cookie: [...jar]
                .map(([name, value]) => `${name}=${value}`)
                .join("; "),
            }
          : {},
        redirect: "manual",
        signal: AbortSignal.timeout(30000),
      });
      status = response.status;
      const html = await response.text();
      if (status !== item.status)
        issue = `Expected HTTP ${item.status}, received ${status}`;
      if (item.location) {
        const target = new URL(response.headers.get("location") ?? "/", base);
        const expected = new URL(item.location, base);
        if (
          target.pathname !== expected.pathname ||
          target.searchParams.toString() !== expected.searchParams.toString()
        )
          issue = "Unexpected redirect destination";
      }
      if (
        item.status === 200 &&
        /NEXT_HTTP_ERROR_FALLBACK;500|Application error: a server-side exception|<title>500|<h1[^>]*>Internal Server Error/i.test(
          html,
        )
      )
        issue = "Server error embedded in HTTP 200 response";
      if (
        item.status === 200 &&
        !item.path.startsWith("/api/") &&
        !/<html[\s>]/i.test(html)
      )
        issue = "Expected rendered HTML page";
    } catch (error) {
      issue = error instanceof Error ? error.message : "Request failed";
    }
    results.push({
      ...item,
      actualStatus: status,
      pass: !issue,
      milliseconds: Date.now() - began,
      ...(issue && { issue }),
    });
    if (results.length % 100 === 0)
      console.log(
        JSON.stringify({
          phase: "progress",
          checked: results.length,
          failed: results.filter((result) => !result.pass).length,
        }),
      );
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
const after = await snapshot();
const afterById = new Map(after.map((row) => [row.id, row]));
const changedOriginalRows = [...stableRows]
  .filter(
    ([id, expected]) =>
      !afterById.has(id) || hash(afterById.get(id)) !== expected,
  )
  .map(([id]) => id);
const changedFixtures = [...fixtureHashes]
  .filter(([path, expected]) => hash(readFileSync(path)) !== expected)
  .map(([path]) => path);
const failures = results.filter((result) => !result.pass);
const report = {
  startedAt,
  finishedAt: new Date().toISOString(),
  base,
  scope:
    "Read-only HTTP GET and server-rendered HTML. Does not execute client hydration, validate browser visuals, or submit study answers.",
  inventory: {
    skills: skills.length,
    topics: topics.length,
    exams: exams.length,
    actualOwnedResultRoutes: actualResults.length,
    totalCases: cases.size,
    categories: inventory,
  },
  concurrency: 4,
  summary: {
    passed: results.length - failures.length,
    failed: failures.length,
  },
  preservation: {
    originalNonPlanRows: historical.length,
    unchangedOriginalPayloadsAndScores: changedOriginalRows.length === 0,
    changedOriginalRows,
    addedRowsDuringSweep: after.filter(
      (row) => !before.some((old) => old.id === row.id),
    ).length,
    fixtureFiles: fixtureFiles.length,
    fixtureContentsUnchanged:
      changedFixtures.length === 0 && fixturesMatchHead(),
    changedFixtures,
  },
  failures,
  results: results.sort(
    (a, b) =>
      a.category.localeCompare(b.category) || a.path.localeCompare(b.path),
  ),
};
mkdirSync("docs", { recursive: true });
writeFileSync(
  "docs/qa-redesign-route-sweep.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    phase: "complete",
    ...report.summary,
    preservation: report.preservation,
    report: "docs/qa-redesign-route-sweep.json",
  }),
);
assert.equal(
  changedOriginalRows.length,
  0,
  "Original QA answer/exam payloads and scores must remain unchanged.",
);
assert.equal(
  changedFixtures.length,
  0,
  "Historical progress fixtures must remain unchanged.",
);
assert(fixturesMatchHead());
assert.equal(
  failures.length,
  0,
  "Inspect the saved route sweep report for failures.",
);
