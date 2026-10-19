import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dailyBudget,
  dailyCoverage,
  dailyHistory,
  dailyScopes,
  dailySubjects,
  estimateDailyBlock,
  makeDailyPlan,
  selectDailyPlan,
  type DailyPlan,
} from "../src/lib/daily-plan";
import { blockUnits, dailyConcepts, dailyFocus } from "../src/lib/daily-flow";

const settings = {
  scores: { english: 32, math: 34, reading: 30, science: 27 },
  minutesPerDay: 15,
};
const start = "2026-10-17";
const date = (day: number) =>
  new Date(Date.parse(start) + day * 86400000).toISOString().slice(0, 10);

test("custom budgets fit complete teaching and matched practice with nonnegative allocations", () => {
  for (const includeScience of [false, true])
    for (const minutesPerDay of [15, 16, 23, 37, 59, 61, 119, 167, 240]) {
      const study = { ...settings, includeScience, minutesPerDay };
      const allocations = dailyBudget(
        minutesPerDay,
        study.scores,
        36,
        includeScience,
      );
      assert.equal(
        allocations.reduce((sum, minutes) => sum + minutes, 0),
        minutesPerDay,
      );
      assert(allocations.every((minutes) => minutes >= 0));
      const plan = makeDailyPlan(
        "budget",
        start,
        study,
        0,
        undefined,
        [],
        {},
        {
          testDate: date(30),
          coveredUnits: [],
        },
      );
      assert.equal(plan.minutes, minutesPerDay);
      assert.equal(
        plan.blocks.reduce((sum, block) => sum + block.minutes, 0),
        minutesPerDay,
      );
      assert(plan.blocks.length > 0);
      assert.equal(
        plan.blocks.some((block) => block.subject === "science") &&
          !includeScience,
        false,
      );
      for (const block of plan.blocks) {
        assert(
          estimateDailyBlock(block) <= block.minutes,
          `${minutesPerDay}/${block.subject}`,
        );
        for (const unit of blockUnits(block)) {
          assert(dailyConcepts(unit).length > 0, unit.id);
          assert(unit.questions.length > 0, unit.id);
          assert(
            unit.questions.every(
              (question) => question.skillId === unit.skillId,
            ),
            unit.id,
          );
        }
      }
    }
});

test("short days rotate all included subjects while keeping skipped cursors and weak skills", () => {
  for (const includeScience of [false, true]) {
    const study = { ...settings, includeScience };
    let positions: DailyPlan["curriculumPositions"] = { science: 7 };
    const focus = { science: [dailyScopes("science")[7].id] };
    const seen = new Set<string>();
    for (let sequence = 0; sequence < 8; sequence++) {
      const plan = makeDailyPlan(
        "rotation",
        date(sequence),
        study,
        sequence,
        focus,
        [],
        positions,
      );
      assert(
        plan.blocks.length < dailySubjects(includeScience).length ||
          includeScience === false,
      );
      for (const subject of dailySubjects(includeScience)) {
        const block = plan.blocks.find((item) => item.subject === subject);
        if (block) {
          seen.add(subject);
          assert.equal(
            plan.curriculumPositions?.[subject],
            positions[subject] ?? 0,
          );
          assert.equal(
            plan.nextCurriculumPositions?.[subject],
            (positions[subject] ?? 0) + blockUnits(block).length,
          );
        } else {
          assert.equal(
            plan.nextCurriculumPositions?.[subject],
            positions[subject] ?? 0,
          );
          assert.deepEqual(
            dailyFocus(plan, {})?.[subject],
            focus[subject as keyof typeof focus],
          );
        }
      }
      if (!includeScience)
        assert.equal(plan.nextCurriculumPositions?.science, 7);
      positions = plan.nextCurriculumPositions!;
      if (sequence === 3)
        assert.deepEqual(
          [...seen].sort(),
          dailySubjects(includeScience).sort(),
        );
    }
  }
});

test("changing minutes, test date and Science never replaces an unfinished or same-day saved plan", () => {
  const original = makeDailyPlan(
    "saved",
    start,
    { ...settings, minutesPerDay: 75 },
    4,
    undefined,
    [],
    {},
    {
      testDate: date(30),
      coveredUnits: [dailyScopes("math")[0].id],
      completedSessions: ["earlier"],
    },
  );
  const before = structuredClone(original);
  const changed = { ...settings, includeScience: false, minutesPerDay: 23 };
  for (const today of [start, date(1)]) {
    assert.strictEqual(
      selectDailyPlan(original, "saved", today, changed, false, {
        testDate: date(10),
        coveredUnits: [],
      }),
      original,
    );
    assert.deepEqual(original, before);
  }
  const completed = { ...original, complete: true };
  assert.strictEqual(
    selectDailyPlan(completed, "saved", start, changed),
    completed,
  );
  const history = dailyHistory([completed]);
  const next = selectDailyPlan(completed, "saved", date(1), changed, false, {
    testDate: date(10),
    ...history,
  });
  assert.equal(next.minutes, 23);
  assert(next.course?.completedSessions?.includes("earlier"));
  assert(next.course?.completedSessions?.includes(original.id));
  for (const id of history.coveredUnits)
    assert(next.course?.coveredUnits.includes(id));
  assert.equal(
    next.blocks.some((block) => block.subject === "science"),
    false,
  );
});

