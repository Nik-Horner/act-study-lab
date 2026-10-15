import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyFocus, blockUnits } from "../src/lib/daily-flow";
import { dailyScopes, makeDailyPlan } from "../src/lib/daily-plan";
import { getLesson, getQuestions } from "../src/lib/act/content";
import { focusLesson, getLearningSkills } from "../src/lib/learning-skills";
import { QUESTION_TARGET_SECONDS } from "../src/lib/question-pacing";
const settings = {
  scores: { english: 34, reading: 33, math: 34, science: null },
  minutesPerDay: 90,
};
function fixture() {
  const plan = makeDailyPlan("evidence", "2026-10-09", settings, 0);
  const block = plan.blocks.find((b) => b.subject === "math")!;
  const unit = blockUnits(block)[0];
  unit.questions = getQuestions(unit.topic)
    .filter((q) => q.skillId === unit.skillId)
    .map((q) => ({ ...q, subject: "math" as const }));
  block.units = [unit];
  block.reviewQuestions = [];
  const answers = Object.fromEntries(
    plan.blocks
      .flatMap((b) => [
        ...blockUnits(b).flatMap((u) => u.questions),
        ...(b.reviewQuestions ?? []),
      ])
      .map((q) => [q.id, q.answer]),
  );
  const answerTimes = Object.fromEntries(
    unit.questions.map((q) => [q.id, QUESTION_TARGET_SECONDS.math * 1000]),
  );
  return { plan, block, unit, answers, answerTimes };
}
test("a single miss stays in review despite other correct answers for a 36 goal", () => {
  const { plan, unit, answers } = fixture();
  assert(unit.questions.length >= 2);
  const q = unit.questions[0];
  answers[q.id] = (q.answer + 1) % 4;
  assert(dailyFocus(plan, answers)!.math!.includes(unit.courseId ?? unit.id));
});
test("correct but slow or flagged uncertain answers stay in review", () => {
  const { plan, unit, answers, answerTimes } = fixture();
  const q = unit.questions[0];
  const key = unit.courseId ?? unit.id;
  plan.nextFocus = { math: [key] };
  assert(
    dailyFocus(plan, answers, {
      ...answerTimes,
      [q.id]: (QUESTION_TARGET_SECONDS.math + 1) * 1000,
    })!.math!.includes(key),
  );
  assert(
    dailyFocus(plan, answers, answerTimes, { [q.id]: true })!.math!.includes(
      key,
    ),
  );
  assert(!dailyFocus(plan, answers, answerTimes)!.math!.includes(key));
});
test("repeating known answers cannot clear a previously weak scope", () => {
  const { plan, unit, answers, answerTimes } = fixture();
  const key = unit.courseId ?? unit.id;
  plan.nextFocus = { math: [key] };
  plan.previouslyAnsweredQuestions = unit.questions.map((q) => q.id);
  assert(dailyFocus(plan, answers, answerTimes)!.math!.includes(key));
  plan.previouslyAnsweredQuestions = unit.questions.slice(1).map((q) => q.id);
  assert(dailyFocus(plan, answers, answerTimes)!.math!.includes(key));
  plan.previouslyAnsweredQuestions = unit.questions.slice(2).map((q) => q.id);
  assert(!dailyFocus(plan, answers, answerTimes)!.math!.includes(key));
});
test("clearing a weakness requires two distinct fresh timed answers", () => {
  const { plan, unit, answerTimes } = fixture();
  const key = unit.courseId ?? unit.id;
  plan.nextFocus = { math: [key] };
  const [first, second] = unit.questions;
  const answers = { [first.id]: first.answer };
  assert(dailyFocus(plan, answers, answerTimes)!.math!.includes(key));
  unit.questions.push(first);
  assert(dailyFocus(plan, answers, answerTimes)!.math!.includes(key));
  answers[second.id] = second.answer;
  assert(!dailyFocus(plan, answers, answerTimes)!.math!.includes(key));
  assert.deepEqual(
    plan.nextFocus.math,
    [key],
    "evidence must not mutate progress",
  );
});
test("missing or invalid timing cannot clear a previously weak scope", () => {
  const { plan, unit, answers, answerTimes } = fixture();
  const key = unit.courseId ?? unit.id;
  plan.nextFocus = { math: [key] };
  assert(dailyFocus(plan, answers)!.math!.includes(key));
  const firstId = unit.questions[0].id;
  delete answerTimes[firstId];
  assert(dailyFocus(plan, answers, answerTimes)!.math!.includes(key));
  for (const invalid of [-1, NaN, Infinity]) {
    answerTimes[firstId] = invalid;
    assert(dailyFocus(plan, answers, answerTimes)!.math!.includes(key));
  }
});
test("review answers only clear the primary skill they assess", () => {
  const { plan, block, unit, answerTimes } = fixture();
  const key = unit.courseId ?? unit.id;
  const other = getLearningSkills(unit.topic).find(
    (s) => s.id !== unit.skillId && s.questionIds.length >= 2,
  )!;
  const reviewKey = `math:${other.topic}:skill:${other.id}`;
  const reviewUnit = {
    ...unit,
    id: reviewKey,
    courseId: reviewKey,
    skillId: other.id,
    lesson: focusLesson(getLesson(other.topic), other),
    practiceIds: other.questionIds,
    questions: [],
  };
  const [first, second] = getQuestions(other.topic).filter(
    (q) => q.skillId === other.id,
  );
  unit.questions = [];
  block.reviewUnits = [reviewUnit];
  block.reviewQuestions = [first, second].map((q) => ({
    ...q,
    reviewUnitId: reviewUnit.id,
  }));
  plan.nextFocus = { math: [key, reviewKey] };
  const answers = { [first.id]: first.answer };
  const times = { ...answerTimes, [first.id]: 1000, [second.id]: 1000 };
  assert.deepEqual(dailyFocus(plan, answers, times)!.math, [key, reviewKey]);
  answers[second.id] = second.answer;
  assert.deepEqual(dailyFocus(plan, answers, times)!.math, [key]);
});

