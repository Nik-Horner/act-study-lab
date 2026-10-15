import { test } from "node:test";
import assert from "node:assert/strict";
import reading from "../src/content/reading-practice.json";
import science from "../src/content/science-questions.json";
import readingQuestions from "../src/content/reading-questions.json";
import readingLessons from "../src/content/reading-lessons.json";
import catalog from "../src/content/reading-science-skills.json";
import proof from "../docs/reading-science-skill-alignment.json";
import { getLesson } from "../src/lib/act/content";
import { focusLesson, type LearningSkill } from "../src/lib/learning-skills";

const active = [
  ...reading,
  ...science.filter((q) => !q.id.startsWith("science-exam")),
];
const all = [...active, ...readingQuestions, ...science];
const byId = new Map(all.map((q) => [q.id, q]));
const answer = (id: string) => {
  const question = byId.get(id);
  assert(question, id);
  return question.choices[question.answer];
};

test("every active Reading and Science item belongs to one exact published method with independent depth", () => {
  assert.equal(reading.length, 292);
  assert.equal(active.length, 508);
  assert.equal(catalog.length, 76);
  const assigned = new Set<string>();
  for (const skill of catalog) {
    assert(skill.questionIds.length >= 2, skill.id);
    assert.equal(
      new Set(skill.questionIds).size,
      skill.questionIds.length,
      skill.id,
    );
    for (const id of skill.questionIds) {
      assert(!assigned.has(id), id);
      assigned.add(id);
      const question = byId.get(id)!;
      assert(question, id);
      assert.equal(question.topic, skill.topic, id);
      assert.equal(question.skillId, skill.id, id);
      assert.deepEqual(question.teachingSections, skill.sections, id);
      assert(!id.startsWith("RE-") && !id.startsWith("science-exam"), id);
    }
  }
  assert.deepEqual(assigned, new Set(active.map((q) => q.id)));
  for (const id of ["reading-details-paraphrase", "reading-craft-tone"])
    assert(catalog.find((skill) => skill.id === id)!.questionIds.length >= 3);
});

test("focused Science cards contain the actual method, selected worked evidence, and an independent formative task", () => {
  for (const skill of catalog.filter((skill) =>
    skill.topic.startsWith("science-"),
  )) {
    assert(
      skill.body?.length && skill.activity && skill.workedExamples?.length,
      skill.id,
    );
    const lesson = focusLesson(getLesson(skill.topic), {
      ...skill,
      subject: "science",
    } as LearningSkill);
    assert.deepEqual(
      lesson.sections.flatMap((section) => section.body),
      skill.body,
      skill.id,
    );
    assert(
      lesson.sections.every((section) => !section.evidence?.length),
      skill.id,
    );
    assert.equal(
      lesson.sections.filter((section) => section.activity).length,
      1,
      skill.id,
    );
    assert.deepEqual(
      lesson.sections.at(-1)!.activity,
      skill.activity,
      skill.id,
    );
    const examples = lesson.sections.flatMap(
      (section) => section.examples ?? [],
    );
    const firstContent = lesson.sections.find(
      (section) =>
        section.body.length || section.examples?.length || section.activity,
    );
    assert(
      firstContent?.body.length,
      `${skill.id}: teach before worked practice`,
    );
    assert.equal(examples.length, skill.workedExamples.length, skill.id);
    for (const example of examples) {
      assert(example.text.length > 70, skill.id);
      assert(!example.text.includes(skill.activity.prompt), skill.id);
    }
    for (const id of skill.questionIds)
      assert.notEqual(byId.get(id)!.questionText, skill.activity.prompt, id);
  }
});

test("all42 Reading method sections have distinct worked texts separate from the assessment passages", () => {
  const worked = readingLessons.flatMap((lesson) =>
    lesson.sections.flatMap((section) => section.examples),
  );
  assert.equal(worked.length, 42);
  assert.equal(
    new Set(worked.map((example) => example.text.split("\n\nQuestion:")[0]))
      .size,
    42,
  );
  assert(
    readingLessons.every((lesson) =>
      lesson.sections.every((section) => section.teachingRevision === 3),
    ),
  );
  assert.equal(new Set(reading.map((q) => q.passage.id)).size, 48);
  for (const item of proof.readingWorkedEvidence) {
    assert(item.task.trim().length > 20, item.id);
    assert(item.solution.includes("Reason:"), item.id);
    assert(
      !reading.some((question) => question.passage.context === item.passage),
      item.id,
    );
  }
});

