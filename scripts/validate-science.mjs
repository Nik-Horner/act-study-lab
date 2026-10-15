import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
const content = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../src/content",
    );
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(content, `${name}.json`), "utf8"));
const topics = read("science-topics");
const lessons = read("science-lessons");
const questions = read("science-questions");
const legacyChecks = read("science-legacy-checks");
const exams = read("science-exams");
const checks = lessons.flatMap((l) => l.check);
const all = [...questions, ...checks, ...legacyChecks];
const byId = new Map(all.map((q) => [q.id, q]));
assert.equal(topics.length, 6);
assert.equal(lessons.length, 6);
assert.equal(questions.length, 283);
assert.equal(checks.length, 18);
assert.equal(
  byId.size,
  319,
  "Active and historical question IDs must be unique.",
);
const allowed = new Set(topics.map((t) => t.slug));
const passages = new Map();
for (const q of all) {
  assert.equal(q.subject, "science", q.id);
  assert(allowed.has(q.topic), `Unknown topic: ${q.id}`);
  assert(["easy", "medium", "hard"].includes(q.difficulty), q.id);
  assert(q.stem && q.questionText && q.explanation, q.id);
  assert.equal(q.choices.length, 4, q.id);
  assert.equal(new Set(q.choices).size, 4, `Duplicate option: ${q.id}`);
  assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3, q.id);
  const p = q.passage;
  assert(p?.id && p.title && p.context, `Missing passage: ${q.id}`);
  assert(p.table || p.graph, `Missing structured evidence: ${q.id}`);
  const encoded = JSON.stringify(p);
  if (passages.has(p.id))
    assert.equal(
      encoded,
      passages.get(p.id),
      `Inconsistent shared passage: ${p.id}`,
    );
  else passages.set(p.id, encoded);
  if (p.table) {
    assert(p.table.columns.length >= 2, p.id);
    for (const row of p.table.rows) {
      assert.equal(row.length, p.table.columns.length, `Table shape: ${p.id}`);
      for (const value of row)
        assert(
          typeof value === "string" ||
            (typeof value === "number" && Number.isFinite(value)),
          p.id,
        );
    }
  }
  if (p.graph) {
    assert(p.graph.title && p.graph.xLabel && p.graph.yLabel, p.id);
    assert(p.graph.series.length > 0, p.id);
    for (const s of p.graph.series) {
      assert(s.label && s.points.length >= 2, p.id);
      for (const [i, pair] of s.points.entries()) {
        assert.equal(pair.length, 2, p.id);
        assert(pair.every(Number.isFinite), p.id);
        if (i) assert(pair[0] > s.points[i - 1][0], `Graph x order: ${p.id}`);
      }
    }
  }
}
for (const t of topics) {
  assert.equal(
    questions.filter(
      (q) => q.topic === t.slug && !q.id.startsWith("science-exam"),
    ).length,
    {
      "science-data-reading": 33,
      "science-experimental-design": 35,
      "science-models-evidence": 34,
      "science-scientific-foundations": 37,
    }[t.slug] ?? 32,
    t.slug,
  );
  const l = lessons.find((l) => l.slug === t.slug);
  assert(l?.intro && l.title, t.slug);
  assert(l.sections.length >= 6 && l.sections.length <= 8, t.slug);
  assert.equal(l.check.length, 3, t.slug);
  for (const section of l.sections)
    assert(
      section.heading.trim() &&
        section.body.length > 0 &&
        section.body.every((paragraph) => paragraph.trim()),
      `${l.slug}: missing concept or teaching method`,
    );
  assert(
    questions.filter(
      (q) =>
        q.topic === t.slug &&
        !q.id.startsWith("science-exam") &&
        q.difficulty === "hard",
    ).length >= 2,
    `Hard drills: ${t.slug}`,
  );
  for (const q of l.check) assert.equal(q.topic, t.slug, q.id);
}
assert.equal(exams.length, 2);
assert.equal(exams[0].id, "science-1");
assert.equal(exams[1].id, "science-2");
for (const [i, exam] of exams.entries()) {
  assert.equal(exam.minutes, 40);
  assert.equal(exam.questionIds.length, 40);
  assert.equal(new Set(exam.questionIds).size, 40);
  for (const id of exam.questionIds)
    assert(id.startsWith(`science-exam-${i + 1}-`) && byId.has(id), id);
  assert.equal(
    new Set(exam.questionIds.map((id) => byId.get(id).passage.id)).size,
    7,
  );
  const answerCounts = [0, 1, 2, 3].map(
    (a) => exam.questionIds.filter((id) => byId.get(id).answer === a).length,
  );
  assert.deepEqual(
    answerCounts,
    [10, 10, 10, 10],
    `Balanced section options: ${exam.id}`,
  );
}
assert.equal(new Set(exams.flatMap((e) => e.questionIds)).size, 80);
assert.equal(
  new Set(questions.map((q) => q.stem)).size,
  283,
  "Full-exam stems must not duplicate drill stems.",
);
const drillPassageIds = new Set(
  questions
    .filter((q) => !q.id.startsWith("science-exam"))
    .map((q) => q.passage.id),
);
const examPassageIds = new Set(
  questions
    .filter((q) => q.id.startsWith("science-exam"))
    .map((q) => q.passage.id),
);
assert.equal(drillPassageIds.size, 58);
assert.equal(examPassageIds.size, 14);
for (const id of examPassageIds)
  assert(!drillPassageIds.has(id), `Exam passage reused in drills: ${id}`);
