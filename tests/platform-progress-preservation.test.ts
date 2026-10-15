import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import baseline from "./fixtures/pre-focused-progress-keys.json";
import { getExam as englishExam } from "../src/lib/content";
import { englishDailyQuestions } from "../src/lib/english-daily-content";
import { getAllQuestions, getQuestion, getExam } from "../src/lib/act/content";
import {
  validateCloudRecord,
  hydrateCloudState,
} from "../src/lib/act/cloud-records";
import { getTopicStats } from "../src/lib/act/progress-model";
import type { Tables } from "../src/lib/supabase/database.types";

test("every pre-update question still resolves with its historical topic and grading key", () => {
  for (const [subject, topic, id, answer] of baseline.questions) {
    const q =
      subject === "english"
        ? englishDailyQuestions(String(topic)).find((q) => q.id === id)
        : getQuestion(String(id));
    assert(q, String(id));
    assert.equal(q.answer, answer, `${id}: historical grading`);
    if (subject !== "english")
      assert.equal(getQuestion(String(id))?.topic, topic, String(id));
  }
});
test("all historical subject drills hydrate with answer identity, timing and confidence intact", () => {
  const rows = baseline.questions
    .filter(
      ([subject, , id]) =>
        subject !== "english" &&
        !baseline.exams.some((e) => e.questionIds.includes(String(id))),
    )
    .map(([, , id, answer]) => ({
      answers: {
        kind: "answer",
        event: {
          id: randomUUID(),
          questionId: id,
          chosen: answer,
          elapsedMs: 17000,
          confidence: "low",
          cause: "timing",
          at: "2026-10-10T12:00:00Z",
          mode: "drill",
        },
      },
    }));
  for (const row of rows)
    assert(
      validateCloudRecord(row.answers),
      String(row.answers.event.questionId),
    );
  const state = hydrateCloudState(rows as never, null, []);
  assert.equal(state.answers.length, rows.length);
  for (const row of rows)
    assert.deepEqual(
      state.answers.find((a) => a.id === row.answers.event.id),
      row.answers.event,
    );
  for (const topic of new Set(
    rows.map((r) => getQuestion(String(r.answers.event.questionId))!.topic),
  )) {
    const count = rows.filter(
      (r) => getQuestion(String(r.answers.event.questionId))!.topic === topic,
    ).length;
    const stats = getTopicStats(topic, getAllQuestions(), state.answers);
    assert.equal(
      stats.practiced,
      count,
      `${topic}: retained historical practice`,
    );
  }
});
test("retired Reading practice remains visible without inventing fresh mastery", () => {
  const bank = getAllQuestions();
  const old = bank
    .filter((q) => q.subject === "reading" && q.assessment === false)
    .slice(0, 10);
  assert.equal(old.length, 10);
  const answers = old.map((q) => ({
    id: randomUUID(),
    questionId: q.id,
    chosen: q.answer,
    elapsedMs: 1000,
    confidence: "high" as const,
    cause: null,
    at: "2026-10-10T12:00:00Z",
    mode: "drill" as const,
  }));
  for (const topic of new Set(old.map((q) => q.topic))) {
    const stats = getTopicStats(topic, bank, answers, 36);
    assert(stats.practiced > 0);
    assert.equal(stats.unique, 0);
    assert.equal(stats.mastered, false);
  }
});
test("historical timed forms keep all answers, section identities and raw scores on hydration", () => {
  for (const old of baseline.exams) {
    const current = getExam(old.id);
    assert.deepEqual(current.questionIds, old.questionIds);
    assert.equal(current.minutes, old.minutes);
    const answers = Object.fromEntries(
      old.questionIds.map((id) => [id, getQuestion(id)!.answer]),
    );
    const attempt = {
      id: randomUUID(),
      examId: old.id,
      answers,
      elapsedSeconds: old.minutes * 60,
      startedAt: "2026-10-10T12:00:00Z",
      completedAt: "2026-10-10T13:00:00Z",
    };
    const state = hydrateCloudState(
      [{ answers: { kind: "exam", attempt } }] as never,
      null,
      [],
    );
    assert.equal(state.attempts.length, 1, old.id);
    assert.deepEqual(state.attempts[0].answers, answers);
  }
  const check = {
    item_key: "2026-10-10:reading-main-idea",
    checked_at: "2026-10-10T12:00:00Z",
  } as Tables<"plan_checks">;
  assert.deepEqual(hydrateCloudState([], null, [check]).planChecks, [
    check.item_key,
  ]);
});

test("both historical English section forms preserve passage identities and every numbered answer key", () => {
  for (const old of baseline.englishExams) {
    const current = englishExam(old.id);
    assert.deepEqual(
      current.passages.map((p) => ({
        id: p.id,
        questions: p.questions.map((q) => ({
          number: q.number,
          answer: q.answer,
        })),
      })),
      old.passages,
    );
  }
});
