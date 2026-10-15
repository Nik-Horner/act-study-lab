import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  englishDrillOrder,
  englishDrillLevel,
} from "../src/lib/english-drill-order";
import { DrillClient } from "../src/app/drill/[slug]/DrillClient";
import type { Question } from "../src/lib/content";
const questions: Question[] = [
  "easy",
  "medium",
  "hard",
  "easy",
  "medium",
  "hard",
].map((difficulty, i) => ({
  id: `q${i}`,
  category: "CSE",
  difficulty: difficulty as Question["difficulty"],
  stem: `Unique question ${i}`,
  questionText: "Which choice is correct?",
  choices: ["one", "two", "three", "four"],
  answer: 0,
  explanation: "The keyed response completes the sentence.",
}));
const ids = (order: number[]) => order.map((i) => questions[i].id);

test("English prefers unseen questions globally before matching goal difficulty", () => {
  const seen = ["q2", "q5", "q1"];
  const order = englishDrillOrder(questions, seen, 34, 36);
  assert.deepEqual(ids(order), ["q4", "q0", "q3", "q2", "q5", "q1"]);
  assert.equal(new Set(order).size, questions.length);
});

test("English difficulty reflects the learner baseline without assuming an unknown score", () => {
  assert.deepEqual(ids(englishDrillOrder(questions, [], 20, 36)), [
    "q0",
    "q3",
    "q1",
    "q4",
    "q2",
    "q5",
  ]);
  assert.deepEqual(ids(englishDrillOrder(questions, [], 30, 36)), [
    "q2",
    "q5",
    "q1",
    "q4",
    "q0",
    "q3",
  ]);
  assert.deepEqual(ids(englishDrillOrder(questions, [], null, 36)), [
    "q0",
    "q1",
    "q2",
    "q3",
    "q4",
    "q5",
  ]);
  assert.equal(englishDrillLevel(28, 33), "challenge");
  assert.equal(englishDrillLevel(23, 36), "foundation");
  assert.equal(englishDrillLevel(28, 32), "balanced");
  assert.equal(englishDrillLevel(36, null), "balanced");
  assert.deepEqual(englishDrillOrder([], []), []);
});

test("a reloaded English drill keeps the next unseen item ahead of previously practiced material", () => {
  const first = englishDrillOrder(questions, [], 34, 36)[0];
  const next = englishDrillOrder(questions, [questions[first].id], 34, 36)[0];
  assert.notEqual(first, next);
  assert.equal(next, 5);
  assert.deepEqual(
    englishDrillOrder(
      questions,
      questions.map((q) => q.id),
      34,
      36,
    ),
    [2, 5, 1, 4, 0, 3],
  );
});

test("standalone topic and weak drills use the goal queue while daily and targeted misses retain assigned order", () => {
  const shared = {
    ownerId: "test-owner",
    currentScore: 34,
    targetScore: 36,
    answeredQuestionIds: [],
  };
  const topic = {
    ...shared,
    mode: "topic" as const,
    slug: "commas",
    title: "Commas",
    questions,
    initialProgress: undefined,
  };
  const firstStem = (html: string) => html.match(/Unique question \d/)?.[0];
  const standalone = renderToStaticMarkup(createElement(DrillClient, topic));
  assert.equal(firstStem(standalone), "Unique question 2");
  assert.match(standalone, /Goal 36/);
  assert.match(standalone, /Challenge practice/);
  assert.doesNotMatch(standalone, /to master/);
  const pool = questions.map((question) => ({
    topicSlug: "commas",
    topicTitle: "Commas",
    question,
  }));
  assert.equal(
    firstStem(
      renderToStaticMarkup(
        createElement(DrillClient, { ...shared, mode: "weak", pool }),
      ),
    ),
    "Unique question 2",
  );
  assert.equal(
    firstStem(
      renderToStaticMarkup(
        createElement(DrillClient, { ...shared, mode: "misses", pool }),
      ),
    ),
    "Unique question 0",
  );
  const daily = renderToStaticMarkup(
    createElement(DrillClient, {
      ...topic,
      daily: {
        count: 0,
        correct: 0,
        streak: 0,
        onAnswer: async () => true,
        onNext: () => {},
      },
    }),
  );
  assert.equal(firstStem(daily), "Unique question 0");
  assert.doesNotMatch(daily, /Challenge practice|New questions first/);
});