// Cross-check the numeric evidence that is presented both as a table and graph.
const p = (id) => [...byId.values()].find((q) => q.passage.id === id).passage;
for (const [id, xColumn, yColumns] of [
  ["science-exam-salinity", 0, [1, 2]],
  ["science-exam-battery", 0, [1]],
  ["science-exam-stream", 0, [1, 2]],
]) {
  const passage = p(id);
  for (const [seriesIndex, col] of yColumns.entries())
    assert.deepEqual(
      passage.graph.series[seriesIndex].points,
      passage.table.rows.map((row) => [row[xColumn], row[col]]),
      `Table/graph mismatch: ${id}`,
    );
}
assert.deepEqual(
  p("science-exam-algae").graph.series[0].points,
  p("science-exam-algae")
    .table.rows.filter((r) => r[0] === 1)
    .map((r) => [r[1], r[3]]),
);
const beads = p("science-exam-beads");
assert.equal(
  beads.graph.series[0].points.find(([r]) => r === 0.2)[1],
  beads.table.rows[0][2],
);
assert.equal(
  beads.graph.series[0].points.find(([r]) => r === 0.4)[1],
  beads.table.rows[0][3],
);
// Independently calculate quantitative answers, then verify the keyed option.
const answerText = (id) => {
  const q = byId.get(id);
  return q.choices[q.answer];
};
const keyed = (id, text) =>
  assert.equal(answerText(id), text, `Quantitative answer: ${id}`);
keyed("science-data-reading-2", `${(40 - 8) / 8}/5`);
keyed("science-data-reading-6", "L"); // 2*20=40 > 2*12=24, 3*10=30, 4*8=32.
keyed("science-data-reading-7", "J"); // 12/10 > 10/15, 20/20, 8/25.
keyed("science-trends-interpolation-1", `${(58 + 50) / 2}°C`);
keyed(
  "science-trends-interpolation-3",
  `${10 + ((40 - 35) / (40 - 30)) * 5} min`,
);
keyed("science-trends-interpolation-6", `${(18 + 23) / 2} g per 100 g`);
keyed("science-models-evidence-2", `${2 * 3.5} cm`);
keyed("science-models-evidence-4", `${100 * 2 ** 3}`);
keyed("science-models-evidence-6", `${12.5 / 2} units`);
keyed("science-scientific-foundations-2", `${10 ** (6 - 4)} times as great.`);
keyed("science-scientific-foundations-6", `${6 / 0.3} Ω`);
keyed("science-scientific-foundations-7", `${8 / (2 * 20)} A`);
keyed("science-exam-1-03", `${(70 + 40) / 2}%`);
keyed("science-exam-1-09", `${(0.8 / 2).toFixed(2)} mm/s`);
keyed("science-exam-1-14", `${10 + 9} mg`);
keyed("science-exam-1-26", `${2 / 0.5} h`);
keyed("science-exam-1-27", `${((1.5 + 2) / 2).toFixed(2)} Ah`);
keyed("science-exam-1-32", `${120 / (6 - 2)} m/min`);
keyed("science-exam-1-33", `${(4.5 - 0.5).toFixed(1)} mg/L`);
keyed("science-exam-1-36", `${(50 / 1000) * 100}%`);
keyed("science-exam-1-37", `${Math.round((850 / (850 + 50)) * 100)}%`);
keyed("check-science-data-1", `${40 - 12} mg/L`);
keyed("check-science-trends-1", `${(56 + 40) / 2}°C`);
keyed("check-science-model-1", `${100 * 2 ** 4}`);
keyed("check-science-model-2", `${50 - 25}`);
keyed("check-science-foundation-2", `${(5 / 20).toFixed(2)} A`);

