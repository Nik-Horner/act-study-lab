import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DailyEnglishLesson } from "../src/components/DailyEnglishLesson";
import { getLearningSkills, focusLesson } from "../src/lib/learning-skills";
import { getLesson } from "../src/lib/content";
import { dailyConcepts, readingConceptProgress } from "../src/lib/daily-flow";
import { isClauseRecognitionSection } from "../src/lib/lesson-interaction";
import {
  estimateDailyBlock,
  type DailyBlock,
  type DailyPlan,
  type DailyUnit,
} from "../src/lib/daily-plan";
import type { Lesson } from "../src/lib/act/types";

function unit(): DailyUnit {
  const skill = getLearningSkills("sentence-structure", "english").find(
    (item) => item.id === "independent-boundary",
  )!;
  return {
    id: "saved-independent-join",
    skillId: skill.id,
    topic: skill.topic,
    title: skill.title,
    sectionIndices: skill.sections,
    lesson: focusLesson(getLesson(skill.topic) as Lesson, skill),
    questions: [],
  };
}

function render(current: DailyUnit, completed: string[] = []) {
  return renderToStaticMarkup(
    createElement(DailyEnglishLesson, {
      unit: current,
      completed,
      revisiting: false,
      pending: false,
      onAdvance: async () => true,
      onBack: () => {},
    }),
  );
}

test("source section zero receives a clause interaction even without a prediction activity", () => {
  const current = unit();
  assert.equal(current.sectionIndices![0], 0);
  assert.equal(current.lesson.sections[0].activity, undefined);
  const before = JSON.stringify(current);
  const html = render(current);
  assert.match(html, /Make a complete thought/);
  assert.match(html, /Find the subject/);
  assert.match(html, /Find the verb/);
  assert.match(html, /Add “while”/);
  assert.equal(JSON.stringify(current), before);
  assert.equal(isClauseRecognitionSection("sentence-structure", 0), true);
  assert.equal(isClauseRecognitionSection("sentence-structure", 2), false);
  assert.equal(isClauseRecognitionSection("commas", 0), false);
  const remapped = {
    ...current,
    sectionIndices: [2, 0],
    focusedConceptIndices: [1],
    lesson: {
      ...current.lesson,
      sections: [current.lesson.sections[1], current.lesson.sections[0]],
    },
  };
  assert.match(
    render(remapped),
    /Make a complete thought/,
    "source mapping, not local position, chooses the interaction",
  );
});

test("visual teaching preserves prior prerequisite proof and its exact checkpoint key", () => {
  const first = unit();
  const second = { ...structuredClone(first), id: "next-independent-join" };
  const plan: DailyPlan = {
    id: "saved-plan",
    date: "2026-10-17",
    minutes: 60,
    sequence: 1,
    complete: false,
    blocks: [
      {
        subject: "english",
        topic: first.topic,
        title: first.title,
        minutes: 15,
        units: [first, second],
        lesson: first.lesson,
        questions: [],
      },
    ],
  };
  const key = `${first.id}:concept:0`;
  const before = readingConceptProgress(plan, [key]);
  const concepts = dailyConcepts(first);
  const section = JSON.stringify(first.lesson.sections[0]);
  assert(before.includes(`${second.id}:concept:0`));
  assert.doesNotMatch(
    render(first, [key]),
    /Make a complete thought/,
    "credited prerequisite is not forced to replay",
  );
  assert.deepEqual(readingConceptProgress(plan, [key]), before);
  assert.deepEqual(dailyConcepts(first), concepts);
  assert.equal(JSON.stringify(first.lesson.sections[0]), section);
});

test("clause exploration adds 90 seconds only for a visible mapped source section, counted once", () => {
  const current = unit();
  const blockFor = (current: DailyUnit, reviewOnly = false): DailyBlock => ({
    subject: "english",
    topic: current.topic,
    title: current.title,
    minutes: 15,
    units: [current],
    lesson: current.lesson,
    questions: [],
    reviewOnly,
  });
  const extraSeconds = (current: DailyUnit, reviewOnly = false) =>
    Math.round(
      (estimateDailyBlock(blockFor(current, reviewOnly)) -
        estimateDailyBlock(
          blockFor({ ...current, topic: "other-topic" }, reviewOnly),
        )) *
        60,
    );
  assert.equal(
    extraSeconds(current),
    90,
    "a prerequisite without activity still needs exploration time",
  );
  const remapped = {
    ...current,
    sectionIndices: [2, 0],
    focusedConceptIndices: [1],
    lesson: {
      ...current.lesson,
      sections: [current.lesson.sections[1], current.lesson.sections[0]],
    },
  };
  assert.equal(extraSeconds(remapped), 90);
  assert.equal(
    extraSeconds({ ...remapped, focusedConceptIndices: [0] }),
    0,
    "hidden source zero adds no time",
  );
  assert.equal(
    extraSeconds({
      ...current,
      sectionIndices: [0, 0],
      lesson: {
        ...current.lesson,
        sections: [current.lesson.sections[0], current.lesson.sections[0]],
      },
    }),
    90,
    "an appended repair checkpoint is the same taught prerequisite",
  );
  assert.equal(
    extraSeconds(current, true),
    0,
    "review-only work does not replay credited teaching",
  );
  assert.equal(
    extraSeconds({ ...current, requiredConceptIndices: [0] }, true),
    90,
  );
  const before = structuredClone(current);
  estimateDailyBlock(blockFor(current));
  assert.deepEqual(
    current,
    before,
    "time estimates must not change lesson content or checkpoint positions",
  );
});
