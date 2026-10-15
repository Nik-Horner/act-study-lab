import { test } from "node:test";
import assert from "node:assert/strict";
import { getLesson, getQuestions, getQuestion } from "../src/lib/act/content";
import {
  focusLesson,
  getLearningSkill,
  getQuestionTeaching,
} from "../src/lib/learning-skills";
import {
  dailyScopes,
  makeDailyPlan,
  refreshDailyContent,
  selectDailyPlan,
  type DailyPlan,
} from "../src/lib/daily-plan";
import { blockUnits, dailyStep, dailyConcepts } from "../src/lib/daily-flow";
import legacyFixtures from "./fixtures/focused-curriculum-legacy.json";

const settings = {
  scores: { english: 34, reading: 33, math: 34, science: 27 },
  minutesPerDay: 75,
};

test("math unit titles describe the exact taught method after a saved-content refresh", () => {
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
  const skill = getLearningSkill(unit.topic, unit.skillId!)!;
  assert.equal(unit.title, skill.title);
  assert.equal(unit.lesson.title, skill.title);
  unit.title = "An obsolete broad-topic title";
  math.title = unit.title;
  const updated = refreshDailyContent(plan).blocks.find(
    (b) => b.subject === "math",
  )!;
  assert.equal(blockUnits(updated)[0].title, skill.title);
  assert.equal(updated.title, skill.title);
});

test("daily math assignments teach their specific formula, conditions, and interpretation", () => {
  const requirements = [
    [
      "math-trigonometry-d6",
      /elevation/i,
      String.raw`\tan\theta=\frac{\text{opposite}}{\text{adjacent}}`,
    ],
    [
      "math-statistics-probability-d14",
      /exactly k\s*successes/i,
      String.raw`C \left(n,k\right) p^{k}`,
    ],
    [
      "math-geometry-d6",
      /perpendicular distance/i,
      String.raw`\frac{\lvert Ax_{0}+By_{0}+C\rvert }{\sqrt{A^{2}+B^{2}}}`,
    ],
    [
      "math-geometry-d1",
      /trapezoid/i,
      String.raw`A=\frac{\left(b_{1}+b_{2}\right) h}{2}`,
    ],
    ["math-geometry-d3", /Heron/, String.raw`s=\frac{a+b+c}{2}`],
    [
      "math-geometry-d14",
      /interior angle/i,
      String.raw`\frac{180 \left(n-2\right)}{n}`,
    ],
    [
      "math-geometry-d2",
      /closed.*cylinder/i,
      String.raw`2 \pi  rh+2 \pi  r^{2}`,
    ],
    [
      "math-geometry-d16",
      /concentric circles/i,
      String.raw`\pi  \left(R^{2}-r^{2}\right)`,
    ],
    ["math-algebra-d18", /distance inequalities/i, String.raw`-a<u<a`],
    [
      "math-algebra-d14",
      /common denominator/i,
      /reciprocal of the entire denominator/i,
    ],
    ["math-functions-d6", /arithmetic sequence/i, String.raw`a_{n}=a_{0}+nd`],
    [
      "math-functions-d5",
      /positivity.*original argument/i,
      /allowed root.*fails the original arguments/i,
    ],
  ] as const;
  for (const [id, ...methods] of requirements) {
    const q = getQuestion(id)!;
    const bank = getQuestions(q.topic);
    const index = bank.findIndex((item) => item.id === id);
    const scopes = dailyScopes("math").filter(
      (s) => s.topic.slug === q.topic && s.scope.practice.includes(index),
    );
    assert(scopes.length, `${id} must be reachable in Daily Study`);
    for (const { scope } of scopes) {
      const skill = getLearningSkill(q.topic, scope.skillId!)!;
      const lesson = focusLesson(getLesson(q.topic), {
        ...skill,
        sections: scope.sections,
      });
      const text = lesson.sections
        .flatMap((s) => [
          s.heading,
          ...s.body,
          ...(s.examples ?? []).map((e) => e.text),
        ])
        .join(" ");
      for (const method of methods) {
        if (typeof method === "string")
          assert(
            text.replace(/\s+/g, "").includes(method.replace(/\s+/g, "")),
            id,
          );
        else assert.match(text, method, id);
      }
      assert.deepEqual(
        scope.sections,
        getQuestionTeaching(q.topic, id)!.teachingSections,
        id,
      );
      assert(
        lesson.sections.some((s) => s.activity),
        `${id} needs a separate formative task`,
      );
    }
  }
});

