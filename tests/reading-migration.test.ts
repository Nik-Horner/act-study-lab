import { test } from "node:test";
import assert from "node:assert/strict";
import fixtures from "./fixtures/daily-format5.json";
import { refreshDailyContent, type DailyPlan } from "../src/lib/daily-plan";
import {
  getQuestion,
  getPracticeReplacement,
  getQuestions,
  getAllQuestions,
} from "../src/lib/act/content";
import { DAILY_CURRICULUM } from "../src/lib/daily-curriculum";
import methods from "../src/content/math-method-questions.json";

test("saved Reading replaces only unanswered exposed items and keeps the mapping stable after answering", () => {
  const original = structuredClone(fixtures.cases[0].plan) as DailyPlan;
  const block = original.blocks.find((b) => b.subject === "reading")!;
  const plan = { ...original, blocks: [block], minutes: 90 };
  const old = block.units![0].questions;
  const answered = { [old[0].id]: old[0].answer };
  const replacement = getPracticeReplacement(old[1].id)!;
  assert(replacement);
  const upgraded = refreshDailyContent(plan, answered);
  assert.equal(upgraded.id, plan.id);
  assert.equal(upgraded.blocks[0].units![0].id, block.units![0].id);
  assert(upgraded.blocks[0].questions.some((q) => q.id === old[0].id));
  assert(upgraded.blocks[0].questions.some((q) => q.id === replacement.id));
  assert(!upgraded.blocks[0].questions.some((q) => q.id === old[1].id));
  assert.deepEqual(getQuestion(old[0].id)?.choices, old[0].choices);
  const afterAnswer = refreshDailyContent(plan, {
    ...answered,
    [replacement.id]: replacement.answer,
  });
  assert(afterAnswer.blocks[0].questions.some((q) => q.id === replacement.id));
  assert.deepEqual(
    afterAnswer.blocks[0].units![0].questions.map((q) => q.id),
    upgraded.blocks[0].units![0].questions.map((q) => q.id),
  );
  assert(!getQuestions("reading-details").some((q) => q.id === old[0].id));
  assert.equal(
    getAllQuestions().find((q) => q.id === old[0].id)?.assessment,
    false,
  );
});
test("all added Math methods have an active daily scope that teaches every required section", () => {
  for (const q of methods) {
    const bank = getQuestions(q.topic);
    const index = bank.findIndex((item) => item.id === q.id);
    assert(index >= 32);
    const scopes = DAILY_CURRICULUM[q.topic].filter((scope) =>
      scope.practice.includes(index),
    );
    assert(scopes.length, q.id);
    assert(
      scopes.some((scope) =>
        q.lessonSections.every((i) => scope.sections.includes(i)),
      ),
      q.id,
    );
  }
});

test("retired Reading mistakes can be resolved with independent replacements and do not poison mastery", async () => {
  const { getTopicStats } = await import("../src/lib/act/progress-model");
  const bank = [...getQuestions("reading-details")].sort(
    (a, b) => Number(a.difficulty === "hard") - Number(b.difficulty === "hard"),
  );
  const all = getAllQuestions();
  const old = all.find(
    (q) =>
      q.topic === "reading-details" &&
      q.assessment === false &&
      q.replacementId,
  )!;
  const event = (
    id: string,
    questionId: string,
    chosen: number,
    at: string,
  ) => ({
    id,
    questionId,
    chosen,
    at,
    elapsedMs: 1000,
    confidence: "high" as const,
    cause: null,
    mode: "drill" as const,
  });
  const answers = [
    event("old", old.id, (old.answer + 1) % 4, "2026-10-01T12:00:00Z"),
    ...bank.map((q, i) =>
      event(
        `new${i}`,
        q.id,
        q.answer,
        new Date(Date.parse("2026-10-14T12:00:00Z") + i * 1000).toISOString(),
      ),
    ),
  ];
  const stats = getTopicStats("reading-details", all, answers, 36);
  assert.equal(stats.mastered, true);
  assert.equal(stats.accuracy, 1);
  assert(!stats.unresolvedIds.includes(old.id));
  assert.equal(answers[0].questionId, old.id);
});
test("completed-section misses receive active skill practice without revealing held-out questions", async () => {
  const { getExamQuestions } = await import("../src/lib/act/content");
  const { practiceForMisses } = await import("../src/lib/act/progress-model");
  for (const id of ["reading-1", "math-1", "science-1"]) {
    const missed = getExamQuestions(id)[0];
    const active = getQuestions().filter((q) => q.subject === missed.subject);
    const selected = practiceForMisses(
      active,
      getAllQuestions(),
      new Set([missed.id]),
    );
    assert(selected.length, id);
    assert(selected.every((q) => q.topic === missed.topic));
    assert(selected.every((q) => active.some((p) => p.id === q.id)));
    assert(!selected.some((q) => q.id === missed.id));
  }
});

test("old exam misses do not require memorizing an exposed form to demonstrate fresh practice mastery", async () => {
  const { getExamQuestions } = await import("../src/lib/act/content");
  const { getTopicStats } = await import("../src/lib/act/progress-model");
  const missed = getExamQuestions("reading-1")[0];
  const bank = getQuestions(missed.topic).sort(
    (a, b) => Number(a.difficulty === "hard") - Number(b.difficulty === "hard"),
  );
  const records = [
    {
      id: "exam-miss",
      questionId: missed.id,
      chosen: (missed.answer + 1) % 4,
      at: "2026-10-01T12:00:00Z",
      elapsedMs: 0,
      confidence: "low" as const,
      cause: null,
      mode: "exam" as const,
    },
    ...bank.map((q, i) => ({
      id: `proof${i}`,
      questionId: q.id,
      chosen: q.answer,
      at: new Date(Date.parse("2026-10-14T12:00:00Z") + i * 1000).toISOString(),
      elapsedMs: 1000,
      confidence: "high" as const,
      cause: null,
      mode: "drill" as const,
    })),
  ];
  const stats = getTopicStats(missed.topic, getAllQuestions(), records, 36);
  assert.equal(stats.mastered, true);
  assert.equal(stats.accuracy, 1);
  assert(!stats.unresolvedIds.includes(missed.id));
});
