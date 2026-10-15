import { test } from "node:test";
import assert from "node:assert/strict";
import catalog from "../src/content/reading-science-skills.json";
import questions from "../src/content/science-questions.json";
import teaching from "../src/content/science-teaching-passages.json";
import activities from "../src/content/lesson-activities.json";
import { getLesson } from "../src/lib/act/content";
import { focusLesson, type LearningSkill } from "../src/lib/learning-skills";
import type { Passage } from "../src/lib/act/types";

const science = catalog.filter((skill) =>
  skill.topic.startsWith("science-"),
) as LearningSkill[];
const byId = new Map(science.map((skill) => [skill.id, skill]));
function skill(suffix: string) {
  const result = byId.get(`science-${suffix}`);
  assert(result, suffix);
  return result;
}
function evidence(suffix: string) {
  return skill(suffix).evidence![0];
}
function worked(suffix: string) {
  const source = skill(suffix);
  return focusLesson(getLesson(source.topic), source)
    .sections.flatMap((section) => section.examples ?? [])
    .map((example) => example.text)
    .join("\n");
}
function rows(suffix: string) {
  const table = evidence(suffix).table;
  assert(table, suffix);
  return table.rows;
}
function checkEvidence(passage: Passage) {
  assert(passage.id && passage.title && passage.context);
  assert(passage.table || passage.graph, passage.id);
  if (passage.table) {
    assert(passage.table.columns.length >= 2, passage.id);
    for (const row of passage.table.rows)
      assert.equal(row.length, passage.table.columns.length, passage.id);
  }
  if (passage.graph) {
    const graph = passage.graph;
    assert(graph.xLabel && graph.yLabel && graph.series.length, passage.id);
    for (const series of graph.series) {
      assert(series.label && series.points.length >= 2, passage.id);
      for (const [i, [x, y]] of series.points.entries()) {
        assert(Number.isFinite(x) && Number.isFinite(y), passage.id);
        if (i) assert(x > series.points[i - 1][0], passage.id);
        if (graph.yRange)
          assert(y >= graph.yRange[0] && y <= graph.yRange[1], passage.id);
      }
    }
  }
}

test("all 52 Science Daily methods show matching worked evidence and a separate visible try", () => {
  assert.equal(science.length, 52);
  const bankIds = new Set(questions.map((question) => question.passage.id));
  const teachingIds = new Set<string>();
  for (const source of science) {
    const focused = focusLesson(getLesson(source.topic), source);
    const shown = focused.sections.flatMap((section) => section.evidence ?? []);
    assert.equal(shown.length, 1, source.id);
    assert.deepEqual(shown, source.evidence, source.id);
    const task = focused.sections.at(-1)!.activity;
    assert(task?.evidence, source.id);
    assert.notEqual(task.evidence.id, shown[0].id, source.id);
    assert.notDeepEqual(
      { table: shown[0].table, graph: shown[0].graph },
      { table: task.evidence.table, graph: task.evidence.graph },
      `${source.id}: a new task needs new evidence`,
    );
    for (const passage of [shown[0], task.evidence]) {
      checkEvidence(passage);
      assert(!bankIds.has(passage.id), source.id);
      assert(!teachingIds.has(passage.id), passage.id);
      teachingIds.add(passage.id);
    }
    const explanation = worked(source.id.slice("science-".length));
    assert.match(explanation, /^Question:/, source.id);
    assert.match(explanation, /\n1\. .+\n2\. /, source.id);
    assert.match(explanation, /Supported answer: .+/, source.id);
    assert.match(explanation, /Watch for: .+/, source.id);
    assert(source.tip && source.tip.split(/\s+/).length <= 20, source.id);
    assert(source.body!.join(" ").split(/\s+/).length <= 65, source.id);
  }
});