const rows = (id) => p(id).table.rows;
const points = (id, i = 0) => p(id).graph.series[i].points;
const maxRow = (arr, column) =>
  arr.reduce((a, b) => (a[column] > b[column] ? a : b));
const minRow = (arr, column) =>
  arr.reduce((a, b) => (a[column] < b[column] ? a : b));
const chrom = rows("science-drill-chromatography");
keyed("science-data-reading-8", maxRow(chrom.slice(0, 3), 1)[0]);
keyed("science-data-reading-9", (chrom[1][1] / chrom[1][2]).toFixed(2));
keyed("science-data-reading-11", `${(chrom[1][1] / chrom[1][2]) * 80} mm`);
const tr = rows("science-drill-transects");
keyed("science-data-reading-13", maxRow(tr, 4)[0]);
keyed(
  "science-data-reading-14",
  maxRow(
    tr.map((r) => [r[0], r[4] / r[1]]),
    1,
  )[0],
);
assert.equal(tr[1][3] / (tr[1][2] + tr[1][3]), 2 / 5);
keyed("science-data-reading-15", "2/5");
assert.deepEqual(
  tr.filter((r) => r[5] < 60 && r[3] / r[1] >= 0.8).map((r) => r[0]),
  ["O"],
);
keyed("science-data-reading-16", "O only");
const h = points("science-drill-transit"),
  j = points("science-drill-transit", 1);
keyed(
  "science-data-reading-19",
  `${h.find(([x]) => x === 3)[1] - j.find(([x]) => x === 3)[1]}`,
);
assert.equal(100 - Math.min(...j.map((x) => x[1])), 5);
keyed("science-data-reading-20", "J: a 5 percentage-point decrease");
keyed(
  "science-data-reading-21",
  `${h.filter(([x, y]) => y < 100 && j.find((a) => a[0] === x)[1] === 100)[0][0]} h`,
);
const heat = rows("science-drill-calorimeter");
keyed("science-data-reading-24", `${20 + heat[1][2]}°C`);
for (const r of heat) assert.equal(r[1] * r[2], 150);
keyed("science-data-reading-25", "150 g·°C");
assert.equal(heat[2][2] / heat[0][2], 1 / 3);
keyed("science-data-reading-26", "It is one-third as large.");
keyed("science-data-reading-27", `${1200 / (heat[1][1] * 4)}°C`);
const riv = rows("science-drill-confluence");
keyed("science-data-reading-29", maxRow(riv, 2)[0]);
assert.equal(riv[0][1] * riv[0][2], riv[1][1] * riv[1][2]);
keyed("science-data-reading-30", "A had the same amount.");
assert.equal(
  (riv[0][1] * riv[0][2] + riv[1][1] * riv[1][2]) / riv[2][1],
  riv[2][2],
);
const depth = points("science-drill-pressure-depth");
keyed(
  "science-trends-interpolation-8",
  `${(depth[1][1] + depth[2][1]) / 2} kPa`,
);
keyed(
  "science-trends-interpolation-9",
  `${(depth[1][1] - depth[0][1]) / (depth[1][0] - depth[0][0])} kPa/m`,
);
keyed("science-trends-interpolation-11", `${(150 - depth[0][1]) / 10} m`);
const high = points("science-drill-food-growth", 1),
  low = points("science-drill-food-growth");
