import { createHash } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import reading from "../src/content/reading-practice.json";
import review from "../docs/reading-original-distractor-review.json";
import alignment from "../docs/reading-science-skill-alignment.json";

const original = reading.filter((q) => !q.id.startsWith("RP-V3"));
const byId = new Map(original.map((q) => [q.id, q]));
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

test("all 144 reviewed original Reading tasks preserve their grading, wording, and complete evidence", () => {
  assert.equal(original.length, 144);
  assert.equal(review.items.length, 144);
  assert.deepEqual(
    new Set(review.items.map((item) => item.id)),
    new Set(original.map((q) => q.id)),
  );
  assert.equal(new Set(original.map((q) => q.passage.id)).size, 24);
  for (const item of review.items) {
    const q = byId.get(item.id)!;
    assert.equal(q.answer, item.answerIndex, q.id);
    assert.equal(q.choices[q.answer], item.answerText, q.id);
    assert.equal(item.originalChoices[q.answer], item.answerText, q.id);
    assert.equal(q.questionText, item.questionText, q.id);
    assert.equal(q.stem, item.stem, q.id);
    assert.equal(hash(q.passage), item.passageSha256, q.id);
    assert.deepEqual(q.choices, item.reviewedChoices, q.id);
    assert.equal(q.explanation, item.reviewedExplanation, q.id);
    assert(item.reviewedEvidence.trim().length > 20, q.id);
    assert(item.reviewedExplanation.length > 100, q.id);
    assert.equal(hash(q), item.sourceSha256, q.id);
  }
  assert.equal(alignment.preservedContracts.length, 643);
  assert.equal(
    hash(alignment.preservedContracts),
    review.preservedPriorContractSha256,
    "distractor repair must not rewrite the prior answer contracts",
  );
});

test("original Reading answer lengths do not supply a consistent longest or shortest shortcut", () => {
  const words = (text: string) => text.trim().split(/\s+/).length;
  const uniquelyExtreme = (direction: "longest" | "shortest") =>
    original.filter((q) => {
      const key = words(q.choices[q.answer]);
      const alternatives = q.choices
        .filter((_, index) => index !== q.answer)
        .map(words);
      return direction === "longest"
        ? key > Math.max(...alternatives)
        : key < Math.min(...alternatives);
    }).length;
  for (const direction of ["longest", "shortest"] as const)
    assert(
      uniquelyExtreme(direction) < original.length * 0.35,
      `the correct answer is too consistently ${direction}`,
    );
});

test("source-bound library and numerical distractors preserve the distinctions the methods teach", () => {
  const library = byId.get("RP-02-1")!;
  assert.match(library.passage.context, /checked them in promptly/);
  assert.match(library.passage.context, /might bring a different mix/);
  assert.match(library.choices[0], /delay in checking/);
  assert.match(library.choices[1], /establishes its success from fewer/);
  assert.match(library.choices[2], /responds to holiday readership/);
  const repair = byId.get("RP-08-6")!;
  const [[, marchTotal, marchDone], [, aprilTotal, aprilDone]] = repair.passage.table!.rows;
  const first = Number(marchDone) / Number(marchTotal);
  const second = Number(aprilDone) / Number(aprilTotal);
  assert.equal(first, 0.4);
  assert.equal(second, 0.6);
  assert(Math.abs((second - first) / first - 0.5) < 1e-9);
  assert.match(repair.choices[repair.answer], /higher in April.*cannot establish why/);
  const households = byId.get("RP-18-6")!;
  const [, [, firstCount, secondCount], [, firstPopulation, secondPopulation]] = households.passage.table!.rows;
  assert.equal((Number(secondCount) - Number(firstCount)) / Number(firstCount), 0.2);
  assert.equal(Number(firstCount) / Number(firstPopulation), 0.2);
  assert.equal(Number(secondCount) / Number(secondPopulation), 0.15);
  assert.match(households.choices[households.answer], /increased by 20%.*decreased from 20% to 15%/);
});
