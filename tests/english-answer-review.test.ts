import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  EnglishAnswerReview,
  type EnglishReviewItem,
} from "../src/components/EnglishAnswerReview";

test("saved English results open on misses without changing the stored answer", () => {
  const items: EnglishReviewItem[] = [
    {
      number: 1,
      topic: "commas",
      prompt: "Missed source question",
      underline: ",",
      choices: ["Incorrect edit", "Correct edit"],
      picked: 0,
      answer: 1,
      correct: false,
      explanation: "Use the clause boundary to choose the correct edit.",
      passage: "The source passage",
    },
    {
      number: 2,
      topic: "commas",
      prompt: "Correct source question",
      underline: "",
      choices: ["Correct answer", "Other answer"],
      picked: 0,
      answer: 0,
      correct: true,
      explanation: "The clause is complete.",
      passage: "The source passage",
    },
  ];
  const before = JSON.stringify(items);
  const html = renderToStaticMarkup(
    createElement(EnglishAnswerReview, { items }),
  );
  assert(html.includes("Missed source question"));
  assert(!html.includes("Correct source question"));
  assert(html.includes("Incorrect edit"));
  assert(html.includes("Correct edit"));
  assert(html.includes("/learn/commas"));
  assert(html.includes("All answers"));
  assert.equal(JSON.stringify(items), before);
});