keyed("science-trends-interpolation-14", `${(high[2][1] + high[3][1]) / 2}`);
assert.deepEqual(
  high.slice(1).map((r, i) => r[1] - high[i][1]),
  [30, 40, 40, 20],
);
keyed("science-trends-interpolation-15", "Days 2–4 and 4–6, tied");
assert.deepEqual(
  high.map((r, i) => r[1] - low[i][1]),
  [0, 10, 30, 60, 80],
);
const diff = points("science-drill-diffusion");
for (const [x, y] of diff.slice(1)) assert.equal((y * y) / x, 4);
keyed("science-trends-interpolation-19", `${Math.sqrt(4 * 6.25)} mm`);
keyed("science-trends-interpolation-20", `${(diff[2][1] + diff[3][1]) / 2} mm`);
keyed(
  "science-trends-interpolation-21",
  `${diff[5][0] - diff[4][0] - (diff[2][0] - diff[1][0])} min`,
);
const sol = rows("science-drill-solubility");
keyed("science-trends-interpolation-23", `${(sol[2][1] + sol[3][1]) / 2} g`);
keyed("science-trends-interpolation-24", `${sol[3][0]}–${sol[4][0]}°C`);
keyed("science-trends-interpolation-26", `${sol[3][1] - sol[1][1]} g`);
const exp = points("science-drill-exposure");
keyed("science-trends-interpolation-29", `${(exp[2][0] + exp[3][0]) / 2} s`);
assert(
  (exp[1][1] - exp[0][1]) / (exp[1][0] - exp[0][0]) >
    (exp[5][1] - exp[4][1]) / (exp[5][0] - exp[4][0]),
);
keyed(
  "science-trends-interpolation-30",
  "The average signal-change rate is greater in the first interval.",
);
const er = rows("science-drill-erosion");
assert.equal(er[2][1] - er[1][1], 8);
keyed(
  "science-experimental-design-27",
  "Straw yielded 8 g less dry eroded sediment on average.",
);
const pend = rows("science-drill-pendulum");
for (const [L, T] of pend) assert.equal(2 * Math.sqrt(L), T);
keyed("science-models-evidence-9", `${2 * Math.sqrt(1.44)} s`);
assert.equal((2 * Math.sqrt(4)) / 2, 2);
keyed("science-models-evidence-10", "2.");
keyed(
  "science-models-evidence-11",
  `${
    maxRow(
      pend.map(([L, T]) => [L, Math.abs(2 * L - T)]),
      1,
    )[0]
  } m`,
);
const ads = rows("science-drill-adsorption");
for (const [C, q] of ads) assert(Math.abs((4 * C) / (1 + C) - q) < 0.005);
keyed("science-models-evidence-14", `${4 * ads[2][0] - ads[2][1]} mg/g`);
keyed("science-models-evidence-15", `${(4 * 9) / (1 + 9)} mg/g`);
const lens = rows("science-drill-lens");
for (const [u, v] of lens) assert(Math.abs(1 / u + 1 / v - 1 / 10) < 1e-12);
keyed(
  "science-models-evidence-18",
  `${1 / (1 / lens[1][0] + 1 / lens[1][1])} cm`,
);
keyed(
  "science-models-evidence-20",
  `About ${(1 / (1 / 10 - 1 / 40)).toFixed(1)} cm`,
);
const de = rows("science-drill-decay");
keyed("science-models-evidence-23", `${de[2][1] - 20} counts/min`);
assert.deepEqual(
  de.map((r) => r[1] - 20),
  [800, 400, 200, 100],
);
keyed("science-models-evidence-25", `${(de[3][1] - 20) / 2 + 20} counts/min`);
assert.equal((de[3][1] - 20) / (de[0][1] - 20), 1 / 8);
keyed("science-models-evidence-26", "1/8");
const comp = rows("science-drill-competition-model");
keyed("science-models-evidence-28", `${comp[1][2]} cells/mL`);
keyed(
  "science-models-evidence-30",
  `${comp[0][1] + comp[1][2] - comp[2][1] - comp[2][2]} cells/mL`,
);
const oxy = rows("science-drill-leaf-oxygen");
keyed("science-scientific-foundations-9", `+${oxy[0][3] - 8} mg/L`);
keyed(
  "science-scientific-foundations-11",
  `${(oxy[0][3] - 8 + 1.5).toFixed(1)} mg/L`,
);
const mol = rows("science-drill-molecule-balance")[0];
assert(mol[0] / 2 > mol[1]);
keyed("science-scientific-foundations-13", "O₂");
keyed("science-scientific-foundations-14", `${2 * mol[1]}`);
keyed("science-scientific-foundations-15", `${2 * mol[0]}`);
keyed("science-scientific-foundations-17", `${mol[0] / 2} molecules`);
const force = rows("science-drill-force");
keyed("science-scientific-foundations-23", `${force[1][1] - force[1][2]} N`);
keyed(
  "science-scientific-foundations-24",
  `${(force[2][1] - force[2][2]) / 2} m/s²`,
);
keyed(
  "science-scientific-foundations-26",
  `${(force[1][1] - force[1][2]) / 4} m/s²`,
);
keyed("science-scientific-foundations-30", `${80 / 4}`);
// Second-exam calculations and figure consistency.
const snd = rows("science-exam-insect-sound");
keyed("science-exam-2-01", `${maxRow(snd, 2)[0]} kHz`);
keyed("science-exam-2-02", `${(50 * snd[1][3]) / 100}`);
for (const row of snd)
  for (const percent of row.slice(1))
    assert(
      Number.isInteger((50 * percent) / 100),
      "Each insect response percentage must correspond to an integer number of insects in a group of 50.",
    );
