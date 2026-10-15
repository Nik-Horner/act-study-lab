import { test } from "node:test";
import assert from "node:assert/strict";
import reading from "../src/content/reading-practice.json";
import science from "../src/content/science-questions.json";
const byId = new Map(reading.map((q) => [q.id, q]));
const clean = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

test("rewritten Reading vocabulary questions quote language actually present in their final source", () => {
  for (const id of ["RP-V3-01-4", "RP-V3-05-4", "RP-V3-15-4"]) {
    const q = byId.get(id)!;
    const quoted = q.questionText.match(/“([^”]+)”/u)![1];
    assert(
      clean(q.passage.context).includes(clean(quoted)),
      `${id}: missing source quotation`,
    );
  }
  const first = byId.get("RP-V3-01-4")!;
  assert.equal(first.choices[first.answer], "firmly fastened");
  const door = byId.get("RP-V3-05-4")!;
  assert.equal(door.choices[door.answer], "allowing them to move");
});

test("revised narrative lead-ins and all four phrase-function options have parallel grammar", () => {
  assert.match(byId.get("RP-V3-01-1")!.questionText, /^Which description/);
  for (const id of ["RP-V3-05-1", "RP-V3-15-1"]) {
    const q = byId.get(id)!;
    assert.match(q.questionText, /as she:$/);
    for (const choice of q.choices)
      assert.match(choice, /^(moves|discovers|replaces|accepts|makes)\b/, id);
  }
  for (const choice of byId.get("RP-V3-15-5")!.choices)
    assert.match(
      choice,
      /^the /,
      "only the right option must not fit the lead-in grammatically",
    );
});

test("the new tone checks preserve the supported attitudes with source-bound competing interpretations", () => {
  const relay = byId.get("RP-V3-15-7")!;
  assert.match(
    relay.passage.context,
    /asked Leah what it had looked like from behind/,
  );
  assert.match(
    relay.passage.context,
    /reached for its strap while she listened/,
  );
  assert.match(relay.choices[relay.answer], /^tentatively receptive/);
  assert(
    relay.choices.some((choice) =>
      choice.includes("neutral report for the coach"),
    ),
  );
  const letter = byId.get("RP-V3-22-7")!;
  assert.match(letter.passage.context, /another tidy explanation/);
  assert.match(letter.choices[letter.answer], /^self-scrutinizing/);
  assert(
    letter.choices.some((choice) =>
      choice.includes("sister’s practical question"),
    ),
  );
});

test("new Reading choices do not make the correct response consistently identifiable by length", () => {
  const questions = reading.filter((q) => q.id.startsWith("RP-V3-"));
  const countWords = (text: string) => text.trim().split(/\s+/).length;
  const strictlyLongest = questions.filter(
    (q) =>
      countWords(q.choices[q.answer]) >
      Math.max(...q.choices.filter((_, i) => i !== q.answer).map(countWords)),
  ).length;
  assert(
    strictlyLongest < questions.length * 0.6,
    "a majority of questions should not reward the longest-choice shortcut",
  );
  const positionCounts = [0, 1, 2, 3].map(
    (index) => questions.filter((q) => q.answer === index).length,
  );
  assert(Math.max(...positionCounts) - Math.min(...positionCounts) <= 3);
});

test("the direct Science mode-versus-majority check is labeled medium and retains its actual counts", () => {
  const q = science.find((q) => q.id === "science-group-response-v3-33")!;
  assert.equal(q.difficulty, "medium");
  const rows = q.passage.table!.rows;
  const total = rows.reduce((sum, row) => sum + Number(row[1]), 0);
  const mode = rows.reduce((a, b) => (Number(a[1]) > Number(b[1]) ? a : b));
  assert.equal(mode[0], "East");
  assert.equal(Number(mode[1]), 19);
  assert.equal(total, 40);
  assert(Number(mode[1]) < total / 2);
  assert.match(q.choices[q.answer], /most common.*fewer than half/);
});

test("Reading worked structure and quoted-response methods use actual text rather than an editorial synopsis", async () => {
  const { default: lessons } =
    await import("../src/content/reading-lessons.json");
  const craft = lessons.find((lesson) => lesson.slug === "reading-craft")!;
  const structure =
    craft.sections[0].examples[0].text.split("\n\nQuestion:")[0];
  assert(structure.split("\n\n").length >= 3);
  assert.match(structure, /Rafi/);
  assert.doesNotMatch(structure, /The article first|final paragraph/);
  const quoted = craft.sections[3].examples[0].text.split("\n\nQuestion:")[0];
  assert.match(quoted, /“Machines have made the hand unnecessary,”/);
  assert.match(quoted, /adjusted the feed wheel by touch/);
  assert.doesNotMatch(quoted, /The essay repeats|It ends by asking/);
});

test("Reading worked inferences identify an actual evidentiary bridge rather than inventing a motive", async () => {
  const { default: lessons } =
    await import("../src/content/reading-lessons.json");
  const inference = lessons.find(
    (lesson) => lesson.slug === "reading-inference",
  )!.sections[0].examples[0].text;
  assert.match(inference, /kept looking at the page/);
  assert.match(
    inference,
    /remains at least partly so she can return the fallen page/,
  );
  const craft = lessons.find((lesson) => lesson.slug === "reading-craft")!
    .sections[6].examples[0].text;
  assert.match(craft, /I wanted a more cooperative answer/);
  assert.match(craft, /I was laughing/);
});

test("Reading formative tasks use different contexts and operations from their worked examples", async () => {
  const { default: activities } =
    await import("../src/content/lesson-activities.json");
  const contrast = activities["reading-vocabulary"][2];
  assert.match(contrast.prompt, /deferred/);
  assert.doesNotMatch(JSON.stringify(contrast), /ornate|spare|two lines/);
  const figurative = activities["reading-vocabulary"][3];
  assert.match(JSON.stringify(figurative), /brake/);
  assert.doesNotMatch(JSON.stringify(figurative), /haunted the project/);
  const limits = activities["reading-integration"][4];
  assert.match(JSON.stringify(limits), /echo/);
  assert.doesNotMatch(JSON.stringify(limits), /adults|teenagers/);
  const scope = activities["reading-main-idea"][3];
  assert.doesNotMatch(
    JSON.stringify(scope),
    /transit pilot|financial sustainability/,
  );
});
