import { test } from "node:test";
import assert from "node:assert/strict";
import lessons from "../src/content/science-lessons.json";
import teaching from "../src/content/science-teaching-passages.json";
import questions from "../src/content/science-questions.json";
import historicalChecks from "../src/content/science-legacy-checks.json";
import activities from "../src/content/lesson-activities.json";
import { getLesson, getQuestion, getQuestions } from "../src/lib/act/content";
import { DAILY_CURRICULUM } from "../src/lib/daily-curriculum";
import type { Question } from "../src/lib/act/types";

const checks = lessons.flatMap((lesson) => lesson.check);
const byId = new Map(
  [...questions, ...checks].map((question) => [
    question.id,
    question as Question,
  ]),
);
function answer(id: string) {
  const question = byId.get(id);
  assert(question, id);
  return question.choices[question.answer];
}
const checkId = (topic: string, number: number) =>
  `check-science-transfer-v2-${topic}-${number}`;

test("science teaching, independent checks, and drills use different evidence and tasks", () => {
  const drillIds = new Set(questions.map((question) => question.passage.id));
  const teachingIds = new Set(teaching.map((passage) => passage.id));
  assert.equal(teachingIds.size, 43);
  const checkPassages = new Set(checks.map((question) => question.passage.id));
  assert.equal(checkPassages.size, 18);
  for (const id of teachingIds)
    assert(!drillIds.has(id) && !checkPassages.has(id), id);
  for (const id of checkPassages) assert(!drillIds.has(id), id);
  for (const lesson of lessons) {
    const resolved = getLesson(lesson.slug);
    const predictions = activities[lesson.slug as keyof typeof activities];
    assert.equal(predictions.length, lesson.sections.length);
    for (const [index, section] of resolved.sections.entries()) {
      assert(
        section.examples?.length && section.evidence?.length,
        `${lesson.slug}:${index}`,
      );
      assert(section.body.join(" ").split(/\s+/).length <= 100);
      for (const passage of section.evidence)
        assert(teachingIds.has(passage.id));
      assert(
        !questions.some(
          (question) => question.questionText === predictions[index].prompt,
        ),
      );
    }
  }
});

test("old science answer IDs remain readable after new independent checks replace teaching-exposed ones", () => {
  for (const old of historicalChecks) {
    assert.deepEqual(getQuestion(old.id), old);
    assert(!checks.some((current) => current.id === old.id));
  }
});

test("every advanced transfer item has its method in its actual daily scope", () => {
  const required = [
    "IOD 701",
    "IOD 702",
    "SIN 701",
    "SIN 702",
    "SIN 703",
    "EMI 701",
    "EMI 702",
  ];
  const covered = new Set<string>();
  const additions = questions.filter((question) => "standards" in question);
  assert.equal(additions.length, 11);
  for (const question of additions) {
    assert("standards" in question && question.standards);
    assert("teachingSections" in question && question.teachingSections);
    for (const standard of question.standards) covered.add(standard);
    const index = getQuestions(question.topic).findIndex(
      (item) => item.id === question.id,
    );
    const scopes = DAILY_CURRICULUM[question.topic].filter((scope) =>
      scope.practice.includes(index),
    );
    assert(
      scopes.some((scope) =>
        question.teachingSections!.every((section) =>
          scope.sections.includes(section),
        ),
      ),
      question.id,
    );
  }
  for (const standard of required) assert(covered.has(standard), standard);
});

test("science independent quantitative check keys follow their own evidence", () => {
  assert.equal(
    answer(checkId("data-reading", 2)),
    `${75 - 50} percentage points`,
  );
  assert.equal(answer(checkId("data-reading", 3)), `${(24 / 4) * 3} mg/L`);
  assert.equal(
    answer(checkId("trends-interpolation", 1)),
    `${18 + ((8 - 6) / (12 - 6)) * (30 - 18)} units`,
  );
  assert.equal(
    answer(checkId("trends-interpolation", 3)),
    `${Math.sqrt(16 * 9)} mm`,
  );
  assert.equal(
    answer(checkId("experimental-design", 3)),
    `Its effect is ${15 - 7 - (9 - 6)} units greater at the higher temperature`,
  );
  assert.equal(
    answer(checkId("models-evidence", 1)),
    `${(82 - 12) / 2 + 12} counts/min`,
  );
  assert.equal(
    answer(checkId("scientific-foundations", 1)),
    `It is ${10 ** (5 - 3)} times greater`,
  );
  assert.equal(
    answer(checkId("scientific-foundations", 3)),
    `${7 + 3} mg/L per h`,
  );
});

