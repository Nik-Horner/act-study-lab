import { test } from "node:test";
import assert from "node:assert/strict";
import science from "../src/content/science-questions.json";
import reading from "../src/content/reading-questions.json";
import review from "../docs/science-reading-content-review.json";
import activities from "../src/content/lesson-activities.json";

const all = [...science, ...reading];
function question(id: string) {
  const item = all.find((item) => item.id === id);
  assert(item, id);
  return item;
}

test("reviewed content preserves the historical grading contract for every original item", () => {
  const original = [
    ...science.filter((item) => !("standards" in item)),
    ...reading.filter((item) => item.id.startsWith("RE-")),
  ];
  assert.equal(original.length, 344);
  assert.deepEqual(
    new Set(review.items.map((item) => item.id)),
    new Set(original.map((item) => item.id)),
  );
  for (const previous of review.items) {
    const current = question(previous.id);
    assert.equal(current.answer, previous.answerIndex, current.id);
    assert.equal(
      current.choices[current.answer],
      previous.answerText,
      current.id,
    );
  }
});

test("the bird cue question has only one design with identical model predictions", () => {
  const item = question("science-conflicting-viewpoints-16");
  const predictions = item.choices.map((choice) => {
    if (/both cues to east/.test(choice)) return ["east", "east"];
    if (/only the magnetic field west/.test(choice)) return ["west", "north"];
    if (/only the star display west/.test(choice)) return ["north", "west"];
    if (/only the magnetic field east/.test(choice)) return ["east", "north"];
    assert.fail(`Unreviewed cue manipulation: ${choice}`);
  });
  assert.deepEqual(
    predictions.flatMap(([magnetic, stars], index) =>
      magnetic === stars ? [index] : [],
    ),
    [item.answer],
  );
});

test("the lens task distinguishes all fitting rows from partially true alternatives", () => {
  const item = question("science-models-evidence-19");
  const rows = item.passage.table!.rows.filter(([u]) => u !== 20);
  const fitting = rows.filter(([u, v]) => {
    assert.equal(typeof u, "number");
    assert.equal(typeof v, "number");
    return Math.abs(1 / Number(u) + 1 / Number(v) - 1 / 10) < 1e-10;
  });
  assert.equal(fitting.length, 3);
  assert.match(item.questionText, /all of the other three rows/);
  assert.equal(item.choices[item.answer], "All three other rows");
  for (const [index, choice] of item.choices.entries())
    if (index !== item.answer) assert.match(choice, /^Only the u =/);
});

test("the seat-count task offers three measured quantities against one unmeasured visitor count", () => {
  const item = question("RE-1-11");
  const rows = item.passage.table!.rows;
  assert.deepEqual(rows, [
    ["Noon", 6, 8],
    ["4 p.m.", 8, 17],
  ]);
  assert.equal(
    item.choices[item.answer],
    "How many distinct people used the library",
  );
  assert.deepEqual(
    item.choices.filter((_, index) => index !== item.answer),
    [
      "How many seats were occupied at the counted times",
      "Whether noon and afternoon counts differed",
      "Whether average afternoon occupancy increased after the area opened",
    ],
  );
});

test("the droplet task specifies the retained component so the two-factor comparison cannot compete", () => {
  const item = question("science-conflicting-viewpoints-29");
  assert.match(item.questionText, /leaving solid ash present/);
  assert.match(item.choices[item.answer], /Removing droplets/);
  const values = new Map(
    item.passage.table!.rows.map(([label, value]) => [label, Number(value)]),
  );
  const untreated = values.get("Neither component removed")!;
  assert.equal(values.get("Droplets removed")! - untreated, 10);
  assert.equal(values.get("Both removed")! - values.get("Solids removed")!, 20);
});

test("Reading forms give specific evidence and address their competing interpretations", () => {
  const heldOut = reading.filter((item) => item.id.startsWith("RE-"));
  assert.equal(heldOut.length, 72);
  for (const item of heldOut) {
    assert(
      !item.explanation.includes("Reject choices that change the stated facts"),
      item.id,
    );
    assert(!item.explanation.includes("The supported answer is"), item.id);
    assert(item.explanation.length > 200, item.id);
  }
  const music = heldOut.filter(
    (item) => item.passage.id === "reading-form-2-p1",
  );
  assert.equal(music.length, 9);
  assert(music.every((item) => !item.passage.context.includes("our aunt")));
});

test("all reviewed formative applications preserve their section and correct-answer contracts", () => {
  const reviewed = review.formativeReview.items;
  assert.equal(reviewed.length, 85);
  assert.equal(new Set(reviewed.map((item) => item.id)).size, 85);
  for (const previous of reviewed) {
    const [slug, position] = previous.id.split(":");
    const activity =
      activities[slug as keyof typeof activities][Number(position)];
    assert(activity, previous.id);
    assert.equal(activity.answer, previous.answerIndex, previous.id);
    assert.equal(
      activity.choices[activity.answer],
      previous.answerText,
      previous.id,
    );
    assert.equal(
      new Set(activity.choices).size,
      activity.choices.length,
      previous.id,
    );
  }
});

test("formative Science keeps quantitative denominators and the newly explicit control conditions", () => {
  const answer = (slug: keyof typeof activities, position: number) => {
    const activity = activities[slug][position];
    return activity.choices[activity.answer];
  };
  assert.equal(answer("science-data-reading", 1), `${((50 - 20) / 50) * 100}%`);
  assert.equal(answer("science-data-reading", 6), `${8 * 5} mg/L`);
  assert.equal(
    answer("science-models-evidence", 4),
    `It halves from ${255 - 5} to ${130 - 5}`,
  );
  assert.equal(answer("science-scientific-foundations", 3), String(9 + 4));
  assert.match(
    activities["science-data-reading"][6].evidenceText,
    /final diluted-mixture volume divided by the sample volume/,
  );
  assert.match(
    activities["science-experimental-design"][2].evidenceText,
    /equal water volumes/,
  );
  assert.match(
    activities["science-conflicting-viewpoints"][6].explanation,
    /necessity and sufficiency are distinct/,
  );
});
