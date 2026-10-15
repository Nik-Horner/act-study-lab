import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyFocus, blockUnits } from "../src/lib/daily-flow";
import { dailyScopes, makeDailyPlan } from "../src/lib/daily-plan";
import { getQuestions } from "../src/lib/act/content";
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
    .slice(0, 12)
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
test("a single miss in twelve questions stays in review for a 36 goal", () => {
  const { plan, unit, answers } = fixture();
  assert.equal(unit.questions.length, 12);
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
test("review answers only clear the scope they assess", () => {
  const { plan, block, unit, answerTimes } = fixture();
  const key = unit.courseId ?? unit.id;
  const reviewUnit = {
    ...unit,
    id: `${unit.id}:review`,
    courseId: `${key}:review`,
    questions: [],
  };
  const [first, second] = unit.questions;
  unit.questions = [];
  block.reviewUnits = [reviewUnit];
  block.reviewQuestions = [first, second].map((question) => ({
    ...question,
    reviewUnitId: reviewUnit.id,
  }));
  plan.nextFocus = { math: [key, reviewUnit.courseId] };
  const answers = { [first.id]: first.answer };
  assert.deepEqual(dailyFocus(plan, answers, answerTimes)!.math, [
    key,
    reviewUnit.courseId,
  ]);
  answers[second.id] = second.answer;
  assert.deepEqual(dailyFocus(plan, answers, answerTimes)!.math, [key]);
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
    undefined,
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
});