test("a short daily budget can cover every included skill without skipping earned progress", () => {
  const study = { ...settings, includeScience: true };
  const all = dailySubjects().flatMap((subject) =>
    dailyScopes(subject, study).map((scope) => scope.id),
  );
  const covered = new Set<string>();
  for (
    let sequence = 0;
    sequence < 220 && covered.size < all.length;
    sequence++
  ) {
    const plan = makeDailyPlan(
      "course",
      date(sequence),
      study,
      sequence,
      undefined,
      [],
      {},
      {
        testDate: date(220),
        coveredUnits: [...covered],
      },
    );
    assert(
      plan.blocks.every((block) => estimateDailyBlock(block) <= block.minutes),
    );
    const added = plan.blocks
      .filter((block) => !block.reviewOnly)
      .flatMap(blockUnits);
    assert(added.length > 0, `day ${sequence}: stalled coverage`);
    for (const unit of added) {
      const id = unit.courseId ?? unit.id;
      assert(!covered.has(id), `reassigned earned unit ${id}`);
      covered.add(id);
    }
  }
  assert.equal(covered.size, all.length);
});

test("test date and custom minutes forecast attainable coverage without crediting planned work", () => {
  const longCourse = { testDate: date(220), coveredUnits: [] };
  const shortCourse = { ...longCourse, testDate: date(1) };
  const plan = makeDailyPlan(
    "forecast",
    start,
    settings,
    0,
    undefined,
    [],
    {},
    longCourse,
  );
  const before = structuredClone(plan);
  const coverage = dailyCoverage(plan, settings, longCourse, start);
  assert(coverage.onTrack);
  assert(coverage.finishDate! < longCourse.testDate);
  assert.equal(coverage.requiredMinutes, 15);
  assert.equal(coverage.covered, 0);
  assert.equal(
    dailyCoverage(plan, settings, shortCourse, start).onTrack,
    false,
  );
  assert.equal(
    dailyCoverage(plan, settings, longCourse, longCourse.testDate).onTrack,
    false,
  );
  assert.deepEqual(plan, before);
  const faster = { ...settings, minutesPerDay: 37 };
  const fasterPlan = makeDailyPlan(
    "forecast",
    start,
    faster,
    0,
    undefined,
    [],
    {},
    longCourse,
  );
  assert(
    dailyCoverage(fasterPlan, faster, longCourse, start).finishDate! <
      coverage.finishDate!,
  );
});

test("guided explorations reserve their added teaching time inside the daily budget", () => {
  for (const [subject, skillId] of [
    ["english", "dependent-boundary"],
    ["math", "math-modeling-linear-models"],
    ["reading", "reading-inference-evidence-link"],
    ["science", "science-experimental-design-confounds"],
  ] as const) {
    const position = dailyScopes(subject).findIndex(
      (scope) => scope.scope.skillId === skillId,
    );
    assert(position >= 0);
    const plan = makeDailyPlan(
      "exploration",
      start,
      { ...settings, minutesPerDay: 240 },
      0,
      undefined,
      [],
      { [subject]: position },
    );
    const block = plan.blocks.find((item) => item.subject === subject)!;
    const unit = blockUnits(block).find((item) => item.skillId === skillId)!;
    const isolated = {
      ...block,
      units: [unit],
      questions: unit.questions,
      reviewQuestions: [],
    };
    const without = {
      ...isolated,
      units: [{ ...unit, skillId: "ordinary-skill" }],
    };
    const count = dailyConcepts(unit).filter(
      (index) => unit.lesson.sections[index].activity,
    ).length;
    assert(count > 0);
    assert.equal(
      Math.round(
        (estimateDailyBlock(isolated) - estimateDailyBlock(without)) * 100,
      ),
      count * 150,
    );
  }
});

test("short days favor larger current-to-goal gaps and retain maintenance sessions", () => {
  const counts = { english: 0, math: 0, reading: 0, science: 0 };
  const minutes = { ...counts };
  const study = {
    scores: { english: 30, math: 18, reading: 30, science: 30 },
    minutesPerDay: 15,
  };
  const course = { targetScore: 30, testDate: date(60), coveredUnits: [] };
  for (let sequence = 0; sequence < 18; sequence++) {
    const plan = makeDailyPlan(
      "gap",
      date(sequence),
      study,
      sequence,
      undefined,
      [],
      {},
      course,
    );
    plan.blocks.forEach((block) => {
      counts[block.subject]++;
      minutes[block.subject] += block.minutes;
    });
    assert(
      plan.blocks.reduce(
        (sum, block) => sum + Math.ceil(estimateDailyBlock(block)),
        0,
      ) <= 15,
    );
  }
  assert(minutes.math > minutes.english, JSON.stringify(minutes));
  assert(minutes.math > minutes.reading, JSON.stringify(minutes));
  assert(minutes.math > minutes.science, JSON.stringify(minutes));
  assert(Object.values(counts).every((count) => count > 0));
  const improved = { ...study, scores: { ...study.scores, math: 30 } };
  const maintenance = makeDailyPlan(
    "gap",
    start,
    improved,
    0,
    undefined,
    [],
    {},
    course,
  );
  assert.equal(maintenance.blocks[0].subject, "english");
  const lowerGoal = makeDailyPlan(
    "gap",
    start,
    study,
    0,
    undefined,
    [],
    {},
    { ...course, targetScore: 18 },
  );
  assert.equal(lowerGoal.blocks[0].subject, "english");
});

test("an unknown baseline receives practice without inventing a 28 starting score", () => {
  assert(
    dailyBudget(
      75,
      { english: 24, math: null, reading: 24, science: 24 },
      24,
    )[2] > 10,
  );
});