const oc = rows("science-exam-ocean");
assert.deepEqual(
  p("science-exam-ocean").graph.series[0].points,
  oc.map((r) => [r[0], r[1]]),
);
keyed("science-exam-2-07", `${maxRow(oc, 3)[0]} m`);
keyed("science-exam-2-08", `${(oc[2][1] + oc[3][1]) / 2}°C`);
const slopes = oc
  .slice(1)
  .map((r, i) => [
    `${oc[i][0]}–${r[0]} m`,
    (oc[i][1] - r[1]) / (r[0] - oc[i][0]),
  ]);
keyed("science-exam-2-09", maxRow(slopes, 1)[0]);
assert.equal(oc[2][2], oc[3][2]);
assert(oc[2][1] > oc[3][1] && oc[2][3] < oc[3][3]);
const cor = rows("science-exam-corrosion");
keyed("science-exam-2-14", `${cor[0][3] - cor[2][3]} mg`);
keyed("science-exam-2-16", `${10 ** (7 - 4)} times as great`);
const mar = rows("science-exam-slope-streaks");
assert.deepEqual(
  mar.filter((r) => r[1] < -20).map((r) => r[0]),
  ["C", "D"],
);
keyed("science-exam-2-20", "C and D");
const chl = rows("science-exam-light-colors");
keyed("science-exam-2-25", minRow(chl, 2)[1]);
keyed("science-exam-2-26", `${chl[2][3] + 1} µmol/min`);
keyed(
  "science-exam-2-29",
  `Gross production is ${chl[3][3] + 1} µmol/min, equal to consumption.`,
);
const load = points("science-exam-wire-strain"),
  unload = points("science-exam-wire-strain", 1);
keyed("science-exam-2-31", `${(load[1][1] + load[2][1]) / 2} mm`);
keyed("science-exam-2-33", `${unload[0][1] - load[0][1]} mm`);
assert.equal(unload[2][1] - load[2][1], 1);
keyed("science-exam-2-34", "It is 1 mm greater.");
const co = rows("science-exam-compost");
keyed("science-exam-2-37", `${co[3][2] - co[1][2]} mg`);
assert.equal(co[3][2] - co[2][2], 45);
keyed("science-exam-2-38", "At 30°C the increase is 45 mg.");
keyed(
  "check-science-data-3",
  `${(riv[0][1] * riv[0][2] + riv[1][1] * 20) / riv[2][1]} mg/L`,
);
const pan = rows("science-drill-panels");
keyed(
  "check-science-design-3",
  `${pan[0][3] - pan[0][2] - (pan[1][3] - pan[1][2])} W`,
);
keyed("check-science-model-3", `${2 * 9 - 2 * Math.sqrt(9)} s`);
keyed("check-science-foundation-3", `${2 * mol[1]}`);
for (const l of lessons)
  assert(
    l.sections.flatMap((s) => s.examples ?? []).length >= 6,
    `Worked examples: ${l.slug}`,
  );
console.log(
  "Science validation passed: 6 topics; 203 drills across 58 passages; 2 independent 40-question/40-minute sections; 43 teaching concepts and 18 independent checks; 18 historical checks retained. All 319 IDs, shared evidence, option keys, balanced exam answers, table/graph consistency, and quantitative deductions passed.",
);
