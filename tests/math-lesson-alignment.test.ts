import { test } from "node:test";
import assert from "node:assert/strict";
import { getLesson, getQuestions } from "../src/lib/act/content";
import { DAILY_CURRICULUM } from "../src/lib/daily-curriculum";
import {
  makeDailyPlan,
  refreshDailyContent,
  selectDailyPlan,
} from "../src/lib/daily-plan";
import { blockUnits, dailyStep, dailyReviewKey } from "../src/lib/daily-flow";

const settings = {
  scores: { english: 34, reading: 33, math: 34, science: 27 },
  minutesPerDay: 75,
};

test("math unit titles describe both teaching and practice after a saved-content refresh", () => {
  const plan = makeDailyPlan(
    "titles",
    "2026-10-08",
    settings,
    0,
    undefined,
    [],
    {},
    {
      testDate: "2026-10-17",
      coveredUnits: [],
    },
  );
  const math = plan.blocks.find((b) => b.subject === "math")!;
  const unit = blockUnits(math)[0];
  assert.equal(unit.title, "Areas, triangles, and polygon angles");
  unit.title = "Translate the diagram and protect units";
  math.title = unit.title;
  const refreshed = refreshDailyContent(plan);
  const updated = refreshed.blocks.find((b) => b.subject === "math")!;
  assert.equal(
    blockUnits(updated)[0].title,
    "Areas, triangles, and polygon angles",
  );
  assert.equal(updated.title, blockUnits(updated)[0].title);
});

test("daily math drills include the specific method their questions require", () => {
  const requirements = [
    ["math-trigonometry", "math-trigonometry-d6", /elevation/, /tan/i],
    [
      "math-statistics-probability",
      "math-statistics-probability-d14",
      /exactly k successes/,
      /\\binom nk/,
    ],
    [
      "math-geometry",
      "math-geometry-d6",
      /perpendicular distance/,
      /\|Ax_0\+By_0\+C\|/,
    ],
    [
      "math-geometry",
      "math-geometry-d1",
      /trapezoid/,
      /\\frac\{\(b_1\+b_2\)h\}\{2\}/,
    ],
    ["math-geometry", "math-geometry-d3", /Heron/, /s=\\frac\{a\+b\+c\}\{2\}/],
    [
      "math-geometry",
      "math-geometry-d14",
      /interior angle/,
      /\\frac\{180\(n-2\)\}n/,
    ],
    [
      "math-geometry",
      "math-geometry-d2",
      /closed cylinder/,
      /2\\pi r\^2\+2\\pi rh/,
    ],
    [
      "math-geometry",
      "math-geometry-d16",
      /concentric circles/,
      /\\pi R\^2-\\pi r\^2/,
    ],
    ["math-algebra", "math-algebra-d18", /absolute-value inequality/, /-a<u<a/],
    [
      "math-algebra",
      "math-algebra-d14",
      /common denominator/,
      /\\frac\{a\+b\}\{b-a\}/,
    ],
    [
      "math-functions",
      "math-functions-d6",
      /arithmetic sequence/,
      /a_n=a_0\+nd/,
    ],
    [
      "math-functions",
      "math-functions-d5",
      /argument.*positive/,
      /sole valid root/,
    ],
  ] as const;
  for (const [topic, id, ...methods] of requirements) {
    const bank = getQuestions(topic);
    const index = bank.findIndex((q) => q.id === id);
    assert(index >= 0, id);
    const scopes = DAILY_CURRICULUM[topic].filter((s) =>
      s.practice.includes(index),
    );
    assert(scopes.length > 0, `${id} needs daily practice`);
    for (const scope of scopes) {
      const lesson = getLesson(topic);
      const text = scope.sections
        .flatMap((i) => [
          ...lesson.sections[i].body,
          ...(lesson.sections[i].examples ?? []).map((e) => e.text),
        ])
        .join(" ");
      for (const method of methods) assert.match(text, method, id);
    }
  }
});

