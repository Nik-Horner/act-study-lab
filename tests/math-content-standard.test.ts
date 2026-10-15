import { createHash } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import review from "../docs/math-content-review.json";
import original from "../src/content/math-questions.json";
import supplemental from "../src/content/math-extra-questions.json";
import methods from "../src/content/math-method-questions.json";
import baseLessons from "../src/content/math-lessons.json";
import replacements from "../src/content/math-extra-lessons.json";
import reference from "../src/content/math-reference.json";
import activities from "../src/content/lesson-activities.json";
import { MathDiagram } from "../src/components/act/MathDiagram";

const lessons = new Map(
  [...baseLessons, ...replacements].map((lesson) => [lesson.slug, lesson]),
);
const questions = [
  ...original,
  ...supplemental,
  ...methods,
  ...[...lessons.values()].flatMap((lesson) => lesson.check),
];
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

test("every active Math item has a current per-item solution review", () => {
  assert.equal(questions.length, 418);
  const records = new Map(review.items.map((item) => [item.id, item]));
  assert.equal(records.size, questions.length);
  for (const question of questions) {
    const record = records.get(question.id);
    assert(record, question.id);
    assert.equal(record.answerIndex, question.answer, question.id);
    assert.equal(record.key, question.choices[question.answer], question.id);
    assert.equal(
      record.sourceSha256,
      hash(question),
      `${question.id}: content changed since its mathematical review`,
    );
    assert(record.solution.trim(), question.id);
  }
  assert.equal(review.counts.heldOutExamQuestions, 90);
});

test("all active Math teaching and formula methods match the reviewed versions", () => {
  assert.equal(review.sections.length, 56);
  for (const record of review.sections) {
    const section = lessons.get(record.topic)?.sections[record.sectionIndex];
    assert(section, record.topic);
    assert.equal(
      hash(section),
      record.sourceSha256,
      `${record.topic}:${record.sectionIndex}`,
    );
  }
  const referenceItems = new Map(
    reference.flatMap((group) =>
      group.items.map((item) => [`${group.topic}:${item.id}`, item] as const),
    ),
  );
  assert.equal(referenceItems.size, 75);
  assert.equal(review.reference.length, referenceItems.size);
  for (const record of review.reference)
    assert.equal(
      hash(referenceItems.get(`${record.topic}:${record.id}`)),
      record.sourceSha256,
      record.id,
    );
});

test("routine recall cannot count as hard mastery and each topic has true transfer practice", () => {
  const bank = new Map(questions.map((q) => [q.id, q]));
  for (const id of [
    "math-essential-skills-d3",
    "math-geometry-d5",
    "math-trigonometry-d4",
    "math-number-quantity-d22",
    "math-statistics-probability-d8",
  ])
    assert.notEqual(bank.get(id)!.difficulty, "hard", id);
  for (const topic of lessons.keys()) {
    for (const index of [5, 6])
      assert.equal(bank.get(`${topic}-m${index}`)?.difficulty, "hard");
    assert(
      questions.filter(
        (q) =>
          q.topic === topic &&
          !q.id.includes("-exam-") &&
          q.difficulty === "hard",
      ).length >= 3,
      `${topic}: challenging independent methods must exist across the combined bank`,
    );
  }
});

test("sine-law distractors are four distinct values, including equivalent radical notation", () => {
  for (const [id, choiceValues] of [
    ["math-exam-1-q36", [4 * Math.SQRT2, 16 * Math.SQRT2, 16, 8 * Math.SQRT2]],
    [
      "math-trigonometry-d18",
      [10 * Math.SQRT2, 5 * Math.SQRT2, 20, 20 * Math.SQRT2],
    ],
  ] as const) {
    assert.equal(new Set(choiceValues).size, 4, id);
    const q = questions.find((q) => q.id === id)!;
    assert(
      !q.choices.some(
        (choice) =>
          choice.includes("frac{8}{\\sqrt{2}}") ||
          choice.includes("frac{10}{\\sqrt{2}}"),
      ),
      id,
    );
  }
});

test("Math formative activities have current solution reviews and usable diagrams", () => {
  assert.equal(review.activities.length, 56);
  for (const record of review.activities) {
    const activity =
      activities[record.topic as keyof typeof activities][record.sectionIndex];
    assert.equal(
      hash(activity),
      record.sourceSha256,
      `${record.topic}:${record.sectionIndex}`,
    );
    assert.equal(activity.choices.length, 3);
    assert.equal(new Set(activity.choices).size, 3);
    assert.equal(activity.answer, record.answerIndex);
    assert.equal(activity.choices[activity.answer], record.key);
    if ("diagram" in activity && typeof activity.diagram === "string")
      assert(MathDiagram({ id: activity.diagram }), activity.diagram);
  }
  assert.equal(((6 + 18) * 4) / 2, 48);
  assert.equal(16 * 1.5 ** 3, 54);
  assert.equal(2 * 4 ** 2 + 2 * 4 * 7, 88);
  assert.equal(Math.hypot(12, 9), 15);
  assert.equal((3 * 0.12 + 2 * 0.27) / 5, 0.18);
  let best = 0;
  for (let x = 0; x <= 11; x++)
    for (let y = 0; y <= 11; y++)
      if (2 * x + y <= 11 && x + 2 * y <= 11)
        best = Math.max(best, 3 * x + 2 * y);
  assert.equal(best, 18);
});
