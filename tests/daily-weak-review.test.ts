import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dailyScopes,
  makeDailyPlan,
  estimateDailyBlock,
  selectDailyPlan,
} from "../src/lib/daily-plan";
import { blockUnits, dailyFocus } from "../src/lib/daily-flow";
import { getQuestions } from "../src/lib/act/content";
import {
  planningScores,
  type StudySettings,
} from "../src/lib/account-settings";

const settings = {
  scores: { english: 34, reading: 33, math: 34, science: 27 },
  minutesPerDay: 60,
};
const math = dailyScopes("math", settings).find(
  (scope) => scope.scope.skillId === "math-geometry-trapezoid-area",
)!;
const science = dailyScopes("science", settings).find(
  (scope) => scope.scope.practice.length === 2,
)!;
function reviewPlan(minutesPerDay = 60, sequence = 1) {
  const scopeQuestions = [math, science].flatMap((scope) => {
    const bank = getQuestions(scope.topic.slug);
    return scope.scope.practice.map((index) => bank[index].id);
  });
  return makeDailyPlan(
    "review-recovery",
    "2026-10-16",
    { ...settings, minutesPerDay },
    sequence,
    { math: [math.id], science: [science.id] },
    scopeQuestions,
    {},
    {
      testDate: "2026-10-17",
      targetScore: 36,
      coveredUnits: [math.id, science.id],
      seenQuestions: scopeQuestions,
    },
  );
}

test("later review resolves actual two-question Math and Science skills even after both were seen", () => {
  const plan = reviewPlan();
  const before = structuredClone(plan);
  for (const scope of [math, science]) {
    const subject = scope === math ? "math" : "science";
    const block = plan.blocks.find((b) => b.subject === subject)!;
    const unit = block.reviewUnits!.find((u) => u.id === scope.id)!;
    const questions = block.reviewQuestions!.filter(
      (q) => q.reviewUnitId === unit.id,
    );
    assert.equal(questions.length, 2);
    assert(
      questions.every((q) => plan.previouslyAnsweredQuestions!.includes(q.id)),
    );
    const answers = Object.fromEntries(questions.map((q) => [q.id, q.answer]));
    const times = Object.fromEntries(questions.map((q) => [q.id, 10000]));
    assert(
      !dailyFocus(plan, answers, times)![block.subject]!.includes(scope.id),
    );
    const first = questions[0];
    for (const badTimes of [
      {},
      ...[0, -1, NaN, Infinity, 90000].map((value) => ({
        ...times,
        [first.id]: value,
      })),
    ])
      assert(
        dailyFocus(plan, answers, badTimes)![block.subject]!.includes(scope.id),
      );
    assert(
      dailyFocus(plan, answers, times, { [first.id]: true })![
        block.subject
      ]!.includes(scope.id),
    );
    assert(
      dailyFocus(
        plan,
        { ...answers, [first.id]: (first.answer + 1) % first.choices.length },
        times,
      )![block.subject]!.includes(scope.id),
    );
    assert(
      dailyFocus(plan, { [first.id]: first.answer }, times)![
        block.subject
      ]!.includes(scope.id),
    );
  }
  assert.deepEqual(
    plan,
    before,
    "review evaluation must not change saved history",
  );
});

test("ordinary known practice and repeated copies of one answer cannot resolve a weakness", () => {
  const plan = reviewPlan();
  const block = plan.blocks.find((b) => b.subject === "math")!;
  const unit = block.reviewUnits![0];
  const questions = block.reviewQuestions!.filter(
    (q) => q.reviewUnitId === unit.id,
  );
  const answers = Object.fromEntries(questions.map((q) => [q.id, q.answer]));
  const times = Object.fromEntries(questions.map((q) => [q.id, 10000]));
  block.reviewQuestions = [questions[0], questions[0]];
  assert(dailyFocus(plan, answers, times)!.math!.includes(math.id));
  block.reviewUnits = [];
  block.reviewQuestions = [];
  block.units = [
    {
      ...unit,
      questions: questions.map((q) => ({
        ...q,
        phase: "drill" as const,
        reviewUnitId: undefined,
      })),
    },
  ];
  assert(dailyFocus(plan, answers, times)!.math!.includes(math.id));
});

test("late-test plans reserve both weak review pairs inside every supported budget", () => {
  for (const minutes of [60, 75, 90]) {
    const plan = reviewPlan(minutes);
    assert.equal(
      plan.blocks.reduce((sum, block) => sum + block.minutes, 0),
      minutes,
    );
    for (const block of plan.blocks) {
      assert(estimateDailyBlock(block) <= block.minutes);
      const scope =
        block.subject === "math"
          ? math
          : block.subject === "science"
            ? science
            : undefined;
      if (scope) {
        assert(block.reviewUnits?.some((unit) => unit.id === scope.id));
        assert.equal(
          block.reviewQuestions!.filter((q) => q.reviewUnitId === scope.id)
            .length,
          2,
        );
        assert(
          !blockUnits(block).some((unit) => unit.id === scope.id),
          "review must not replace an unread lesson or move its course position",
        );
      }
      const covered = new Set([
        ...plan.course!.coveredUnits,
        ...blockUnits(block).map((unit) => unit.courseId ?? unit.id),
      ]);
      const scopes = dailyScopes(block.subject, settings);
      const next = scopes.findIndex((scope) => !covered.has(scope.id));
      assert.equal(
        plan.nextCurriculumPositions![block.subject],
        next < 0 ? scopes.length : next,
      );
    }
    assert.strictEqual(
      selectDailyPlan(plan, "review-recovery", "2026-10-17", settings),
      plan,
      "saved unfinished sessions stay unchanged",
    );
  }
});

