import { test } from "node:test";
import assert from "node:assert/strict";
import practice from "../src/content/reading-practice.json";
import legacy from "../src/content/reading-questions.json";
import lessons from "../src/content/reading-lessons.json";
import activities from "../src/content/lesson-activities.json";
import exams from "../src/content/reading-exams.json";
import {
  getAllQuestions,
  getExamQuestions,
  getLesson,
  getPracticeReplacement,
  getQuestion,
  getQuestions,
} from "../src/lib/act/content";
import { DAILY_CURRICULUM } from "../src/lib/daily-curriculum";
import { dailyScopes } from "../src/lib/daily-plan";

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const examIds = new Set(exams.flatMap((exam) => exam.questionIds));
const oldPractice = legacy.filter((q) => !examIds.has(q.id));
const instruction = lessons
  .flatMap((lesson) => [
    JSON.stringify(getLesson(lesson.slug).sections),
    JSON.stringify(lesson.check),
    JSON.stringify(activities[lesson.slug as keyof typeof activities]),
  ])
  .map(normalize)
  .join(" ");

test("Reading assessment uses original passages with no teaching, check, or exam exposure", () => {
  const passages = new Map(practice.map((q) => [q.passage.id, q.passage]));
  assert.equal(passages.size, 48);
  const extendedPassages = new Set([
    "reading-practice-v3-p13",
    "reading-practice-v3-p15",
    "reading-practice-v3-p21",
    "reading-practice-v3-p22",
  ]);
  const otherPassages = new Set(
    legacy.map((q) => normalize(q.passage.context)),
  );
  for (const [id, passage] of passages) {
    assert(
      !otherPassages.has(normalize(passage.context)),
      `${id}: reused text`,
    );
    const words = normalize(passage.context).split(" ");
    assert(words.length >= 180, `${id}: needs sufficient evidence and context`);
    for (let i = 0; i <= words.length - 18; i++) {
      const excerpt = words.slice(i, i + 18).join(" ");
      assert(
        !instruction.includes(excerpt),
        `${id}: teaching exposes this text`,
      );
    }
    const unit = practice.filter((q) => q.passage.id === id);
    assert.equal(unit.length, extendedPassages.has(id) ? 7 : 6);
    assert.equal(new Set(unit.map((q) => q.topic)).size, 6);
    assert.equal(new Set(unit.map((q) => normalize(q.questionText))).size, unit.length);
    for (const q of unit) {
      assert.equal(q.passage.context, passage.context);
      assert.equal(new Set(q.choices.map(normalize)).size, 4);
      assert(q.explanation.length > 100);
      assert.doesNotMatch(
        q.explanation,
        /Reject choices that change the stated facts/,
      );
    }
  }
  const teachingTasks = lessons.flatMap((lesson) =>
    lesson.sections.flatMap((section) => section.examples ?? []),
  );
  for (const q of practice) {
    assert(
      !teachingTasks.some(
        (example) =>
          normalize(example.text).includes(normalize(q.questionText)) &&
          normalize(example.text).includes(normalize(q.choices[q.answer])),
      ),
      `${q.id}: exact worked task reused as an assessment`,
    );
  }
});

