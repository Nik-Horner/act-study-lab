import test from "node:test";
import assert from "node:assert/strict";
import {
  getLearningSkills,
  focusLesson,
  hasTeaching,
} from "../src/lib/learning-skills";
import { getLesson as getEnglishLesson } from "../src/lib/content";
import { getLesson, getTopic } from "../src/lib/act/content";
import type { Lesson } from "../src/lib/act/types";
import { teachingStages } from "../src/lib/lesson-interaction";

test("every published skill reaches independent practice after its actual authored teaching", () => {
  const all = getLearningSkills();
  assert.equal(all.length, 325);
  const subjects = new Set<string>();
  for (const skill of all) {
    const full = getTopic(skill.topic)
      ? getLesson(skill.topic)
      : (getEnglishLesson(skill.topic) as Lesson);
    const original = JSON.stringify(full);
    const sections = focusLesson(full, skill).sections.filter(hasTeaching);
    assert(sections.length, skill.id);
    subjects.add(skill.subject);
    for (const section of sections) {
      const stages = teachingStages(section);
      assert.equal(stages[0], "method", skill.id);
      assert.equal(
        stages.includes("example"),
        !!(section.examples?.length || section.workedCases?.length),
        skill.id,
      );
      assert.equal(stages.at(-1) === "check", !!section.activity, skill.id);
      assert(
        stages.indexOf("example") < stages.indexOf("check") ||
          !stages.includes("example") ||
          !stages.includes("check"),
        skill.id,
      );
      assert(
        full.sections.some((source) => source.heading === section.heading),
        `${skill.id}: source concept remains resolvable`,
      );
    }
    assert.equal(
      JSON.stringify(full),
      original,
      `${skill.id}: source teaching is immutable`,
    );
  }
  assert.deepEqual([...subjects].sort(), [
    "english",
    "math",
    "reading",
    "science",
  ]);
});

test("sections without examples or checks have no empty learning stages", () => {
  const section = { heading: "Method", body: ["Use the method."] };
  assert.deepEqual(teachingStages(section), ["method"]);
  assert.deepEqual(
    teachingStages({
      ...section,
      workedCases: [{ text: "A worked case", label: "Example", good: true }],
    }),
    ["method", "example"],
  );
});

test("worked-example stage keeps the source experiment visible without repeating method prose", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { LessonSections } = await import("../src/components/LessonSections");
  const skill = getLearningSkills("science-experimental-design").find(
    (skill) => skill.id === "science-experimental-design-confounds",
  )!;
  const section = focusLesson(getLesson(skill.topic), skill).sections.find(
    (section) => section.evidence?.length,
  )!;
  assert(section);
  const html = renderToStaticMarkup(
    createElement(LessonSections, {
      sections: [section],
      mode: "examples",
      showActivity: false,
    }),
  );
  for (const passage of section.evidence!) {
    assert(
      html.includes(passage.title),
      `Missing source evidence: ${passage.id}`,
    );
    for (const row of passage.table?.rows ?? [])
      for (const value of row)
        assert(
          html.includes(String(value)),
          `Missing experiment value: ${value}`,
        );
  }
  assert(html.includes("Why can the result not isolate temperature?"));
  assert(!html.includes(section.body[0]), "Method prose remains in Understand");
});