test("weak reviews rotate and still use explicit review pairs after the course is covered", () => {
  const second = dailyScopes("math", settings).find(
    (s) => s.scope.skillId === "math-geometry-heron-area",
  )!;
  const weak = [math.id, second.id];
  const covered = ["english", "math", "reading", "science"].flatMap((subject) =>
    dailyScopes(subject as "math", settings).map((s) => s.id),
  );
  const selected: string[] = [];
  for (let sequence = 0; sequence < 2; sequence++) {
    const plan = makeDailyPlan(
      "rotation",
      "2026-10-16",
      settings,
      sequence,
      { math: weak },
      [],
      {},
      { testDate: "2026-10-17", coveredUnits: covered },
    );
    const block = plan.blocks.find((b) => b.subject === "math")!;
    assert.equal(block.reviewOnly, true);
    const unit = block.reviewUnits![0];
    selected.push(unit.id);
    assert.equal(
      block.reviewQuestions!.filter((q) => q.reviewUnitId === unit.id).length,
      2,
    );
    assert(estimateDailyBlock(block) <= block.minutes);
  }
  assert.deepEqual(selected, weak);
});

test("new near-test plans spend extra teaching time on the larger representative score gap", () => {
  const study = {
    scores: { english: 34, math: 34, reading: 33, science: 28 },
    minutesPerDay: 75,
    scienceScoreRepresentative: true,
  };
  const course = { testDate: "2026-10-17", targetScore: 36, coveredUnits: [] };
  const plan = makeDailyPlan(
    "score-gaps",
    "2026-10-15",
    study,
    0,
    undefined,
    [],
    {},
    course,
  );
  const minutes = Object.fromEntries(
    plan.blocks.map((block) => [block.subject, block.minutes]),
  );
  assert(minutes.science >= minutes.english + 10, JSON.stringify(minutes));
  assert(minutes.science > minutes.math && minutes.science > minutes.reading);
  assert.equal(
    plan.blocks.reduce((sum, block) => sum + block.minutes, 0),
    75,
  );
  assert(
    plan.blocks.every((block) => estimateDailyBlock(block) <= block.minutes),
  );
  const before = structuredClone(plan);
  assert.strictEqual(
    selectDailyPlan(
      plan,
      "score-gaps",
      "2026-10-16",
      { ...study, minutesPerDay: 90 },
      false,
      course,
    ),
    plan,
  );
  assert.deepEqual(
    plan,
    before,
    "updated priorities never replace an active saved session",
  );
});

test("equal, unknown, and nonrepresentative baselines retain existing planning rules and finite budgets", () => {
  const profiles: StudySettings[] = [
    {
      ...settings,
      scores: { english: 34, math: 34, reading: 34, science: 34 },
    },
    {
      ...settings,
      scores: { english: null, math: null, reading: null, science: null },
    },
    {
      ...settings,
      scores: { english: 34, math: 34, reading: 33, science: 28 },
      scienceScoreRepresentative: false,
    },
  ];
  for (const study of profiles)
    for (const minutesPerDay of [60, 75, 90]) {
      const profile = { ...study, minutesPerDay };
      const course = {
        testDate: "2026-10-17",
        targetScore: 36,
        coveredUnits: [],
      };
      const plan = makeDailyPlan(
        "neutral",
        "2026-10-15",
        profile,
        0,
        undefined,
        [],
        {},
        course,
      );
      assert.equal(
        plan.blocks.reduce((sum, block) => sum + block.minutes, 0),
        minutesPerDay,
      );
      assert(
        plan.blocks.every(
          (block) =>
            Number.isFinite(block.minutes) &&
            estimateDailyBlock(block) <= block.minutes,
        ),
      );
      if (profile.scienceScoreRepresentative === false) {
        const equivalent = makeDailyPlan(
          "neutral",
          "2026-10-15",
          {
            ...profile,
            scores: planningScores(profile),
            scienceScoreRepresentative: true,
          },
          0,
          undefined,
          [],
          {},
          course,
        );
        assert.deepEqual(
          plan.blocks,
          equivalent.blocks,
          "a low-effort Science result must not invent a remedial gap",
        );
      } else {
        const minutes = plan.blocks.map((block) => block.minutes);
        assert(
          Math.max(...minutes) - Math.min(...minutes) <= 12,
          "equal planning gaps should not favor the largest question bank",
        );
      }
    }
});