test("new course plans prefer unseen matched questions across historical sessions", () => {
  const scopes = dailyScopes("math", settings);
  const geometry = scopes.find((s) => s.topic.slug === "math-geometry")!;
  const bank = getQuestions(geometry.topic.slug);
  const candidates = geometry.scope.practice.map((i) => bank[i].id);
  const unseen = candidates[candidates.length - 1];
  const plan = makeDailyPlan(
    "history",
    "2026-10-09",
    settings,
    0,
    { math: [geometry.id] },
    [],
    {},
    {
      testDate: "2026-10-17",
      coveredUnits: [],
      seenQuestions: candidates.filter((id) => id !== unseen),
    },
  );
  const math = plan.blocks.find((b) => b.subject === "math")!;
  assert.equal(blockUnits(math)[0].questions[0].id, unseen);
  assert.deepEqual(
    plan.previouslyAnsweredQuestions,
    candidates.filter((id) => id !== unseen),
  );
  assert(blockUnits(math)[0].practiceIds!.includes(unseen));
});

test("partial-session evidence requeues answered misses without inventing weaknesses for untouched scopes", () => {
  const { plan, unit } = fixture();
  const q = unit.questions[0];
  const focus = dailyFocus(plan, { [q.id]: q.answer }, {}, { [q.id]: true });
  assert(focus!.math!.includes(unit.courseId ?? unit.id));
  assert.deepEqual(focus!.english, []);
  assert.deepEqual(focus!.reading, []);
  assert.deepEqual(focus!.science, []);
  const wrong = dailyFocus(plan, { [q.id]: (q.answer + 1) % 4 });
  assert(wrong!.math!.includes(unit.courseId ?? unit.id));
});

test("a worked-example answer is practice, not fresh evidence of repair", () => {
  const { plan, unit, answerTimes } = fixture();
  const key = unit.courseId ?? unit.id;
  const [first, second] = unit.questions;
  unit.questions = [first, second];
  unit.lesson = {
    ...unit.lesson,
    sections: [
      {
        heading: "Worked example",
        body: ["Teach the method."],
        examples: [
          {
            text: `${first.questionText}\nSupported answer: ${first.choices[first.answer]}`,
            good: true,
            label: "Worked example",
          },
        ],
      },
    ],
  };
  plan.nextFocus = { math: [key] };
  const answers = { [first.id]: first.answer, [second.id]: second.answer };
  assert(dailyFocus(plan, answers, answerTimes)!.math!.includes(key));
  unit.lesson.sections[0].workedCases = unit.lesson.sections[0].examples;
  unit.lesson.sections[0].examples = [];
  assert(
    dailyFocus(plan, answers, answerTimes)!.math!.includes(key),
    "a demonstrated variant is not fresh evidence either",
  );
});

test("legacy feedback returns to its authored wave method rather than an unrelated trig skill", () => {
  const plan = makeDailyPlan(
    "legacy-wave",
    "2026-10-09",
    settings,
    0,
    { math: ["math:math-trigonometry:scope:2"] },
    [],
    {},
    { testDate: "2027-06-12", coveredUnits: [] },
  );
  const math = plan.blocks.find((b) => b.subject === "math")!;
  const unit = blockUnits(math)[0];
  assert.equal(unit.skillId, "math-trigonometry-wave-features");
  math.units = [unit];
  math.reviewQuestions = [];
  unit.questions = getQuestions(unit.topic).filter(
    (q) => q.skillId === unit.skillId,
  );
  const [first, second] = unit.questions;
  const answers = { [first.id]: first.answer };
  const times = { [first.id]: 1000, [second.id]: 1000 };
  assert.deepEqual(dailyFocus(plan, answers, times)!.math, [unit.courseId!]);
  answers[second.id] = second.answer;
  assert.deepEqual(dailyFocus(plan, answers, times)!.math, []);
});

test("repairing one primary skill cannot clear another method inside the same legacy scope", () => {
  const { plan, unit, answers, answerTimes } = fixture();
  assert.equal(unit.skillId, "math-algebra-linear-equations");
  plan.nextFocus = { math: ["math:math-algebra:scope:0"] };
  assert.deepEqual(dailyFocus(plan, answers, answerTimes)!.math, [
    "math:math-algebra:skill:math-algebra-linear-systems",
  ]);
});

test("a legacy whole-topic weakness becomes explicit skill reviews rather than clearing from one narrow success", () => {
  const { plan, unit, answers, answerTimes } = fixture();
  plan.nextFocus = { math: [unit.topic] };
  const remaining = dailyFocus(plan, answers, answerTimes)!.math!;
  assert(!remaining.includes(unit.courseId!));
  for (const skill of getLearningSkills(unit.topic).filter(
    (s) => s.id !== unit.skillId,
  ))
    assert(
      remaining.includes(`math:${unit.topic}:skill:${skill.id}`),
      skill.id,
    );
  assert.deepEqual(
    plan.nextFocus.math,
    [unit.topic],
    "Historical evidence is never mutated",
  );
});
