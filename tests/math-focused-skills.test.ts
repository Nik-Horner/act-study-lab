import { createHash } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import skills from "../src/content/math-skill-lessons.json";
import questionSkills from "../src/content/math-question-skills.json";
import additions from "../src/content/math-skill-questions.json";
import main from "../src/content/math-questions.json";
import extra from "../src/content/math-extra-questions.json";
import methods from "../src/content/math-method-questions.json";
import proofs from "../docs/math-skill-solution-proofs.json";
import { renderMathText } from "../src/lib/math-text";
import {
  dailyScopes,
  makeDailyPlan,
  estimateDailyBlock,
} from "../src/lib/daily-plan";
import { blockUnits } from "../src/lib/daily-flow";

const map: Record<string, string[]> = questionSkills;
const bank = [...main, ...extra, ...methods, ...additions];
const active = bank.filter((q) => !q.id.includes("-exam-"));
const byId = new Map(skills.map((skill) => [skill.id, skill]));
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const close = (actual: unknown, expected: unknown): boolean =>
  Array.isArray(expected)
    ? Array.isArray(actual) &&
      actual.length === expected.length &&
      actual.every((value, i) => close(value, expected[i]))
    : typeof expected === "number"
      ? typeof actual === "number" &&
        Number.isFinite(actual) &&
        Math.abs(actual - expected) < 1e-8 * Math.max(1, Math.abs(expected))
      : actual === expected;

test("every active Math item has an explicit owned primary skill and exact independent practice pool", () => {
  assert.equal(skills.length, 143);
  assert.equal(byId.size, skills.length);
  assert.equal(additions.length, 80);
  assert.equal(active.length, 384);
  assert.equal(bank.length, 474);
  assert.equal(Object.keys(map).length, bank.length);
  const assigned = skills.flatMap((skill) => skill.questionIds);
  assert.equal(new Set(assigned).size, active.length);
  assert.equal(assigned.length, active.length);
  for (const q of bank) {
    assert(map[q.id]?.length, q.id);
    assert.equal(new Set(map[q.id]).size, map[q.id].length, q.id);
    for (const id of map[q.id]) assert(byId.has(id), `${q.id}: ${id}`);
    if (!q.id.includes("-exam-")) {
      const primary = byId.get(map[q.id][0])!;
      assert.equal(primary.topic, q.topic, q.id);
      assert(primary.questionIds.includes(q.id), q.id);
    }
  }
  for (const skill of skills) {
    assert(
      skill.questionIds.length >= 2,
      `${skill.id}: never a one-answer memorization pool`,
    );
    for (const id of skill.questionIds) assert.equal(map[id][0], skill.id, id);
    assert.equal(skill.section.teachingRevision, 3);
    assert(skill.section.body.length);
    assert(skill.section.examples.length);
    assert.equal(skill.section.activity.choices.length, 3);
    assert.equal(new Set(skill.section.activity.choices).size, 3);
  }
});

test("specific methods and known held-out gaps cannot fall back to an overview", () => {
  const expected: Record<string, string> = {
    "math-geometry-d3": "math-geometry-heron-area",
    "math-geometry-d6": "math-geometry-perpendicular-distance",
    "math-geometry-d27": "math-geometry-angle-bisector",
    "math-geometry-m6": "math-geometry-triangle-circle-radii",
    "math-algebra-d13": "math-algebra-polynomial-remainders",
    "math-algebra-d29": "math-algebra-rational-equations",
    "math-functions-m1": "math-functions-quadratic-vertex",
    "math-functions-m6": "math-functions-recursive-inputs",
    "math-statistics-probability-d23":
      "math-statistics-probability-interquartile-range",
    "math-statistics-probability-d26":
      "math-statistics-probability-first-success",
    "math-number-quantity-m5": "math-number-quantity-matrix-powers",
    "math-number-quantity-m6": "math-number-quantity-perfect-square-parity",
    "math-modeling-d10": "math-modeling-ground-contact",
    "math-modeling-m5": "math-modeling-resource-optima",
    "math-exam-2-q35": "math-geometry-centroid-medians",
    "math-exam-2-q42": "math-functions-horizontal-asymptotes",
    "math-exam-2-q43": "math-number-quantity-matrix-systems",
    "math-exam-1-q31": "math-number-quantity-powers-of-i",
  };
  for (const [question, skill] of Object.entries(expected))
    assert.equal(map[question][0], skill, question);
  assert(
    map["math-essential-skills-m6"].includes(
      "math-essential-skills-percent-factors",
    ),
  );
  assert(
    map["math-essential-skills-m6"].includes(
      "math-modeling-whole-number-thresholds",
    ),
  );
  const integrated = main.find((q) => q.id === "math-essential-skills-d22")!;
  assert.equal(integrated.answer, 3);
  assert.equal(integrated.choices[3], "7.5");
  assert(close((5 * 60 * 12) / 480, 7.5));
});