test("reading a graph and estimating between points are taught on real graphs", () => {
  for (const suffix of [
    "data-reading-locate",
    "data-reading-rates",
    "trends-interpolation-interpolate",
    "trends-interpolation-interval-rates",
    "trends-interpolation-tested-range",
    "trends-interpolation-turning-plateau",
    "scientific-foundations-heat-phase",
  ])
    assert(evidence(suffix).graph, suffix);

  const graph = evidence("data-reading-locate").graph!;
  const u = graph.series.find((series) => series.label === "U")!;
  const v = graph.series.find((series) => series.label === "V")!;
  assert.equal(v.points.find(([day]) => day === 2)![1], 7);
  assert.equal(u.points.find(([day]) => day === 2)![1], 5);
  assert.match(worked("data-reading-locate"), /Supported answer: 7 cm/);
  assert.match(worked("data-reading-locate"), /5 cm is Group U/);

  const [left, right] = evidence("trends-interpolation-interpolate").graph!
    .series[0].points;
  const atSix =
    left[1] + ((6 - left[0]) / (right[0] - left[0])) * (right[1] - left[1]);
  assert.equal(atSix, 38);
  assert.match(worked("trends-interpolation-interpolate"), /38°C/);
  const activity = skill("trends-interpolation-interpolate").activity!;
  const [a, b] = activity.evidence!.graph!.series[0].points;
  assert.equal((a[1] + b[1]) / 2, 40);
  assert.equal(activity.choices[activity.answer], "40°C");
});

test("model and acidity worked explanations use the numbers actually displayed", () => {
  const model = evidence("models-evidence-substitution");
  assert.match(model.context, /y = 5t − 2/);
  const [t, measured] = model.table!.rows.at(-1)! as number[];
  assert.equal(t, 4);
  assert.equal(measured - (5 * t - 2), 2);
  assert.match(worked("models-evidence-substitution"), /20 − 18 = 2/);
  const reference = teaching.find(
    (item) => item.id === "science-teaching-models-evidence-1",
  )!;
  assert.deepEqual(reference.table, model.table);
  assert.equal(reference.context, model.context);

  const ph = rows("scientific-foundations-acidity") as number[][];
  assert.equal(Math.min(...ph.map(([pH]) => pH)), 4);
  assert.deepEqual(
    ph.reduce((a, b) => (a[1] > b[1] ? a : b)),
    [6, 7],
  );
  assert.match(
    worked("scientific-foundations-acidity"),
    /Most acidic: pH 4. Most product: pH 6/,
  );
  assert.deepEqual(
    teaching.find(
      (item) => item.id === "science-teaching-scientific-foundations-1",
    )!.table!.rows,
    ph,
  );
});

test("worked and new quantitative tasks keep their own denominators and units", () => {
  const concentrations = rows("data-reading-changes").map((row) =>
    Number(row[1]),
  );
  assert.equal(
    (concentrations[0] - concentrations[1]) / concentrations[0],
    0.75,
  );
  assert.match(worked("data-reading-changes"), /75% removed/);
  const streams = rows("data-reading-mixing");
  const massFlow = streams.reduce(
    (sum, row) => sum + Number(row[1]) * Number(row[2]),
    0,
  );
  const waterFlow = streams.reduce((sum, row) => sum + Number(row[1]), 0);
  assert.equal(massFlow / waterFlow, 5);
  const calibration = evidence("data-reading-calibration");
  const carried = calibration.table!.rows.map((row) => {
    const curve = calibration.graph!.series.find(
      (series) => series.label === row[1],
    )!;
    const concentration = curve.points.find(
      ([, signal]) => signal === row[2],
    )![0];
    const newFlow = Number(row[4]) / (row[0] === "A" ? 2 : 1);
    return concentration * Number(row[3]) * newFlow;
  });
  assert.deepEqual(carried, [24, 24]);
  assert.match(
    worked("data-reading-calibration"),
    /graph already includes the blank/,
  );

  const effects = rows("experimental-design-interaction").map(
    (row) => Number(row[2]) - Number(row[1]),
  );
  assert.deepEqual(effects, [3, 2]);
  assert.match(
    worked("experimental-design-interaction"),
    /1 mm larger when cool/,
  );

  const directions = rows("conflicting-viewpoints-group-response");
  const total = directions.reduce((sum, row) => sum + Number(row[1]), 0);
  const largest = Math.max(...directions.map((row) => Number(row[1])));
  assert(largest < total / 2);
  assert.equal(largest / total, 0.4);
  assert.match(worked("conflicting-viewpoints-group-response"), /mode only/);

  const raw = rows("models-evidence-background").map((row) => Number(row[1]));
  const corrected = raw.map((value) => value - 10);
  assert.deepEqual(corrected, [300, 150, 75]);
  assert.equal(corrected.at(-1)! / 2 + 10, 47.5);
  const activity = skill("models-evidence-reciprocal").activity!;
  const [f, u] = activity.evidence!.table!.rows[0] as number[];
  assert.equal(activity.choices[activity.answer], `${(f * u) / (u - f)} cm`);
});