test("returning after several days resumes saved math without replacing answers or concept positions", () => {
  const plan = makeDailyPlan(
    "resume",
    "2026-10-08",
    { ...settings, minutesPerDay: 90 },
    0,
    undefined,
    [],
    {},
    {
      testDate: "2026-10-17",
      coveredUnits: [],
    },
  );
  const lessons: string[] = [];
  const answers: Record<string, number> = {};
  for (const block of plan.blocks.slice(0, 2)) {
    for (const unit of blockUnits(block)) {
      lessons.push(
        unit.id,
        ...unit.lesson.sections.map((_, i) => `${unit.id}:concept:${i}`),
      );
    }
    lessons.push(dailyReviewKey(block));
    block.questions.forEach((q) => {
      answers[q.id] = q.answer;
    });
  }
  const math = plan.blocks.find((b) => b.subject === "math")!;
  const unit = blockUnits(math)[0];
  lessons.push(`${unit.id}:concept:0`);
  const selected = selectDailyPlan(plan, "resume", "2026-10-11", settings);
  assert.strictEqual(selected, plan);
  const refreshed = refreshDailyContent(selected, answers);
  const step = dailyStep(refreshed, answers, lessons);
  assert.equal(step.kind, "lesson");
  assert(step.kind === "lesson");
  assert.equal(step.block.subject, "math");
  assert.equal(step.unit.id, unit.id);
  assert.equal(
    step.unit.lesson.sections.findIndex(
      (_, i) => !lessons.includes(`${unit.id}:concept:${i}`),
    ),
    1,
  );
  assert.equal(refreshed.id, plan.id);
  assert.deepEqual(refreshDailyContent(refreshed, answers), refreshed);

  lessons.push(
    unit.id,
    ...step.unit.lesson.sections.map((_, i) => `${unit.id}:concept:${i}`),
  );
  const question = step.unit.questions[0];
  answers[question.id] = question.answer;
  const resumed = dailyStep(
    refreshDailyContent(refreshed, answers),
    answers,
    lessons,
  );
  if (unit.questions.length > 1) {
    assert.equal(resumed.kind, "drill");
    assert(resumed.kind === "drill");
    assert.notEqual(resumed.question.id, question.id);
    assert.equal(resumed.block.subject, "math");
  } else {
    // Longer corrected teaching can leave room for one application in this unit.
    assert.equal(resumed.kind, "lesson");
    assert(resumed.kind === "lesson");
    assert.notEqual(resumed.unit.id, unit.id);
  }
});

test("old trig and probability drills teach missing prerequisites without changing saved question IDs", () => {
  for (const [topic, position, legacyId, requiredSection] of [
    ["math-trigonometry", 12, "math-trigonometry-d6", 6],
    ["math-statistics-probability", 18, "math-statistics-probability-d14", 5],
  ] as const) {
    const plan = makeDailyPlan(
      "old-math",
      "2026-10-08",
      settings,
      0,
      undefined,
      [],
      { math: position },
    );
    const block = plan.blocks.find((b) => b.subject === "math")!;
    plan.blocks = [block];
    const unit = blockUnits(block)[0];
    const source = getQuestions(topic).find((q) => q.id === legacyId)!;
    unit.questions = [{ ...source, subject: "math", phase: "drill" }];
    unit.practiceIds = [legacyId];
    block.questions = unit.questions;
    block.reviewQuestions = [];
    const completed = [
      unit.id,
      ...unit.lesson.sections.map((_, i) => `${unit.id}:concept:${i}`),
    ];
    const refreshed = refreshDailyContent(plan);
    const repaired = blockUnits(refreshed.blocks[0])[0];
    assert.equal(repaired.questions[0].id, legacyId);
    assert(repaired.sectionIndices!.includes(requiredSection));
    assert.equal(dailyStep(refreshed, {}, completed).kind, "lesson");
    assert.equal(refreshed.id, plan.id);
    assert.equal(refreshed.minutes, plan.minutes);
    assert.deepEqual(refreshDailyContent(refreshed), refreshed);
  }
});
