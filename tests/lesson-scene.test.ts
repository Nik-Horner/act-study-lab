import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getLearningSkills,
  focusLesson,
  hasTeaching,
} from "../src/lib/learning-skills";
import { getLesson, getTopic } from "../src/lib/act/content";
import { getLesson as englishLesson } from "../src/lib/content";
import type { Lesson } from "../src/lib/act/types";
import { LessonArtifact } from "../src/components/LessonArtifact";
import { ConceptTeaching } from "../src/components/ConceptTeaching";

test("every published skill has a real lesson artifact without changing source teaching", () => {
  let count = 0;
  for (const skill of getLearningSkills()) {
    const full = getTopic(skill.topic)
      ? getLesson(skill.topic)
      : (englishLesson(skill.topic) as Lesson);
    const before = JSON.stringify(full);
    for (const section of focusLesson(full, skill).sections.filter(
      hasTeaching,
    )) {
      const html = renderToStaticMarkup(
        createElement(LessonArtifact, {
          section,
          subject: skill.subject,
          topic: skill.topic,
          skillId: skill.id,
          sourceIndex: full.sections.findIndex(
            (source) => source.heading === section.heading,
          ),
          example: section.examples?.[0],
        }),
      );
      assert(html.length > 100, `${skill.id}: empty artifact`);
      if (section.evidence?.length && !section.activity)
        for (const source of section.evidence)
          assert(
            html.includes(source.title),
            `${skill.id}: source evidence missing`,
          );
    }
    assert.equal(
      JSON.stringify(full),
      before,
      `${skill.id}: authored teaching must remain immutable`,
    );
    count++;
  }
  assert.equal(count, 325);
});

test("the approved cost lesson presents the interactive model and unscored smaller step together", () => {
  const skill = getLearningSkills("math-modeling").find(
    (skill) => skill.id === "math-modeling-linear-models",
  )!;
  const full = getLesson(skill.topic);
  const section = focusLesson(full, skill).sections[0];
  const html = renderToStaticMarkup(
    createElement(ConceptTeaching, {
      section,
      subject: "math",
      topic: skill.topic,
      skillId: skill.id,
      sourceIndex: skill.sections[0],
      position: 0,
      total: 1,
      title: skill.title,
      onContinue: () => {},
      nextLabel: "Practice independently",
    }),
  );
  assert(html.includes("Build the cost, one hour at a time."));
  assert(html.includes("One-hour cost choices"));
  assert(html.includes("What does 1 hour cost?"));
  assert(html.includes("One more rental hour"));
  assert(html.includes("unscored"));
});

test("worked-example artifacts retain the matching experiment, including case-specific evidence", () => {
  const section = {
    heading: "Controlled comparison",
    body: ["Change one factor."],
    evidence: [
      { id: "original", title: "Original table", context: "Original context" },
    ],
  };
  const example = {
    text: "Read the new comparison.",
    label: "Case",
    good: true,
    evidence: {
      id: "case",
      title: "Case experiment",
      context: "This experiment uses another condition.",
    },
  };
  const html = renderToStaticMarkup(
    createElement(LessonArtifact, {
      section,
      example,
      subject: "science",
      topic: "science-experimental-design",
      sourceIndex: 0,
      exploring: true,
    }),
  );
  assert(html.includes("Case experiment"));
  assert(html.includes("This experiment uses another condition."));
  assert(!html.includes("Original table"));
});
