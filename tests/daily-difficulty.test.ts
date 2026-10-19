import assert from "node:assert/strict";
import { test } from "node:test";
import {
  makeDailyPlan,
  dailyScopes,
  selectDailyPlan,
  estimateDailyBlock,
} from "../src/lib/daily-plan";
import { startingDifficulty } from "../src/lib/daily-difficulty";
import {
  dailyPracticeLevels,
  getDailyPracticeQuestion,
} from "../src/lib/daily-practice-levels";
import { getLearningSkills } from "../src/lib/learning-skills";
import type {
  StudySettings,
  AccountSubject,
} from "../src/lib/account-settings";
const subjects: AccountSubject[] = ["english", "math", "reading", "science"];
const study = (score: number | null, minutesPerDay = 90): StudySettings => ({
  scores: { english: score, math: score, reading: score, science: score },
  minutesPerDay,
});
const course = (targetScore: number) => ({
  targetScore,
  testDate: "2026-12-18",
  coveredUnits: [],
});
const make = (settings: StudySettings, goal: number) =>
  makeDailyPlan(
    "levels",
    "2026-10-18",
    settings,
    0,
    undefined,
    [],
    {},
    course(goal),
  );

test("current score sets support; a high goal alone never jumps a beginner to hard lessons", () => {
  assert.equal(startingDifficulty(null, 36), "easy");
  assert.equal(startingDifficulty(16, 36), "easy");
  assert.equal(startingDifficulty(23, 28), "easy");
  assert.equal(startingDifficulty(27, 32), "medium");
  assert.equal(startingDifficulty(32, 35), "hard");
  assert.equal(startingDifficulty(32, 28), "medium");
});

test("96 score/goal/time scenarios change real lesson skills and questions within budget", () => {
  for (const current of [null, 16, 22, 27, 30, 34])
    for (const goal of [24, 28, 32, 36])
      for (const minutes of [15, 30, 60, 90]) {
        const settings = study(current, minutes),
          plan = make(settings, goal);
        assert.equal(plan.minutes, minutes);
        assert(
          plan.blocks.reduce(
            (sum, block) => sum + Math.ceil(estimateDailyBlock(block)),
            0,
          ) <= minutes,
        );
        for (const block of plan.blocks)
          for (const unit of block.units!) {
            assert.equal(unit.difficulty, startingDifficulty(current, goal));
            assert(unit.questions.length > 0);
            if (current === null || current < 24)
              assert(
                unit.questions.every((q) => q.difficulty === "easy"),
                `${current}/${goal}/${block.subject}/${unit.skillId}`,
              );
          }
      }
  const beginner = make(study(16), 36),
    core = make(study(27), 32),
    advanced = make(study(32), 35);
  for (const subject of subjects) {
    const first = (plan: typeof beginner) =>
      plan.blocks.find((b) => b.subject === subject)!.units![0];
    assert.notEqual(first(beginner).skillId, first(core).skillId, subject);
    assert.notEqual(first(beginner).skillId, first(advanced).skillId, subject);
    assert.equal(first(beginner).questions[0].difficulty, "easy");
    assert.equal(first(core).questions[0].difficulty, "medium");
    assert.equal(first(advanced).questions[0].difficulty, "hard");
  }
  assert.equal(
    beginner.blocks.find((b) => b.subject === "math")!.units![0].skillId,
    "math-algebra-linear-equations",
  );
});

test("a mixed profile receives section-specific lessons and keeps optional Science optional", () => {
  const plan = make(
    {
      ...study(16),
      scores: { english: 16, math: 32, reading: 27, science: 18 },
    },
    35,
  );
  assert.equal(
    plan.blocks.find((b) => b.subject === "english")!.units![0].difficulty,
    "easy",
  );
  assert.equal(
    plan.blocks.find((b) => b.subject === "math")!.units![0].difficulty,
    "hard",
  );
  assert.equal(
    plan.blocks.find((b) => b.subject === "reading")!.units![0].difficulty,
    "medium",
  );
  assert.equal(
    plan.blocks.find((b) => b.subject === "science")!.units![0].difficulty,
    "easy",
  );
  assert(
    !make({ ...study(16), includeScience: false }, 28).blocks.some(
      (b) => b.subject === "science",
    ),
  );
});

test("fresh skill evidence changes future challenge level in every subject without changing ACT scores", () => {
  for (const subject of subjects) {
    const skill = getLearningSkills(undefined, subject).find((skill) => {
      const pool = skill.questionIds.map((id) => getDailyPracticeQuestion(id)!);
      return (
        pool.filter((q) => q.difficulty === "easy").length >= 2 &&
        pool.filter((q) => q.difficulty !== "easy").length >= 2
      );
    })!;
    assert(skill, subject);
    const key = `${subject}:${skill.topic}:skill:${skill.id}`;
    const easy = skill.questionIds
      .map((id) => getDailyPracticeQuestion(id)!)
      .filter((q) => q.difficulty === "easy");
    const settings = study(18),
      before = structuredClone(settings);
    const outcomes = new Map(easy.slice(0, 2).map((q) => [q.id, true]));
    assert.equal(
      dailyPracticeLevels(settings, 32, outcomes)[key],
      "medium",
      subject,
    );
    outcomes.set(easy[0].id, true);
    assert.equal(
      outcomes.size,
      2,
      "Repeated question identities do not add evidence.",
    );
    const other = skill.questionIds
      .map((id) => getDailyPracticeQuestion(id)!)
      .find((q) => q.difficulty !== "easy")!;
    outcomes.set(other.id, false);
    assert.equal(
      dailyPracticeLevels(settings, 32, outcomes)[key],
      "easy",
      subject,
    );
    assert.deepEqual(settings, before);
    const scopes = dailyScopes(subject),
      chosen = scopes.find((scope) => scope.scope.skillId === skill.id)!;
    const high = makeDailyPlan(
      "proof",
      "2026-10-18",
      study(32),
      0,
      { [subject]: [chosen.id] },
      [],
      {},
      { ...course(35), practiceLevels: { [chosen.id]: "easy" } },
    );
    const unit = high.blocks
      .find((b) => b.subject === subject)!
      .units!.find((u) => u.skillId === skill.id)!;
    assert.equal(unit.difficulty, "easy");
    assert(unit.questions.every((q) => q.difficulty === "easy"));
  }
});

test("new difficulty rules never replace a saved lesson, its question pool or completion keys", () => {
  const saved = make(study(18), 28),
    before = structuredClone(saved);
  assert.strictEqual(
    selectDailyPlan(
      saved,
      "levels",
      "2026-10-19",
      study(34),
      false,
      course(36),
    ),
    saved,
  );
  assert.deepEqual(saved, before);
});

test("excluded Science scores retain their earlier neutral planning treatment", () => {
  const settings = {
    ...study(34),
    scores: { ...study(34).scores, science: 18 },
    scienceScoreRepresentative: false,
  };
  const plan = make(settings, 36);
  const science = plan.blocks.find((block) => block.subject === "science")!;
  assert.equal(science.units![0].difficulty, "hard");
  const skill = getLearningSkills(undefined, "science").find(
    (skill) => skill.id === "science-data-reading-locate",
  )!;
  const easy = skill.questionIds
    .map((id) => getDailyPracticeQuestion(id)!)
    .filter((q) => q.difficulty === "easy")
    .slice(0, 2);
  assert.equal(
    dailyPracticeLevels(settings, 36, new Map(easy.map((q) => [q.id, true])))[
      `science:${skill.topic}:skill:${skill.id}`
    ],
    "hard",
  );
  assert.equal(settings.scores.science, 18);
});
