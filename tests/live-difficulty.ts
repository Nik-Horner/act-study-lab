/** Creates only disposable synthetic accounts after checking email auto-confirm. */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import type { StudySettings } from "../src/lib/account-settings";
import type { DailyState } from "../src/components/DailyStudy";
import { dailyDate } from "../src/lib/daily-date";
import { getDailyPracticeQuestion } from "../src/lib/daily-practice-levels";
import { getLearningSkills } from "../src/lib/learning-skills";
const base = process.env.ACT_TEST_BASE ?? "http://localhost:3001";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
assert.equal(
  (
    await fetch(url + "/auth/v1/settings", { headers: { apikey: key } }).then(
      (r) => r.json(),
    )
  ).mailer_autoconfirm,
  true,
);
const today = dailyDate(),
  testDate = new Date(Date.parse(today) + 60 * 86400000)
    .toISOString()
    .slice(0, 10);
const cases = [
  { name: "foundation", score: 16, goal: 24, level: "easy" },
  { name: "core", score: 27, goal: 32, level: "medium" },
  { name: "challenge", score: 32, goal: 35, level: "hard" },
  { name: "unknown", score: null, goal: 36, level: "easy" },
] as const;
const sessions: unknown[] = [];
const results: unknown[] = [];
let requests = 0;
for (const scenario of cases) {
  const jar = new Map<string, string>();
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (values) =>
        values.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const email = `act-level-qa-${Date.now()}-${randomBytes(3).toString("hex")}@example.com`,
    password = randomBytes(32).toString("base64url");
  const auth = await db.auth.signUp({
    email,
    password,
    options: { data: { display_name: "Isolated adaptive lesson QA" } },
  });
  assert.ifError(auth.error);
  assert(auth.data.user);
  assert(auth.data.session);
  const ownerId = auth.data.user.id;
  async function call(
    path: string,
    body?: unknown,
    method = body ? "POST" : "GET",
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
    assert.equal(response.status, 200, JSON.stringify(result));
    return result;
  }
  const settings = {
    scores: {
      english: scenario.score,
      math: scenario.score,
      reading: scenario.score,
      science: scenario.score,
    },
    minutesPerDay: 90,
    includeScience: true,
  };
  async function profile(
    goal: number = scenario.goal,
    scores: StudySettings["scores"] = settings.scores,
  ) {
    await call(
      "/api/profile",
      {
        ownerId,
        current_score: scores.english,
        target_score: goal,
        test_date: testDate,
        study_settings: { ...settings, scores },
      },
      "PATCH",
    );
  }
  await profile();
  let preview = (await call("/api/daily")) as DailyState;
  assert.equal(preview.saved, false);
  const first = preview.plan.blocks.map((block) => ({
    subject: block.subject,
    skill: block.units![0].skillId,
    question: block.units![0].questions[0].id,
    difficulty: block.units![0].questions[0].difficulty,
    teaching: JSON.stringify(block.units![0].lesson.sections),
  }));
  assert.equal(first.length, 4);
  assert(
    first.every((item) => item.difficulty === scenario.level),
    scenario.name,
  );
  if (scenario.name === "foundation") {
    await profile(36);
    const ambitious = (await call("/api/daily")) as DailyState;
    assert(
      ambitious.plan.blocks.every((block) =>
        block.units!.every((unit) =>
          unit.questions.every((q) => q.difficulty === "easy"),
        ),
      ),
    );
    await profile();
  }
  if (scenario.name === "challenge") {
    await profile(28);
    const maintenance = (await call("/api/daily")) as DailyState;
    assert(
      maintenance.plan.blocks.every(
        (block) => block.units![0].difficulty === "medium",
      ),
    );
    await profile();
  }
  if (scenario.name === "unknown") {
    await profile(35, { english: 16, math: 32, reading: 27, science: 18 });
    const mixed = (await call("/api/daily")) as DailyState;
    assert.deepEqual(
      Object.fromEntries(
        mixed.plan.blocks.map((block) => [
          block.subject,
          block.units![0].difficulty,
        ]),
      ),
      { english: "easy", reading: "medium", math: "hard", science: "easy" },
    );
    await profile();
  }
  // Fresh independent answers must affect the next preview through the real API.
  if (scenario.name === "foundation") {
    const skill = getLearningSkills(undefined, "science").find(
      (skill) => skill.id === "science-data-reading-locate",
    )!;
    const easy = skill.questionIds
      .map((id) => getDailyPracticeQuestion(id)!)
      .filter((q) => q.difficulty === "easy")
      .slice(0, 2);
    for (const q of easy)
      await call("/api/study/event", {
        ownerId,
        record: {
          kind: "answer",
          event: {
            id: randomUUID(),
            questionId: q.id,
            chosen: q.answer,
            elapsedMs: 12000,
            confidence: "high",
            cause: null,
            at: new Date().toISOString(),
            mode: "drill",
          },
        },
      });
    const evidence = (await call("/api/daily")) as DailyState;
    assert.equal(
      evidence.plan.course?.practiceLevels?.[
        `science:${skill.topic}:skill:${skill.id}`
      ],
      "medium",
    );
  }
  preview = (await call("/api/daily")) as DailyState;
  const active = (await call("/api/daily", {
    action: "start",
    planId: preview.plan.id,
  })) as DailyState;
  await profile(scenario.goal === 36 ? 24 : 36);
  const retained = (await call("/api/daily")) as DailyState;
  for (const field of ["plan", "answers", "lessons", "deadline"] as const)
    assert.deepEqual(retained[field], active[field]);
  await profile();
  sessions.push({ name: scenario.name, email, password, userId: ownerId });
  results.push({
    name: scenario.name,
    score: scenario.score,
    goal: scenario.goal,
    firstLessons: first,
    activeSessionPreserved: true,
  });
}
for (const subject of ["english", "math", "reading", "science"]) {
  const rows = results as {
    name: string;
    firstLessons: { subject: string; skill: string; teaching: string }[];
  }[];
  assert.notEqual(
    rows[0].firstLessons.find((item) => item.subject === subject)!.teaching,
    rows[2].firstLessons.find((item) => item.subject === subject)!.teaching,
    "Actual teaching must differ, not only its label.",
  );
  assert.notEqual(
    rows[0].firstLessons.find((item) => item.subject === subject)!.skill,
    rows[2].firstLessons.find((item) => item.subject === subject)!.skill,
    subject,
  );
}
writeFileSync(".env.qa-adaptive", JSON.stringify(sessions), { mode: 0o600 });
mkdirSync(".impeccable/review/adaptive-lessons", { recursive: true });
const receipt = {
  passed: true,
  requests,
  cases: results,
  firstAnswerEvidenceWired: true,
  savedSessionsPreserved: true,
};
writeFileSync(
  ".impeccable/review/adaptive-lessons/" +
    (base.includes("localhost") ? "local" : "production") +
    "-matrix.json",
  JSON.stringify(receipt, null, 2),
);
console.log(
  JSON.stringify({
    passed: true,
    requests,
    profiles: cases.length,
    sectionSpecificLessons: true,
    firstAnswerEvidenceWired: true,
    savedSessionsPreserved: true,
  }),
);