test("two-presentation transfer combines calibration, dilution, flow, and a new condition", () => {
  const question = byId.get("science-data-reading-transfer-v2-33")!;
  assert(question.passage?.table && question.passage.graph);
  const rows = question.passage.table!.rows;
  assert("graph" in question.passage && question.passage.graph);
  const graph = question.passage.graph;
  const concentrations = rows.map((row) => {
    const curve = graph.series.find((series) => series.label === row[1])!;
    return (
      curve.points.find((point) => point[1] === row[2])![0] * Number(row[3])
    );
  });
  assert.equal(
    (concentrations[0] * Number(rows[0][4])) / 2,
    concentrations[1] * Number(rows[1][4]),
  );
  assert.equal(answer(question.id), "They are equal");
});

test("experimental transfer distinguishes bias, context-dependent effects, and a solvent control", () => {
  const calibration = byId.get("science-experimental-design-transfer-v2-33")!;
  assert(calibration.passage?.table);
  const readings = calibration.passage.table!.rows.map((row) => Number(row[1]));
  assert(Math.max(...readings) - Math.min(...readings) < 0.03);
  assert(readings.every((value) => value - 8 > 0.38));
  assert.match(answer(calibration.id), /Calibrate/);
  assert.equal(
    answer("science-experimental-design-transfer-v2-34"),
    `${31 - 12} mg/day, combining the two changes`,
  );
  assert.match(
    answer("science-experimental-design-transfer-v2-35"),
    /S alone at the same concentration/,
  );
});

test("joint-model transfer checks all conditions before accepting or challenging a model", () => {
  const question = byId.get("science-models-evidence-transfer-v2-33")!;
  assert(question.passage?.table && question.passage.graph);
  assert("graph" in question.passage && question.passage.graph);
  assert(
    question.passage.graph.series.every((series) =>
      series.points.every((point) => point[1] === 10),
    ),
  );
  const [sufficient, low] = question.passage.table!.rows;
  assert(Number(sufficient[2]) > Number(sufficient[1]));
  assert.equal(low[2], low[1]);
  assert.match(answer(question.id), /contradict R while fitting S/);
  assert.match(
    answer("science-models-evidence-transfer-v2-34"),
    /Challenge S.*without removing the original contradiction to R/,
  );
});

test("foundations teach and assess Earth/space, matter identity, and respiration explicitly", () => {
  const lesson = lessons.find(
    (item) => item.slug === "science-scientific-foundations",
  )!;
  assert.equal(lesson.sections.length, 8);
  assert.match(
    lesson.sections[7].body.join(" "),
    /rotation.*day-night.*revolution.*year/,
  );
  assert.match(lesson.sections[7].body.join(" "), /axial tilt/i);
  assert.match(
    lesson.sections[7].body.join(" "),
    /lower layers are older.*cutting a rock formed later/,
  );
  assert.match(
    lesson.sections[1].body.join(" "),
    /Protons.*isotopes.*neutron.*electrons.*ions/,
  );
  assert.match(
    lesson.sections[3].body.join(" "),
    /Chloroplasts.*photosynthesis.*plants also respire/,
  );
  assert.match(
    answer("science-scientific-foundations-transfer-v2-33"),
    /Axial tilt/,
  );
  assert.equal(
    answer("science-scientific-foundations-transfer-v2-34"),
    "A, fault movement, B deposition",
  );
  assert.equal(
    answer("science-scientific-foundations-transfer-v2-35"),
    "Erosion, evaporation, condensation",
  );
  assert.match(
    answer("science-scientific-foundations-transfer-v2-36"),
    /isotopes.*negative ion/,
  );
  assert.match(
    answer("science-scientific-foundations-transfer-v2-37"),
    /Respiration can consume oxygen/,
  );
});
