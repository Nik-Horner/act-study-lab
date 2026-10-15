import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const read = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../src/content/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
const topics = read("reading-topics"),
  lessons = read("reading-lessons"),
  questions = read("reading-questions"),
  practice = read("reading-practice"),
  activities = read("lesson-activities"),
  exams = read("reading-exams");
assert.equal(topics.length, 6);
assert.equal(lessons.length, 6);
assert.equal(exams.length, 2);
const all = [...questions, ...practice, ...lessons.flatMap((l) => l.check)],
  ids = new Set(all.map((q) => q.id)),
  heldout = new Set(exams.flatMap((e) => e.questionIds));
assert.equal(ids.size, 378);
assert.equal(practice.length, 144);
assert.equal(questions.length, 216);
assert.equal(heldout.size, 72);
const oldIds = new Set(
  ["math-questions", "math-extra-questions", "science-questions"]
    .flatMap((name) => read(name))
    .map((q) => q.id),
);
for (const q of all) {
  assert(!oldIds.has(q.id), `${q.id}: subject ID collision`);
  assert(topics.some((t) => t.slug === q.topic));
  assert.equal(q.subject, "reading");
  assert.equal(q.choices.length, 4);
  assert.equal(new Set(q.choices).size, 4);
  assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
  assert(q.passage?.context?.length > 60);
  assert(q.explanation.length > 90);
  assert(q.questionText.length > 15);
  if (q.topic === "reading-vocabulary") {
    const target = [...q.questionText.matchAll(/“([^”]+)”/g)]
      .at(-1)?.[1]
      .replace(/[,.;:]$/, "");
    if (target)
      assert(
        q.passage.context.toLowerCase().includes(target.toLowerCase()),
        `${q.id}: quoted vocabulary absent from text: ${target}`,
      );
  }
}
for (const topic of topics) {
  assert.equal(
    questions.filter((q) => q.topic === topic.slug && !heldout.has(q.id))
      .length,
    24,
  );
  const lesson = lessons.find((l) => l.slug === topic.slug);
  assert(lesson);
  assert.equal(lesson.sections.length, 7);
  for (const section of lesson.sections) {
    assert(section.heading.trim(), `${topic.slug}: missing concept heading`);
    assert(
      section.body.length > 0 && section.body.every((p) => p.trim()),
      `${topic.slug}: missing teaching method`,
    );
    for (const example of section.examples ?? []) {
      assert(example.text.includes("Question:"), `${topic.slug}: missing task`);
      assert(
        example.text.includes("Supported answer:") &&
          example.text.includes("Reason:"),
        `${topic.slug}: missing worked reasoning`,
      );
    }
  }
  assert.equal(lesson.sections.flatMap((s) => s.examples ?? []).length, 6);
  assert.equal(lesson.check.length, 3);
  for (const check of lesson.check)
    assert(!questions.some((q) => q.id === check.id));
}
const passageIds = new Set();
for (const exam of exams) {
  assert.equal(exam.minutes, 40);
  assert.equal(exam.questionIds.length, 36);
  assert.equal(new Set(exam.questionIds).size, 36);
  const items = exam.questionIds.map((id) =>
    questions.find((q) => q.id === id),
  );
  assert(items.every(Boolean));
  const units = new Map();
  for (const q of items) {
    const unit = units.get(q.passage.id) ?? [];
    unit.push(q);
    units.set(q.passage.id, unit);
  }
  assert.equal(units.size, 4);
  let paired = 0,
    visual = 0;
  for (const [id, unit] of units) {
    assert(!passageIds.has(id));
    passageIds.add(id);
    assert.equal(unit.length, 9);
    const p = unit[0].passage;
    const words = p.context.split(/\s+/).length;
    assert(words >= 650 && words <= 900, `${id}: ${words} words`);
    if (p.context.includes("Passage A")) paired++;
    if (p.table || p.graph) visual++;
    assert(unit.every((q) => q.passage.context === p.context));
  }
  assert.equal(paired, 1);
  assert.equal(visual, 1);
  assert.equal(
    items.filter((q) => q.category === "Key Ideas and Details").length,
    16,
  );
  assert.equal(
    items.filter((q) => q.category === "Craft and Structure").length,
    12,
  );
  assert.equal(
    items.filter((q) => q.category === "Integration of Knowledge and Ideas")
      .length,
    8,
  );
}
assert(
  !questions
    .filter((q) => !heldout.has(q.id))
    .some((q) => passageIds.has(q.passage.id)),
  "Held-out passages cannot appear in drills",
);
const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const instruction = lessons
  .flatMap((lesson) => [
    ...lesson.sections.flatMap((section) =>
      (section.examples ?? []).map((example) => example.text),
    ),
    ...lesson.check.map((q) => q.passage.context),
    ...activities[lesson.slug].map((activity) => JSON.stringify(activity)),
  ])
  .map(normalize)
  .join(" ");
const priorPassages = new Set(
  questions.map((q) => normalize(q.passage.context)),
);
const newPassages = new Map(practice.map((q) => [q.passage.id, q.passage]));
assert.equal(newPassages.size, 24);
for (const topic of topics) {
  const pool = practice.filter((q) => q.topic === topic.slug);
  assert.equal(
    pool.length,
    24,
    `${topic.slug}: preserve daily scope pool positions`,
  );
  for (const difficulty of ["easy", "medium", "hard"])
    assert.equal(pool.filter((q) => q.difficulty === difficulty).length, 8);
}
for (const [id, passage] of newPassages) {
  const text = normalize(passage.context);
  const words = text.split(" ");
  assert(words.length >= 180, `${id}: practice needs a complete passage`);
  assert(!priorPassages.has(text), `${id}: reused legacy or exam passage`);
  assert.equal(practice.filter((q) => q.passage.id === id).length, 6);
  for (let i = 0; i <= words.length - 18; i++)
    assert(
      !instruction.includes(words.slice(i, i + 18).join(" ")),
      `${id}: practice excerpt exposed in teaching`,
    );
}
console.log(
  "Reading validated: 6 lessons with teaching methods and worked reasoning, 144 independent focused drills on 24 new passages across three difficulties, 144 legacy practice records retained for history, 18 teaching checks, 2 full 36-question/40-minute forms with 4 substantial passages each.",
);
