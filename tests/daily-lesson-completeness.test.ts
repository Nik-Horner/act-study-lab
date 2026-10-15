import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import scienceAudit from "../docs/science-student-qa-2026-10-15.json";
import readingAudit from "../docs/reading-student-qa-2026-10-15.json";
import { getAllQuestions, getLesson } from "../src/lib/act/content";
import { getLearningSkills, focusLesson } from "../src/lib/learning-skills";
import { LessonSections } from "../src/components/LessonSections";
import { ScienceDiagram } from "../src/components/act/ScienceDiagram";
import type { Passage } from "../src/lib/act/types";

const skills = getLearningSkills();
const skill = (id: string) => {
  const found = skills.find((entry) => entry.id === id);
  assert(found, id);
  return found;
};
const cases = (id: string) => skill(id).workedCases!;
const rows = (id: string, index = 0) => cases(id)[index].evidence!.table!.rows;

test("every previously B Science and Reading method has a concrete missing-variant repair", () => {
  const science = scienceAudit.lessons.filter((entry) => entry.grade === "B");
  assert.equal(science.length, 12);
  for (const entry of science) {
    const current = skill(entry.skillId);
    assert(
      current.workedCases?.length || current.evidence?.some((p) => p.diagram),
      entry.skillId,
    );
  }
  const reading = readingAudit.lessons.filter(
    (entry) =>
      entry.grades.skillTransfer === "B" || entry.grades.clarity === "B",
  );
  assert.equal(reading.length, 16);
  for (const entry of reading)
    assert(cases(entry.skillId)?.length, entry.skillId);
});

test("worked variants reach Daily before practice, preserve source positions, and never expose a scored passage", () => {
  const bank = getAllQuestions();
  const ids = new Set<string>();
  let count = 0;
  for (const current of skills.filter((entry) => entry.workedCases?.length)) {
    const full = getLesson(current.topic);
    const before = structuredClone(full);
    const lesson = focusLesson(full, current);
    assert.equal(lesson.sections.length, current.sections.length);
    assert.deepEqual(lesson.sections.at(-1)!.workedCases, current.workedCases);
    const html = renderToStaticMarkup(
      createElement(LessonSections, { sections: lesson.sections }),
    );
    for (const example of current.workedCases!) {
      assert.match(example.text, /^Question:/);
      assert.match(example.text, /\n1\. .+\n2\. /);
      assert.match(example.text, /Supported answer: .+\n\nWatch for: .+/);
      assert(example.text.split(/\s+/).length <= 130, current.id);
      assert(
        html.indexOf(example.label) >= 0 &&
          html.indexOf(example.label) < html.indexOf("Apply the method"),
        current.id,
      );
      const evidence = example.evidence!;
      assert(!ids.has(evidence.id), evidence.id);
      ids.add(evidence.id);
      assert(
        !bank.some(
          (q) =>
            q.passage?.id === evidence.id ||
            q.passage?.context === evidence.context,
        ),
        evidence.id,
      );
      assert.notDeepEqual(evidence, current.activity?.evidence);
      if (evidence.table)
        assert(
          evidence.table.rows.every(
            (row) => row.length === evidence.table!.columns.length,
          ),
        );
      count++;
    }
    assert.deepEqual(
      full,
      before,
      "focusing must not mutate historical teaching",
    );
  }
  assert.equal(count, 30);
});

test("every exact Math method presents its complete worked reasoning as readable steps", () => {
  const math = getLearningSkills(undefined, "math");
  assert.equal(math.length, 143);
  for (const current of math) {
    const lesson = focusLesson(getLesson(current.topic), current);
    const html = renderToStaticMarkup(
      createElement(LessonSections, {
        sections: lesson.sections,
        showActivity: false,
      }),
    );
    assert.match(html, /<ol\b/, current.id);
    assert.match(html, /<li\b/, current.id);
    assert.equal(lesson.sections[0].examples?.length, 1, current.id);
  }
});

test("new worked arithmetic follows its own visible inputs", () => {
  const share = rows("science-data-reading-changes")[0] as number[];
  assert.equal((share[0] / (share[0] + share[1])) * 45, 18);
  const percentages = rows("science-data-reading-changes", 1)[0].map((value) =>
    parseFloat(String(value)),
  );
  assert.equal(percentages[1] - percentages[0], 20);
  assert.equal((percentages[1] - percentages[0]) / percentages[0], 0.5);
  const battery = rows("science-data-reading-supplied-model")[0] as number[];
  assert.equal(battery[0] / battery[1], 15);
  const calibration = rows("science-data-reading-calibration")[0] as number[];
  assert.equal(
    (((calibration[0] - 1) / 3) * calibration[1] * calibration[2]) / 3,
    24,
  );
  const times = rows(
    "science-trends-interpolation-interval-rates",
  ) as number[][];
  assert.equal(times[3][1] - times[2][1] - (times[1][1] - times[0][1]), 5);
  const proportional = rows(
    "science-trends-interpolation-equation",
  ) as number[][];
  assert.equal(
    proportional[1][1] / proportional[1][0],
    proportional[2][1] / proportional[2][0],
  );
  assert.notEqual(
    proportional[1][2] / proportional[1][0],
    proportional[2][2] / proportional[2][0],
  );
  const nonlinear = cases("science-trends-interpolation-nonlinear")[0]
    .evidence!;
  assert(
    nonlinear
      .graph!.series[0].points.slice(1)
      .every(([t, squared]) => squared / t === 4),
  );
  const transmission = rows("science-conflicting-viewpoints-joint-evidence", 1);
  assert.equal(Number(transmission[1][1]) - Number(transmission[0][1]), 25);
  assert.equal(Number(transmission[2][1]) - Number(transmission[0][1]), 10);
  const model = rows("science-models-evidence-substitution") as number[][];
  assert(model.every(([x, y]) => 2 ** x === y));
  assert(model.some(([x, y]) => 2 * x !== y));
  const culture = rows("science-models-evidence-combined-experiments");
  assert.equal(
    Number(culture[0][1]) +
      Number(culture[1][2]) -
      Number(culture[2][1]) -
      Number(culture[2][2]),
    400,
  );
  const pooled = rows("reading-integration-graphic");
  assert.equal(
    Math.round(
      ((Number(pooled[0][1]) + Number(pooled[1][1])) /
        (Number(pooled[0][2]) + Number(pooled[1][2]))) *
        100,
    ),
    43,
  );
});

test("spatial science uses visible diagrams with the correct event and tilt relationships", () => {
  for (const id of [
    "science-scientific-foundations-seasons",
    "science-scientific-foundations-relative-order",
  ]) {
    assert(skill(id).evidence![0].diagram);
    assert(skill(id).activity!.evidence!.diagram);
  }
  const kinds: NonNullable<Passage["diagram"]>[] = [
    "seasons",
    "rock-fault",
    "sealed-fault",
    "rock-intrusion",
  ];
  for (const kind of kinds) {
    const html = renderToStaticMarkup(createElement(ScienceDiagram, { kind }));
    assert.match(html, /role="img"/);
    assert.match(html, /aria-label="[^"]{30,}"/);
    assert.match(html, /<figcaption/);
  }
  const seasons = renderToStaticMarkup(
    createElement(ScienceDiagram, { kind: "seasons" }),
  );
  assert.match(seasons, /axes stay parallel/);
  const sealed = renderToStaticMarkup(
    createElement(ScienceDiagram, { kind: "sealed-fault" }),
  );
  assert.match(sealed, /C covers the old fault without being cut/);
});