test("the repaired transfer steps teach the exact prerequisite operations before drills", () => {
  const heat = evidence("data-reading-supplied-model");
  const rises = heat.table!.rows.map(
    (row) => Number(row[1]) / (Number(row[2]) * 4),
  );
  assert.deepEqual(rises, [2, 1]);
  assert.match(worked("data-reading-supplied-model"), /800 ÷ \(100 × 4\) = 2/);

  const nonlinear = evidence("trends-interpolation-nonlinear").graph!;
  const [[t, x]] = nonlinear.series[0].points;
  const k = x ** 2 / t;
  assert.equal(k, 9);
  assert(
    nonlinear.series[0].points.every(
      ([time, distance]) => distance ** 2 === k * time,
    ),
  );
  assert.match(
    worked("trends-interpolation-nonlinear"),
    /k = x²\/t = 3²\/1 = 9/,
  );
  assert.match(
    worked("trends-interpolation-nonlinear"),
    /x² against time, not x against time/,
  );

  const combined = evidence("models-evidence-combined-experiments");
  assert(
    combined.graph!.series.every((series) =>
      series.points.every(([, density]) => density === 10),
    ),
  );
  const low = combined.table!.rows.find(([nutrients]) => nutrients === "Low")!;
  assert.equal(low[1], low[2]);
  assert.match(
    worked("models-evidence-combined-experiments"),
    /density condition holds/,
  );
  assert.match(
    worked("models-evidence-combined-experiments"),
    /same new nutrient level/,
  );
  assert.match(
    skill("scientific-foundations-inheritance").body!.join(" "),
    /one dominant allele.*two recessive alleles/,
  );
  assert.match(
    skill("scientific-foundations-relative-order").body!.join(" "),
    /unbroken layer deposited over a fault formed after/,
  );
  assert.match(
    skill("experimental-design-interaction").body!.join(" "),
    /both control and treatment/,
  );
});

test("all reference activities have visible new evidence and starlight remains readable", () => {
  let count = 0;
  for (const [topic, items] of Object.entries(activities)) {
    if (!topic.startsWith("science-")) continue;
    for (const item of items) {
      const activity = item as { evidence?: Passage };
      assert(activity.evidence, topic);
      checkEvidence(activity.evidence);
      count++;
    }
  }
  assert.equal(count, 43);
  for (const passage of teaching) checkEvidence(passage as Passage);
  const starQuestions = questions.filter(
    (question) => question.passage.id === "science-drill-transit",
  );
  assert.equal(starQuestions.length, 5);
  for (const question of starQuestions) {
    const graph = question.passage.graph!;
    assert.deepEqual(graph.yRange, [94, 100]);
    assert(
      graph.series.every((series) =>
        series.points.every(([, y]) => y >= 94 && y <= 100),
      ),
    );
  }
  const comparison = questions.find(
    (question) => question.id === "science-conflicting-viewpoints-25",
  )!;
  assert.doesNotMatch(comparison.questionText, /makes.*percentages comparable/);
  assert.match(
    comparison.explanation,
    /percentages can also compare unequal sample sizes/,
  );
});
