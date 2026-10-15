import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PassageView } from "../src/components/act/QuestionView";
import { focusLesson, type LearningSkill } from "../src/lib/learning-skills";
import type { Lesson, Passage, Question } from "../src/lib/act/types";
import { practiceStage } from "../src/lib/act/practice-queue";
import { createDefaultState } from "../src/lib/act/progress-model";
import { makeDailyPlan, estimateDailyBlock } from "../src/lib/daily-plan";
import { blockUnits, dailyFocus } from "../src/lib/daily-flow";

const evidence: Passage = {
  id: "worked-graph",
  title: "Starlight",
  context: "The same star was measured each hour.",
  graph: {
    title: "Brightness",
    xLabel: "Time (hours)",
    yLabel: "Brightness (%)",
    yRange: [94, 100],
    series: [
      {
        label: "Star",
        points: [
          [0, 100],
          [1, 98],
          [2, 95],
        ],
      },
    ],
  },
};

test("a focused skill shows its matching evidence and leaves the original lesson intact", () => {
  const full: Lesson = {
    slug: "science-data",
    title: "Data",
    intro: "",
    check: [],
    sections: [
      {
        heading: "Background",
        body: ["Read the labels."],
        evidence: [{ ...evidence, id: "unrelated" }],
      },
      {
        heading: "Compare",
        body: ["Compare at the same time."],
        examples: [
          { text: "100 minus 95 is 5.", label: "Worked example", good: true },
        ],
      },
    ],
  };
  const before = structuredClone(full);
  const skill: LearningSkill = {
    id: "compare",
    topic: full.slug,
    subject: "science",
    title: "Compare",
    reportingCategory: "Data",
    sections: [0, 1],
    questionIds: [],
    body: ["Find 2 hours. Read up to the line."],
    evidence: [evidence],
    workedExamples: [{ section: 1, example: 0 }],
  };
  const focused = focusLesson(full, skill);
  assert.deepEqual(focused.sections[1].evidence, [evidence]);
  assert.equal(focused.sections[0].evidence, undefined);
  assert.deepEqual(full, before);
});

test("a close-range graph shows its actual range, axes, and exact values", () => {
  const html = renderToStaticMarkup(
    createElement(PassageView, { passage: evidence }),
  );
  assert.match(html, /vertical axis starts at 94/);
  assert.match(html, /Brightness \(%\)/);
  assert.match(html, /Time \(hours\)/);
  assert.match(html, /\(2, 95\)/);
  assert.match(html, />95<\/text>/);
  assert.match(html, />98<\/text>/);
  assert.match(html, />1<\/text>/);
  const circles = [...html.matchAll(/<circle[^>]*cy="([\d.]+)"/g)].map((m) =>
    Number(m[1]),
  );
  assert.equal(circles.length, 3);
  assert(
    Math.max(...circles) - Math.min(...circles) > 150,
    "the five-point difference must be visible",
  );
});

test("accurate Reading on new passages is not demoted for taking 90 seconds", () => {
  const questions: Question[] = Array.from({ length: 6 }, (_, i) => ({
    id: `reading-${i}`,
    subject: "reading",
    topic: "reading-details",
    category: "Details",
    difficulty: "hard",
    stem: "",
    questionText: "What does the passage support?",
    choices: ["Proof", "Guess"],
    answer: 0,
    explanation: "The text supplies proof.",
  }));
  const state = createDefaultState();
  state.profile.readingBaseline = 33;
  state.profile.targetScore = 36;
  state.answers = questions.map((q, i) => ({
    id: `answer-${i}`,
    questionId: q.id,
    chosen: 0,
    elapsedMs: 90000,
    confidence: "high",
    cause: null,
    mode: "drill",
    at: `2026-10-15T12:00:0${i}Z`,
  }));
  assert.equal(practiceStage(questions, state, "reading"), "Challenge");
  state.answers = state.answers.map((answer) => ({ ...answer, chosen: 1 }));
  assert.equal(practiceStage(questions, state, "reading"), "Foundations");
});

test("Daily Reading review follows mistakes and uncertainty, not passage reading time", () => {
  const plan = makeDailyPlan(
    "reading-pacing",
    "2026-10-15",
    {
      scores: { english: 34, math: 34, reading: 33, science: null },
      minutesPerDay: 90,
    },
    0,
  );
  const block = plan.blocks.find((b) => b.subject === "reading")!;
  const unit = blockUnits(block)[0];
  const q = unit.questions[0];
  assert(q);
  const answers = { [q.id]: q.answer };
  const times = { [q.id]: 180000 };
  assert.deepEqual(dailyFocus(plan, answers, times)!.reading, []);
  assert(
    dailyFocus(plan, answers, times, { [q.id]: true })!.reading!.length > 0,
  );
  assert(
    dailyFocus(plan, { [q.id]: (q.answer + 1) % q.choices.length }, times)!
      .reading!.length > 0,
  );
});

test("Daily time estimates include visible worked evidence", () => {
  const plan = makeDailyPlan(
    "evidence-budget",
    "2026-10-15",
    {
      scores: { english: 34, math: 34, reading: 33, science: null },
      minutesPerDay: 90,
    },
    0,
  );
  const block = plan.blocks.find((b) => b.subject === "science")!;
  const section = blockUnits(block)[0].lesson.sections.at(-1)!;
  section.evidence = [];
  const without = estimateDailyBlock(block);
  section.evidence = [
    { ...evidence, context: Array(180).fill("word").join(" ") },
  ];
  assert(estimateDailyBlock(block) >= without + 1.24);
});
