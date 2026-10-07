import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeDailyPlan,
  dailyBudget,
  dailyComplete,
  dailyDate,
  dailyId,
  DAILY_SUBJECTS,
  selectDailyPlan,
} from "../src/lib/daily-plan";
import { getExamQuestions, getExams } from "../src/lib/act/content";
import { validateStudySettings } from "../src/lib/account-settings";
const settings = {
  scores: { english: 32, math: 34, reading: null, science: 27 },
  minutesPerDay: 75,
};
test("one total budget covers all four subjects with more time for lower baselines", () => {
  for (const budget of [60, 75, 90]) {
    const minutes = dailyBudget(budget, settings.scores);
    assert.equal(
      minutes.reduce((a, b) => a + b, 0),
      budget,
    );
    assert(minutes.every((n) => n >= 10));
    assert(minutes[3] > minutes[2]);
  }
});
test("daily program includes substantial lesson content and original practice in all subjects", () => {
  const plan = makeDailyPlan("qa", "2026-10-06", settings, 0);
  assert.deepEqual(
    plan.blocks.map((b) => b.subject),
    DAILY_SUBJECTS,
  );
  const reserved = new Set(
    getExams().flatMap((e) => getExamQuestions(e.id).map((q) => q.id)),
  );
  for (const b of plan.blocks) {
    assert(b.lesson.sections[0].body.length);
    assert(b.questions.length >= 3);
    assert.equal(
      new Set(b.questions.map((q) => q.id)).size,
      b.questions.length,
    );
    for (const q of b.questions) assert(!reserved.has(q.id));
  }
  assert.equal(
    new Set(plan.blocks[1].questions.map((q) => q.passage?.id)).size,
    1,
  );
});
test("categories progress once per completed program and IDs are account scoped", () => {
  const a = makeDailyPlan("qa", "2026-10-06", settings, 0),
    b = makeDailyPlan("qa", "2026-10-07", settings, 1);
  assert(a.blocks.every((block, i) => block.topic !== b.blocks[i].topic));
  assert.notEqual(a.id, makeDailyPlan("another", "2026-10-06", settings, 0).id);
  assert.match(
    a.id,
    /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-a[\da-f]{3}-[\da-f]{12}$/,
  );
  assert.equal(dailyId("same"), dailyId("same"));
});
test("completion requires all lessons and answered questions including incorrect choices", () => {
  const p = makeDailyPlan("qa", "2026-10-06", settings, 0);
  const a = Object.fromEntries(
    p.blocks.flatMap((b) => b.questions.map((q) => [q.id, 0])),
  );
  assert(!dailyComplete(p, {}, DAILY_SUBJECTS));
  assert(!dailyComplete(p, a, ["english"]));
  assert(dailyComplete(p, a, DAILY_SUBJECTS));
});
test("daily calendar follows Chicago across UTC midnight", () => {
  assert.equal(dailyDate(new Date("2026-10-07T01:00:00Z")), "2026-10-06");
});
test("all category rotations retain real questions and lessons", () => {
  assert(validateStudySettings(settings));
  for (let i = 0; i < 45; i++) {
    const p = makeDailyPlan("qa", "2026-10-06", settings, i);
    for (const b of p.blocks) {
      assert(b.questions.length >= 3);
      assert(b.lesson.sections.length);
    }
  }
});

test("missed work resumes without doubling the next day and completion advances only tomorrow", () => {
  const p = makeDailyPlan("qa", "2026-10-06", settings, 0);
  assert.equal(selectDailyPlan(p, "qa", "2026-10-09", settings), p);
  const completed = { ...p, complete: true, completedDate: "2026-10-09" };
  assert.equal(
    selectDailyPlan(completed, "qa", "2026-10-09", settings),
    completed,
  );
  const next = selectDailyPlan(completed, "qa", "2026-10-10", settings);
  assert.equal(next.sequence, 1);
  assert.equal(next.minutes, 75);
  assert.equal(next.blocks.length, 4);
});