test("returning after several days preserves saved math answers and original concept keys while requiring the focused repair", () => {
  const fixture = legacyFixtures.cases.find(
    (f) => f.subject === "math" && f.partial,
  )!;
  const original = structuredClone(fixture.plan) as unknown as DailyPlan;
  const math = original.blocks.find((b) => b.subject === "math")!;
  original.blocks = [math];
  const unit = blockUnits(math)[0];
  const oldIndices = [...unit.sectionIndices!];
  const answers = { ...(fixture.answers as unknown as Record<string, number>) };
  const completed = [...fixture.lessons, unit.id];
  const selected = selectDailyPlan(original, "resume", "2026-10-16", settings);
  assert.strictEqual(selected, original);
  const refreshed = refreshDailyContent(selected, answers);
  const updated = blockUnits(refreshed.blocks[0])[0];
  assert.equal(updated.id, unit.id);
  assert.deepEqual(
    updated.sectionIndices!.slice(0, oldIndices.length),
    oldIndices,
  );
  for (const id of Object.keys(answers))
    assert(refreshed.blocks[0].questions.some((q) => q.id === id));
  const step = dailyStep(refreshed, answers, completed);
  assert.equal(step.kind, "lesson");
  assert(step.kind === "lesson");
  assert.equal(step.unit.id, unit.id);
  assert(
    step.unit.requiredConceptIndices!.some(
      (i) => !completed.includes(`${unit.id}:concept:${i}`),
    ),
  );
  assert.equal(refreshed.id, original.id);
  assert.deepEqual(refreshDailyContent(refreshed, answers), refreshed);
  completed.push(
    ...dailyConcepts(updated).map((i) => `${updated.id}:concept:${i}`),
  );
  const next = dailyStep(refreshed, answers, completed);
  assert.equal(next.kind, "drill");
  assert(next.kind === "drill");
  assert.equal(next.unit.id, unit.id);
  assert.equal(answers[next.question.id], undefined);
  assert.equal(next.question.skillId, updated.skillId);
});

test("legacy trig and probability assignments gain their exact method without changing saved question IDs or prior concept positions", () => {
  for (const id of [
    "math-trigonometry-d6",
    "math-statistics-probability-d14",
  ]) {
    const source = getQuestion(id)!;
    const teaching = getQuestionTeaching(source.topic, id)!;
    const position = dailyScopes("math").findIndex(
      (s) => s.scope.skillId === teaching.skillId,
    );
    const plan = makeDailyPlan(
      "old-math",
      "2026-10-08",
      { ...settings, scores: { ...settings.scores, math: null } },
      0,
      undefined,
      [],
      { math: position },
    );
    const block = plan.blocks.find((b) => b.subject === "math")!;
    plan.blocks = [block];
    const unit = blockUnits(block)[0];
    block.units = [unit];
    unit.id = `math:${source.topic}:scope:legacy`;
    unit.skillId = undefined;
    unit.sectionIndices = [0];
    unit.lesson = {
      ...getLesson(source.topic),
      sections: [getLesson(source.topic).sections[0]],
      check: [],
    };
    unit.questions = [{ ...source, phase: "drill" }];
    unit.practiceIds = [id];
    block.questions = unit.questions;
    block.reviewQuestions = [];
    const completed = [unit.id, `${unit.id}:concept:0`];
    const refreshed = refreshDailyContent(plan);
    const repaired = blockUnits(refreshed.blocks[0])[0];
    assert.equal(repaired.questions[0].id, id);
    assert.deepEqual(repaired.sectionIndices!.slice(0, 1), [0]);
    assert(repaired.sectionIndices!.includes(teaching.teachingSections[0]));
    assert(repaired.requiredConceptIndices!.includes(1));
    assert.equal(dailyStep(refreshed, {}, completed).kind, "lesson");
    completed.push(
      ...dailyConcepts(repaired).map((i) => `${unit.id}:concept:${i}`),
    );
    assert.equal(dailyStep(refreshed, {}, completed).kind, "drill");
    assert.equal(refreshed.id, plan.id);
    assert.equal(refreshed.minutes, plan.minutes);
    assert.deepEqual(refreshDailyContent(refreshed), refreshed);
  }
});