test("all new activities and drills match reviewed source and executable derivations", () => {
  assert.equal(proofs.skills.length, skills.length);
  assert.equal(proofs.questions.length, additions.length);
  for (const record of proofs.skills) {
    const skill = byId.get(record.skillId)!;
    assert.equal(hash(skill), record.sourceSha256, record.skillId);
    assert.equal(
      skill.section.activity.answer,
      record.activityAnswerIndex,
      record.skillId,
    );
    assert.equal(
      skill.section.activity.choices[skill.section.activity.answer],
      record.activityAnswer,
      record.skillId,
    );
    if (record.proofType !== "conceptual") {
      const result = Function(`return (${record.calculation})`)();
      assert(close(result, record.expected), record.skillId);
    }
  }
  for (const record of proofs.questions) {
    const q = additions.find((q) => q.id === record.questionId)!;
    assert.equal(hash(q), record.sourceSha256, q.id);
    assert.equal(q.answer, record.answerIndex, q.id);
    assert.equal(q.choices[q.answer], record.correctChoice, q.id);
    if (record.proofType !== "conceptual") {
      const result = Function(`return (${record.calculation})`)();
      assert(close(result, record.expected), q.id);
    }
  }
});

test("teaching and fresh practice render without corrupt words, bad math, or answer-position shortcuts", () => {
  const check = (value: unknown) => {
    if (typeof value === "string") {
      assert.doesNotMatch(
        value,
        /\b(?:[fF] or|n or|D isjoint|R andom|fvaries|yas|ofx|mandnwith|vertexAto|nindependent|ksuccesses|bothzero|nonzeroa|aandb|heighthhas)\b/,
      );
      assert.doesNotMatch(renderMathText(value), /katex-error/);
    } else if (Array.isArray(value)) value.forEach(check);
    else if (value && typeof value === "object")
      Object.values(value).forEach(check);
  };
  check(skills);
  check(additions);
  const positions = [0, 1, 2, 3].map(
    (position) => additions.filter((q) => q.answer === position).length,
  );
  assert(
    positions.every((count) => count >= 10 && count <= 30),
    JSON.stringify(positions),
  );
  const activityPositions = [0, 1, 2].map(
    (position) =>
      skills.filter((s) => s.section.activity.answer === position).length,
  );
  assert(
    activityPositions.every((count) => count >= 25 && count <= 70),
    JSON.stringify(activityPositions),
  );
});

test("Daily renders every exact Math method before its own matched practice", () => {
  const settings = {
    minutesPerDay: 60,
    includeScience: false,
    mathFocus: "all" as const,
    scores: { english: 34, math: 34, reading: 34, science: 34 },
  };
  const scopes = dailyScopes("math", settings);
  assert.equal(scopes.length, skills.length);
  scopes.forEach((scope, index) => {
    const plan = makeDailyPlan(
      "math-method-regression",
      "2026-10-15",
      settings,
      0,
      undefined,
      [],
      { math: index },
    );
    const block = plan.blocks.find((item) => item.subject === "math")!;
    const unit = blockUnits(block)[0];
    const card = byId.get(scope.scope.skillId!)!;
    assert.equal(unit.skillId, card.id);
    assert.equal(unit.lesson.sections.length, 1, card.id);
    assert.deepEqual(unit.lesson.sections[0].body, card.section.body, card.id);
    assert.deepEqual(
      unit.lesson.sections[0].examples,
      card.section.examples,
      card.id,
    );
    assert.deepEqual(
      unit.lesson.sections[0].activity,
      card.section.activity,
      card.id,
    );
    assert(unit.questions.length > 0, card.id);
    for (const question of unit.questions)
      assert.equal(map[question.id][0], card.id, question.id);
    assert(
      plan.blocks.reduce(
        (sum, item) => sum + Math.ceil(estimateDailyBlock(item)),
        0,
      ) <= settings.minutesPerDay,
      card.id,
    );
  });
});
