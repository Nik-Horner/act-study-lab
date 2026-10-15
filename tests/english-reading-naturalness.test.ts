import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  getTopics,
  getQuestions,
  getLesson,
  getExam,
} from "../src/lib/content";
import foundations from "../src/content/english-foundation-drills.json";
import reading from "../src/content/reading-practice.json";
import readingQuestions from "../src/content/reading-questions.json";
import readingExams from "../src/content/reading-exams.json";
import activities from "../src/content/lesson-activities.json";
import audit from "../docs/english-reading-naturalness-2026-10-14.json";

const question = (topic: string, id: string) =>
  getQuestions(topic).find((q) => q.id === id)!;
const corrected = (q: ReturnType<typeof question>) =>
  q.stem.replace(/\[\[([\s\S]*?)\]\]/g, (_, original) =>
    q.choices[q.answer] === "NO CHANGE" ? original : q.choices[q.answer],
  );

test("the language audit preserves every English and active/heldout Reading answer position", () => {
  const english = getTopics().flatMap((t) => [
    ...getQuestions(t.slug),
    ...foundations.filter((q) => q.topic === t.slug),
    ...getLesson(t.slug).check.map((q, i) => ({
      ...q,
      id: `${t.slug}-daily-check-${i + 1}`,
    })),
  ]);
  const examItems = ["exam-1", "exam-2"].flatMap((id) =>
    getExam(id).passages.flatMap((p) =>
      p.questions.map((q) => ({ ...q, id: `${id}:${q.number}` })),
    ),
  );
  const heldout = new Set(readingExams.flatMap((e) => e.questionIds));
  const items = [
    ...english,
    ...examItems,
    ...reading,
    ...readingQuestions.filter((q) => heldout.has(q.id)),
  ];
  const contract = items
    .map((q) => ({ answer: q.answer, id: q.id }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  assert.equal(contract.length, 1122);
  assert.equal(new Set(contract.map((q) => q.id)).size, 1122);
  assert.equal(
    createHash("sha256").update(JSON.stringify(contract)).digest("hex"),
    audit.gradingContractSha256,
  );
});

test("the reported series question has marked clause boundaries and explains its complete core sentence", () => {
  const q = question(
    "sentence-structure",
    "english-skill-sentence-structure-nested-main-clause-01",
  );
  assert.equal(q.choices[q.answer], "describes");
  assert.match(
    corrected(q),
    /reports, which[\s\S]*inspection, describes a fault/,
  );
  assert.doesNotMatch(corrected(q), /disagreeing describes/);
  assert.match(q.explanation, /The series of reports describes a fault/);
  assert.match(q.explanation, /released and passed belong inside/);
  const lesson = getLesson("sentence-structure");
  assert.match(
    lesson.sections[5].examples![0].label,
    /The catalogue lists every damaged page/,
  );
  for (const id of [
    "pronouns-transfer-01",
    "english-skill-pronouns-embedded-relative-01",
  ]) {
    const relative = question("pronouns", id);
    assert.match(
      corrected(relative),
      /, who [\s\S]*, (was invited|will supervise)/,
    );
    assert.match(relative.explanation, /main sentence/);
  }
});

test("untested surrounding words do not leave repaired English sentences awkward or incomplete", () => {
  assert.doesNotMatch(
    corrected(question("sentence-structure", "sentence-structure-022")),
    /loafs|ranging from/,
  );
  assert.match(
    corrected(question("sentence-structure", "sentence-structure-028")),
    /second violation will carry a \$1,000 fine/,
  );
  assert.equal(
    corrected(question("modifiers", "modifiers-029")),
    "The museum displayed the brass astrolabe beside a portrait.",
  );
  assert.match(
    corrected(question("parallel-structure", "parallel-structure-011")),
    /not only for demanding rehearsals but also for inspiring loyalty/,
  );
  assert.match(
    getExam("exam-2").passages.find((p) =>
      p.questions.some((q) => q.number === 40),
    )!.html,
    /research in laboratories/,
  );
});

test("Reading clarifications identify the intended hand and place study observations at the stated times", () => {
  const relay = reading.find((q) => q.id === "RP-V3-15-2")!;
  assert.match(relay.passage.context, /“When do you need to see my hand\?”/);
  assert.match(relay.choices[relay.answer], /Mina’s hand/);
  assert.doesNotMatch(relay.passage.context, /when Leah needed to see it/);
  const model = reading.find((q) => q.id === "RP-V3-18-4")!;
  assert(model.passage.context.includes("becomes inspectable"));
  assert.equal(model.choices[model.answer], "possible to examine directly");
  const shore = readingQuestions.find((q) => q.id === "RE-1-28")!;
  assert.match(shore.passage.context, /at each point during weekly visits/);
  const seat = readingQuestions.find((q) => q.id === "RE-1-10")!;
  assert.match(
    seat.passage.context,
    /Before the change[\s\S]*repeated those counts for a month after/,
  );
  for (const id of new Set(
    [...reading, ...readingQuestions].map((q) => q.passage.id),
  )) {
    const copies = [...reading, ...readingQuestions].filter(
      (q) => q.passage.id === id,
    );
    assert.equal(
      new Set(copies.map((q) => JSON.stringify(q.passage))).size,
      1,
      id,
    );
  }
});

test("standalone Reading activities introduce the instructions and people their questions refer to", () => {
  const recipe = activities["reading-main-idea"][6];
  assert(recipe.evidence);
  assert(recipe.evidence.context.startsWith("Sofia asked her uncle"));
  assert.match(recipe.evidence.context, /wrote the amount[\s\S]*taste first/);
  const violin = activities["reading-inference"][0];
  assert(violin.evidence);
  assert(violin.evidence.context.startsWith("When Jae borrowed"));
  assert.match(violin.evidence.context, /a softly started note carried/);
  const portrait = activities["reading-inference"][5];
  assert(portrait.evidence);
  assert(portrait.evidence.context.startsWith("Leah’s commission"));
  assert.match(
    portrait.evidence.context,
    /offered to recreate the trophy pose/,
  );
});