test("daily and standalone Reading use the same independent pool with every difficulty available", () => {
  for (const lesson of lessons) {
    const expected = practice.filter((q) => q.topic === lesson.slug);
    const active = getQuestions(lesson.slug);
    assert.equal(active.length, ["reading-details", "reading-craft"].includes(lesson.slug) ? 50 : 48);
    assert.deepEqual(
      active.map((q) => q.id),
      expected.map((q) => q.id),
    );
    for (const difficulty of ["easy", "medium", "hard"]) {
      assert.equal(
        active.filter((q) => q.difficulty === difficulty).length,
        (lesson.slug === "reading-details" && difficulty === "medium") ||
          (lesson.slug === "reading-craft" && difficulty === "hard") ? 18 : 16,
      );
    }
    const focused = dailyScopes("reading").filter((scope) => scope.topic.slug === lesson.slug);
    assert.equal(focused.length, 4, "each topic has four distinct taught skills");
    assert.deepEqual(
      [...new Set(focused.flatMap(({ scope }) => scope.practice))].sort((a, b) => a - b),
      Array.from({ length: active.length }, (_, i) => i),
      "Daily skills must include the full independent assessment pool",
    );
    for (const { scope } of focused) {
      assert(scope.practice.length >= 2, "each method needs fresh transfer choices");
      for (const index of scope.practice) {
        assert.equal(active[index].skillId, scope.skillId);
        assert(active[index].teachingSections?.every((i) => scope.sections.includes(i)));
      }
    }
    // These published positions remain the migration reference for older plans.
    const scopes = DAILY_CURRICULUM[lesson.slug];
    assert.deepEqual(
      [...new Set(scopes.flatMap((scope) => scope.practice))].sort(
        (a, b) => a - b,
      ),
      Array.from({ length: 24 }, (_, i) => i),
    );
    for (const scope of scopes) {
      assert.equal(
        new Set(scope.practice.map((index) => active[index].difficulty)).size,
        3,
        "historical scope difficulty availability stays stable",
      );
      assert(
        scope.practice.every((index) => active[index]?.id.startsWith("RP-")),
      );
    }
  }
});

test("legacy answers remain resolvable while exposed questions do not count as independent assessments", () => {
  const all = new Map(getAllQuestions().map((q) => [q.id, q]));
  assert.equal(new Set(practice.map((q) => q.id)).size, 292);
  for (const q of oldPractice) {
    const historical = getQuestion(q.id)!;
    for (const key of Object.keys(q) as (keyof typeof q)[])
      assert.deepEqual(historical[key], q[key], `${q.id}: historical ${key} changed`);
    assert.equal(all.get(q.id)?.assessment, false, `${q.id}: exposed evidence`);
    const pool = oldPractice.filter((item) => item.topic === q.topic);
    const position = pool.findIndex((item) => item.id === q.id);
    assert.equal(
      getPracticeReplacement(q.id)?.id,
      getQuestions(q.topic)[position].id,
    );
  }
  for (const lesson of lessons) {
    for (const q of lesson.check)
      assert.equal(all.get(q.id)?.assessment, false);
  }
  for (const exam of exams) {
    assert.deepEqual(
      getExamQuestions(exam.id).map((q) => q.id),
      exam.questionIds,
    );
    assert(
      getExamQuestions(exam.id).every(
        (q) => !practice.some((p) => p.passage.id === q.passage?.id),
      ),
    );
  }
});

test("table questions preserve denominators and distinguish observation from cause", () => {
  const answer = (id: string) => {
    const q = practice.find((item) => item.id === id)!;
    return q.choices[q.answer];
  };
  const repair = practice.find((q) => q.id === "RP-08-6")!.passage;
  assert("table" in repair && repair.table);
  const [[, marchExamined, marchRepaired], [, aprilExamined, aprilRepaired]] =
    repair.table.rows;
  assert.equal(Number(marchRepaired) / Number(marchExamined), 0.4);
  assert.equal(Number(aprilRepaired) / Number(aprilExamined), 0.6);
  assert.match(answer("RP-08-6"), /higher in April.*cannot establish why/);

  const households = practice.find((q) => q.id === "RP-18-6")!.passage;
  assert("table" in households && households.table);
  const [
    ,
    [, firstHouseholds, secondHouseholds],
    [, firstPopulation, secondPopulation],
  ] = households.table.rows;
  assert.equal(Number(firstHouseholds) / Number(firstPopulation), 0.2);
  assert.equal(Number(secondHouseholds) / Number(secondPopulation), 0.15);
  assert.equal(
    (Number(secondHouseholds) - Number(firstHouseholds)) /
      Number(firstHouseholds),
    0.2,
  );
  assert.match(
    answer("RP-18-6"),
    /increased by 20%.*decreased from 20% to 15%/,
  );
});
