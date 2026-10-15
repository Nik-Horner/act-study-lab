import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const read = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../src/content/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
const replacements = read("math-extra-lessons");
const replacementSlugs = new Set(replacements.map((lesson) => lesson.slug));
const topics = ["math", "science"].flatMap((subject) =>
  read(`${subject}-topics`),
);
const lessons = [
  ...read("math-lessons").filter(
    (lesson) => !replacementSlugs.has(lesson.slug),
  ),
  ...replacements,
  ...read("science-lessons"),
];
const questions = [
  ...read("math-questions"),
  ...read("math-extra-questions"),
  ...read("math-method-questions"),
  ...read("math-skill-questions"),
  ...read("science-questions"),
];
const englishSkillQuestions = read("english-skill-questions");
assert.equal(read("math-skill-questions").length, 80, "Focused Math bank");
assert.equal(englishSkillQuestions.length, 93, "Focused English bank");
const exams = ["math", "science"].flatMap((subject) =>
  read(`${subject}-exams`),
);
const topicMap = new Map(topics.map((topic) => [topic.slug, topic]));
const structuralTopics = new Map([
  ...topicMap,
  ...read("topics").topics.map((topic) => [
    topic.slug,
    { ...topic, subject: "english" },
  ]),
]);
const questionMap = new Map(
  questions.map((question) => [question.id, question]),
);
assert.equal(topicMap.size, 14);
assert.equal(lessons.length, 14);
assert.equal(new Set(lessons.map((lesson) => lesson.slug)).size, 14);
assert.equal(questionMap.size, questions.length, "Question ids must be unique");
const allIds = new Set();
for (const question of [
  ...questions,
  ...englishSkillQuestions.map((question) => ({
    ...question,
    subject: question.subject ?? "english",
  })),
  ...lessons.flatMap((lesson) => lesson.check),
]) {
  assert(!allIds.has(question.id), `Duplicate id ${question.id}`);
  allIds.add(question.id);
  assert(structuralTopics.has(question.topic), `${question.id}: topic`);
  assert.equal(structuralTopics.get(question.topic).subject, question.subject);
  assert(question.stem.trim(), `${question.id}: missing task context`);
  assert(["easy", "medium", "hard"].includes(question.difficulty));
  assert.equal(
    question.choices.length,
    4,
    `${question.id}: digital ACT has four choices`,
  );
  assert.equal(
    new Set(question.choices).size,
    4,
    `${question.id}: repeated choices`,
  );
  assert(
    Number.isInteger(question.answer) &&
      question.answer >= 0 &&
      question.answer < 4,
  );
  assert(question.explanation.length > 35, `${question.id}: missing reasoning`);
  assert(question.questionText.length > 8);
  if (question.passage?.table) {
    for (const row of question.passage.table.rows)
      assert.equal(
        row.length,
        question.passage.table.columns.length,
        `${question.id}: malformed table`,
      );
  }
  if (question.passage?.graph) {
    for (const series of question.passage.graph.series) {
      assert(series.points.length >= 2, `${question.id}: incomplete series`);
      for (const point of series.points)
        assert(point.length === 2 && point.every(Number.isFinite));
    }
  }
  if (question.subject === "science")
    assert(question.passage, `${question.id}: Science requires a passage`);
}
for (const topic of topics) {
  const lesson = lessons.find((lesson) => lesson.slug === topic.slug);
  assert(lesson, `Missing lesson ${topic.slug}`);
  assert(
    lesson.sections.length >= 6 && lesson.sections.length <= 8,
    `${topic.slug}: lesson depth`,
  );
  assert.equal(lesson.check.length, 3, `${topic.slug}: quick checks`);
  const examples = lesson.sections.flatMap((section) => section.examples ?? []);
  assert(examples.length >= 6, `${topic.slug}: worked examples`);
  for (const section of lesson.sections)
    assert(
      section.heading.trim() &&
        section.body.length > 0 &&
        section.body.every((paragraph) => paragraph.trim()),
      `${topic.slug}: missing concept or teaching method`,
    );
}
const reserved = new Set();
for (const subject of ["math", "science"])
  assert.equal(
    exams.filter((exam) => exam.subject === subject).length,
    2,
    `${subject}: two practice forms`,
  );
for (const exam of exams) {
  assert.equal(exam.questionIds.length, exam.subject === "math" ? 45 : 40);
  assert.equal(exam.minutes, exam.subject === "math" ? 50 : 40);
  assert.equal(new Set(exam.questionIds).size, exam.questionIds.length);
  for (const id of exam.questionIds) {
    assert(!reserved.has(id), "Shared exam questions");
    reserved.add(id);
    assert.equal(questionMap.get(id)?.subject, exam.subject);
  }
}
for (const topic of topics) {
  const drills = questions.filter(
    (question) => question.topic === topic.slug && !reserved.has(question.id),
  );
  assert(drills.length >= 32, `Insufficient distinct drills ${topic.slug}`);
  assert(
    drills.filter((question) => question.difficulty === "hard").length >= 2,
    `Insufficient hard drills ${topic.slug}`,
  );
}
const passages = new Map();
for (const question of [
  ...questions,
  ...lessons.flatMap((lesson) => lesson.check),
]) {
  if (!question.passage) continue;
  const value = JSON.stringify(question.passage);
  const old = passages.get(question.passage.id);
  assert(
    !old || old === value,
    `Passage ${question.passage.id} has conflicting data`,
  );
  passages.set(question.passage.id, value);
}
console.log(
  `Content validated: ${topics.length} deep Math/Science lessons; ${questions.length - reserved.size} Math/Science drills (including 80 focused Math additions); ${englishSkillQuestions.length} focused English additions; ${reserved.size} timed section questions; ${lessons.reduce((count, lesson) => count + lesson.check.length, 0)} quick checks. All ${allIds.size} items have four unique choices and valid references.`,
);