test("all152 held-out items target real active methods without entering their practice banks", () => {
  const heldOut = [
    ...readingQuestions.filter((question) => question.id.startsWith("RE-")),
    ...science.filter((question) => question.id.startsWith("science-exam")),
  ];
  assert.equal(heldOut.length, 152);
  const ids = new Set(catalog.flatMap((skill) => skill.questionIds));
  for (const question of heldOut) {
    const skill = catalog.find((skill) => skill.id === question.skillId);
    assert(skill, question.id);
    assert.deepEqual(question.teachingSections, skill.sections, question.id);
    assert(!ids.has(question.id), question.id);
  }
  assert.equal(
    byId.get("science-exam-1-37")!.skillId,
    "science-data-reading-normalize",
  );
  assert.equal(
    byId.get("science-exam-2-33")!.skillId,
    "science-data-reading-changes",
  );
});

test("all643 previously published choice sets retain their grading meaning", () => {
  assert.equal(proof.preservedContracts.length, 643);
  for (const previous of proof.preservedContracts) {
    const current = byId.get(previous.id);
    assert(current, previous.id);
    assert.equal(current.answer, previous.answer, previous.id);
    assert.equal(
      current.choices[current.answer],
      previous.answerText,
      previous.id,
    );
  }
});

test("new scientific transfer keys follow the actual supplied numbers and conditions", () => {
  const wave = byId.get("science-waves-transfer-v3-01")!;
  const [frequency, wavelength] = wave.passage.table!.rows[0] as number[];
  assert.equal(answer(wave.id), `${(frequency * wavelength) / 10} m`);
  const rows = byId.get("science-group-response-v3-33")!.passage.table!.rows;
  const total = rows.reduce((sum, row) => sum + Number(row[1]), 0);
  const mode = rows.reduce((a, b) => (Number(a[1]) > Number(b[1]) ? a : b));
  assert.equal(mode[0], "East");
  assert(Number(mode[1]) < total / 2);
  assert.match(
    answer("science-group-response-v3-33"),
    /most common.*fewer than half/,
  );
  const sample = byId.get("science-data-calibration-v3-34")!.passage.table!
    .rows[0];
  const originalConcentration = (2 * Number(sample[1]) - 1) * Number(sample[2]);
  const newFlow = Number(sample[3]) / 2;
  assert.equal((originalConcentration * newFlow) / (10 * 5), 3 / 5);
  assert.equal(answer("science-data-calibration-v3-34"), "3/5");
  const fossils = byId.get("science-proportion-viewpoints-v3-34")!.passage
    .table!.rows;
  assert.equal(Number(fossils[0][2]) / Number(fossils[0][1]), 0.2);
  assert.equal(Number(fossils[1][2]) / Number(fossils[1][1]), 0.15);
  assert.match(
    answer("science-proportion-viewpoints-v3-34"),
    /N has20%|N has 20%/,
  );
  assert.equal((12 * 22) / (2 + 22), 11);
  assert.match(answer("science-saturation-transfer-v3-35"), /q = 13/);
  const particles = byId.get("science-atomic-transfer-v3-38")!.passage.table!
    .rows;
  assert.equal(particles[0][1], particles[1][1]);
  assert.notEqual(particles[0][2], particles[1][2]);
  assert.equal(Number(particles[2][1]) - Number(particles[2][3]), 2);
  assert.match(answer("science-atomic-transfer-v3-38"), /isotopes.*2\+ ion/);
  assert.equal(
    answer("science-rock-order-transfer-v3-37"),
    "R, S, intrusion I",
  );
  assert.equal(
    answer("science-water-process-transfer-v3-38"),
    "Evaporation, condensation, erosion",
  );
  assert.equal(1.5 ** 2 / 3, 3 / 4);
  assert.equal(answer("science-factor-transfer-v3-36"), "3/4");
  const reciprocal = catalog.find(
    (skill) => skill.id === "science-models-evidence-reciprocal",
  )!;
  assert.equal(reciprocal.questionIds.length, 5);
  assert.equal(
    reciprocal.activity!.choices[reciprocal.activity!.answer],
    `${(8 * 24) / (24 - 8)} cm`,
  );
});
