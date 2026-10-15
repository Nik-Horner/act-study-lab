import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  getExam,
  getLesson,
  getQuestions,
  getTopics,
} from "../src/lib/content";
import foundations from "../src/content/english-foundation-drills.json";
import ledger from "../docs/english-content-review.json";

function read(path: string) {
  return JSON.parse(
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
  );
}
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sorted(v)]),
    );
  return value;
}
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\[\[([\s\S]*?)\]\]/g, "$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function correction(examId: string, number: number) {
  const passage = getExam(examId).passages.find((p) =>
    p.questions.some((q) => q.number === number),
  )!;
  const question = passage.questions.find((q) => q.number === number)!;
  return passage.html.replace(
    new RegExp(`\\[\\[${number}\\|(.*?)\\]\\]`, "s"),
    (_mark, original) =>
      question.choices[question.answer] === "NO CHANGE"
        ? original
        : question.choices[question.answer],
  );
}

test("every English question and check has a current individual editorial proof", () => {
  assert.equal(ledger.proofRecords.length, 665);
  assert.equal(new Set(ledger.proofRecords.map((p) => p.id)).size, 665);
  for (const proof of ledger.proofRecords) {
    const source = read(proof.source);
    let question;
    let context: string | undefined;
    if (proof.id.startsWith("lesson:"))
      question = source.check[Number(proof.id.split(":").at(-1))];
    else if (proof.source.includes("/exams/")) {
      const number = Number(proof.id.split(":").at(-1));
      const passage = source.passages.find(
        (p: { questions: { number: number }[] }) =>
          p.questions.some((q) => q.number === number),
      );
      question = passage.questions.find(
        (q: { number: number }) => q.number === number,
      );
      context = passage.html;
    } else
      question = (Array.isArray(source) ? source : source.questions).find(
        (q: { id: string }) => q.id === proof.id,
      );
    assert(question, proof.id);
    const payload = {
      stem: question.stem ?? null,
      difficulty: question.difficulty ?? null,
      questionText: question.questionText,
      choices: question.choices,
      answer: question.answer,
      explanation: question.explanation,
      ...(context === undefined ? {} : { context }),
    };
    assert.equal(
      createHash("sha256")
        .update(JSON.stringify(sorted(payload)))
        .digest("hex"),
      proof.contentSha256,
      `${proof.id}: content changed after review`,
    );
    assert.equal(question.answer, proof.answerIndex, proof.id);
    assert(proof.rationale.length > 15, proof.id);
  }
  assert.equal(foundations.length, 12);
});

test("advanced English teaching precedes independent contextual transfer practice", () => {
  for (const topic of getTopics()) {
    const lesson = getLesson(topic.slug);
    const appended = lesson.sections.at(-1)!;
    assert.match(appended.heading, /^Advanced transfer:/);
    assert.equal(
      (appended as { teachingRevision?: number }).teachingRevision,
      2,
    );
    const questions = getQuestions(topic.slug).filter((q) =>
      q.id.includes("-transfer-"),
    );
    assert.equal(questions.length, 2, topic.slug);
    const teaching = [
      ...lesson.check.map((q) => q.stem),
      ...lesson.sections.flatMap((s) => (s.examples ?? []).map((e) => e.text)),
    ].map(normalize);
    for (const q of getQuestions(topic.slug)) {
      assert(
        !teaching.includes(normalize(q.stem)),
        `${q.id}: identical teaching/practice stem`,
      );
      assert(q.questionText.trim(), q.id);
      assert.equal(new Set(q.choices).size, 4, q.id);
    }
  }
});

test("repaired English edits work inside the exact marked replacement span", () => {
  const q = getQuestions("sentence-structure").find(
    (q) => q.id === "sentence-structure-037",
  )!;
  const sentence = q.stem.replace(/\[\[([\s\S]*?)\]\]/, q.choices[q.answer]);
  assert.match(sentence, /food, many restaurants now serve it/);
  assert.equal(sentence.match(/restaurants now serve/g)?.length, 1);
  assert.match(
    correction("exam-1", 12),
    /abdomen\. When a compound[\s\S]*oxygen, energy is released/,
  );
  assert.match(
    correction("exam-1", 19),
    /Conserving dark habitats, scientists hope, will help/,
  );
  assert.match(
    correction("exam-2", 35),
    /creases so that a single tug spreads/,
  );
  assert.match(correction("exam-2", 37), /before expanding them\./);
  assert.match(correction("exam-2", 39), /and then pop into working shapes/);
  for (const id of ["exam-1", "exam-2"])
    for (const p of getExam(id).passages)
      for (const q of p.questions) {
        assert(
          q.questionText.trim(),
          `${id}:${q.number}: missing editing goal`,
        );
        assert.equal(new Set(q.choices).size, 4);
      }
});

test("lessons do not teach the rejected grammar shortcuts as universal rules", () => {
  assert.doesNotMatch(
    JSON.stringify(getLesson("transitions")),
    /Synonyms cancel each other/,
  );
  assert.doesNotMatch(
    JSON.stringify(getLesson("punctuation")),
    /cancel each other out/,
  );
  assert.match(
    getLesson("parallel-structure").sections[0].body.join(" "),
    /shared to/,
  );
  assert.match(
    getLesson("misc-grammar").sections[3].body.join(" "),
    /Passive voice is grammatical/,
  );
  assert.doesNotMatch(
    getQuestions("misc-grammar")
      .filter((q) => ["misc-grammar-009", "misc-grammar-032"].includes(q.id))
      .map((q) => q.explanation)
      .join(" "),
    /Different than.*nonstandard/,
  );
});

test("English challenge labels distinguish contextual transfer from basic single-rule practice", () => {
  for (const topic of getTopics()) {
    const questions = getQuestions(topic.slug);
    assert.equal(
      questions.filter(
        (q) => q.id.includes("-transfer-") && q.difficulty === "hard",
      ).length,
      2,
    );
  }
  assert.equal(
    getQuestions("redundancy").find((q) => q.id === "redundancy-014")
      ?.difficulty,
    "medium",
  );
  assert.equal(
    getQuestions("which-choice").find((q) => q.id === "which-choice-014")
      ?.difficulty,
    "medium",
  );
  assert.equal(
    getQuestions("pronouns").find((q) => q.id === "pronouns-031")?.difficulty,
    "hard",
  );
});
