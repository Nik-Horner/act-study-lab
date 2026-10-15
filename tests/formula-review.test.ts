import { test } from "node:test";
import assert from "node:assert/strict";
import katex from "katex";
import cards from "../src/content/math-formula-cards.json";
import { startFormulaReview, reviewFormula } from "../src/lib/formula-review";

test("formula ratings require a reveal, repeat missed cards, and finish only after recall", () => {
  let state = startFormulaReview(2);
  assert.deepEqual(reviewFormula(state, "remembered"), state);
  state = reviewFormula(reviewFormula(state, "reveal"), "again");
  assert.deepEqual(state, { remaining: [1, 0], revealed: false });
  state = reviewFormula(reviewFormula(state, "reveal"), "remembered");
  assert.deepEqual(state, { remaining: [0], revealed: false });
  state = reviewFormula(reviewFormula(state, "reveal"), "again");
  assert.deepEqual(state, { remaining: [0], revealed: false });
  state = reviewFormula(reviewFormula(state, "reveal"), "remembered");
  assert.deepEqual(state, { remaining: [], revealed: false });
  assert.deepEqual(reviewFormula(state, "again"), state);
  assert.equal(startFormulaReview(cards.length).remaining.length, cards.length);
});

test("formula deck has unique cards and valid accessible math", () => {
  assert.equal(cards.length, 36);
  assert.equal(new Set(cards.map((card) => card.id)).size, cards.length);
  for (const card of cards) {
    assert(card.category && card.title && card.note);
    const html = katex.renderToString(card.formula, {
      throwOnError: true,
      output: "htmlAndMathml",
    });
    assert(html.includes("<math"), card.id);
    for (const match of card.note.matchAll(/\\\((.*?)\\\)/g))
      assert.doesNotThrow(
        () => katex.renderToString(match[1], { throwOnError: true }),
        card.id,
      );
  }
});
