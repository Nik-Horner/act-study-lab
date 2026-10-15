import { test } from "node:test";
import assert from "node:assert/strict";
import {
  selectPracticeSet,
  practiceStage,
} from "../src/lib/act/practice-queue";
import {
  createDefaultState,
  type StudyState,
} from "../src/lib/act/progress-model";
import type { Question } from "../src/lib/act/types";
import { getQuestions } from "../src/lib/act/content";
const bank = Array.from(
  { length: 36 },
  (_, i) =>
    ({
      id: `q${i}`,
      topic: `topic${i % 4}`,
      subject: "math",
      category: "Math",
      difficulty: i < 12 ? "easy" : i < 24 ? "medium" : "hard",
      stem: "",
      questionText: "Solve",
      choices: ["1", "2", "3", "4"],
      answer: 0,
      explanation: "Proof",
    }) as Question,
);
function state(baseline: number | null, target: number): StudyState {
  return {
    ...createDefaultState(),
    profile: {
      testDate: "2027-06-12",
      mathBaseline: baseline,
      scienceBaseline: null,
      minutesPerDay: 75,
      targetScore: target,
    },
  };
}
test("unknown students get balanced diagnostics and high baselines get real challenge", () => {
  const d = selectPracticeSet(bank, state(null, 36), "math");
  assert.deepEqual(
    ["easy", "medium", "hard"].map(
      (level) => d.filter((q) => q.difficulty === level).length,
    ),
    [4, 4, 4],
  );
  const c = selectPracticeSet(bank, state(34, 36), "math");
  assert.equal(c.length, 12);
  assert.equal(c.filter((q) => q.difficulty === "hard").length, 7);
  assert.equal(new Set(c.map((q) => q.topic)).size, 4);
  assert.equal(
    selectPracticeSet(bank, state(19, 24), "math").filter(
      (q) => q.difficulty === "easy",
    ).length,
    8,
  );
});
test("new evidence can promote a foundation student; repeated exposed answers cannot", () => {
  const s = state(19, 36);
  s.answers = bank.slice(12, 18).map((q, i) => ({
    id: `a${i}`,
    questionId: q.id,
    chosen: 0,
    elapsedMs: 1000,
    confidence: "high",
    cause: null,
    at: `2026-10-14T12:00:0${i}Z`,
    mode: "drill",
  }));
  assert.equal(practiceStage(bank, s, "math"), "Challenge");
  const first = [...s.answers];
  s.answers.push(
    ...first.map((a, i) => ({
      ...a,
      id: `later${i}`,
      chosen: 1,
      at: `2026-10-15T12:00:0${i}Z`,
    })),
  );
  assert.equal(practiceStage(bank, s, "math"), "Foundations");
  s.answers = first;
  s.answers = s.answers.map((a) => ({ ...a, questionId: bank[0].id }));
  assert.equal(practiceStage(bank, s, "math"), "Foundations");
});
test("unseen work wins over repeated high difficulty and every next set reaches new content", () => {
  const s = state(34, 36),
    first = selectPracticeSet(bank, s, "math");
  s.answers = first.map((q, i) => ({
    id: `a${i}`,
    questionId: q.id,
    chosen: 0,
    elapsedMs: 1000,
    confidence: "high",
    cause: null,
    at: "2026-10-14T12:00:00Z",
    mode: "drill",
  }));
  const next = selectPracticeSet(bank, s, "math");
  assert(next.every((q) => !first.some((p) => p.id === q.id)));
  assert.equal(new Set(next.map((q) => q.id)).size, 12);
  s.answers = bank
    .filter((q) => q.difficulty === "hard")
    .map((q, i) => ({ ...s.answers[0], id: `h${i}`, questionId: q.id }));
  assert(
    selectPracticeSet(bank, s, "math").every((q) => q.difficulty !== "hard"),
  );
});
test("small or exhausted pools never duplicate a question or invent a fresh item", () => {
  const s = state(34, 36);
  assert.equal(selectPracticeSet([], s, "math").length, 0);
  assert.equal(selectPracticeSet(bank.slice(0, 3), s, "math").length, 3);
  const same = selectPracticeSet(
    bank.map((q) => ({ ...q, assessment: false })),
    s,
    "math",
  );
  assert.deepEqual(same, []);
});

test("recent independent difficulty overrides a reported high baseline when foundations are failing", () => {
  const s = state(34, 36);
  s.answers = bank.slice(0, 6).map((q, i) => ({
    id: `weak${i}`,
    questionId: q.id,
    chosen: 1,
    elapsedMs: 1000,
    confidence: "high",
    cause: null,
    at: "2026-10-14T12:00:00Z",
    mode: "drill",
  }));
  assert.equal(practiceStage(bank, s, "math"), "Foundations");
  assert.equal(
    selectPracticeSet(bank, s, "math").filter((q) => q.difficulty === "easy")
      .length,
    6,
  );
});

test("Reading prioritizes new passages even when the earlier answer was in another topic", () => {
  const all = getQuestions().filter((q) => q.subject === "reading");
  const old = all.find((q) => q.topic === "reading-main-idea")!;
  const s = state(34, 36);
  s.profile.readingBaseline = 34;
  s.answers = [
    {
      id: "other-skill",
      questionId: old.id,
      chosen: old.answer,
      elapsedMs: 1000,
      confidence: "high",
      cause: null,
      at: "2026-10-14T12:00:00Z",
      mode: "drill",
    },
  ];
  const detail = all.filter((q) => q.topic === "reading-details");
  assert(detail.some((q) => q.passage?.id === old.passage?.id));
  const set = selectPracticeSet(detail, s, "reading");
  assert(set.every((q) => q.passage?.id !== old.passage?.id));
  assert.equal(new Set(set.map((q) => q.passage?.id)).size, set.length);
});
