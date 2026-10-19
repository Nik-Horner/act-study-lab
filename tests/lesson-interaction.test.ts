import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  chooseActivityAnswer,
  bikeRentalCost,
  explorationContent,
  EXPLORATION_SKILLS,
  type ActivityState,
} from "../src/lib/lesson-interaction";
import { getLearningSkills, focusLesson } from "../src/lib/learning-skills";
import { getLesson } from "../src/lib/act/content";
import { getLesson as getEnglishLesson } from "../src/lib/content";
import { LessonActivity } from "../src/components/LessonActivity";
import { GuidedExploration } from "../src/components/GuidedExploration";
import { LessonVisual } from "../src/components/LessonVisual";

test("a miss requires explanation and the supported step before completion", () => {
  const start: ActivityState = {
    phase: "try",
    choice: null,
    recovering: false,
  };
  const missed = chooseActivityAnswer(start, 0, 1);
  assert.equal(missed.phase, "explain");
  assert.equal(missed.recovering, true);
  assert.deepEqual(
    chooseActivityAnswer(missed, 1, 1),
    missed,
    "explanation cannot be skipped by answering the old prompt",
  );
  const step: ActivityState = { ...missed, phase: "step", choice: null };
  const missedStep = chooseActivityAnswer(step, 0, 1);
  assert.equal(missedStep.phase, "step");
  const rebuilt = chooseActivityAnswer(missedStep, 1, 1);
  assert.equal(rebuilt.phase, "ready");
  assert.equal(rebuilt.recovering, true);
  assert.deepEqual(chooseActivityAnswer(rebuilt, 0, 1), rebuilt);
  assert.deepEqual(chooseActivityAnswer(start, 1, 1), {
    phase: "ready",
    choice: 1,
    recovering: false,
  });
});

test("every authored primary skill reaches the same supported recovery without mutating lesson data", () => {
  const skills = getLearningSkills();
  assert.equal(skills.length, 325);
  for (const skill of skills) {
    const full =
      skill.subject === "english"
        ? getEnglishLesson(skill.topic)
        : getLesson(skill.topic);
    const focused = focusLesson(full as ReturnType<typeof getLesson>, skill);
    const activity = focused.sections.find(
      (section) => section.activity,
    )?.activity;
    assert(activity, skill.id);
    const before = JSON.stringify(activity);
    const wrong = (activity.answer + 1) % activity.choices.length;
    const html = renderToStaticMarkup(
      createElement(LessonActivity, { activity, initialWrongChoice: wrong }),
    );
    assert.match(html, /Follow the idea/);
    assert.match(html, /Try the smaller step/);
    assert.match(html, /Your choice/);
    assert.equal(JSON.stringify(activity), before, skill.id);
  }
});

test("original visual examples attach only to their taught skills and their calculations follow the visible facts", () => {
  const skills = getLearningSkills();
  for (const id of EXPLORATION_SKILLS) {
    assert(
      skills.some((skill) => skill.id === id),
      id,
    );
    const html = renderToStaticMarkup(
      createElement(GuidedExploration, { skillId: id }),
    );
    assert.match(html, /exploration-scene/);
    assert.match(html, /button/);
    assert.match(html, /aria-pressed|aria-label="One fewer/);
  }
  assert.equal(
    renderToStaticMarkup(
      createElement(GuidedExploration, {
        skillId: "math-algebra-linear-systems",
      }),
    ),
    "",
  );
  assert.deepEqual([0, 1, 2, 3, 4].map(bikeRentalCost), [3, 5, 7, 9, 11]);
  const [a, b, c] = explorationContent.science.rows;
  assert.equal(a[2], c[2]);
  assert.notEqual(a[1], c[1]);
  assert.notEqual(a[2], b[2]);
  assert.equal(Number(c[3]) - Number(a[3]), 3);
  assert.match(
    explorationContent.reading.sentences[explorationContent.reading.clue],
    /damp palms/,
  );
  assert.equal(explorationContent.sentence.answer, ",");
});

test("visual previews use the assigned activity and preserve exact graph labels and selected values", () => {
  const activity = {
    prompt: "Which measured point has the largest output?",
    choices: ["A", "B"],
    answer: 1,
    explanation: "The final measured output is larger.",
    evidence: {
      id: "local-test-plot",
      title: "Measured outputs",
      context: "Observe the supplied measurements.",
      graph: {
        title: "Outputs",
        xLabel: "Input (mL)",
        yLabel: "Output (cm)",
        yRange: [10, 20] as [number, number],
        series: [
          {
            label: "Measured",
            points: [
              [1, 12],
              [2, 18],
            ] as [number, number][],
          },
        ],
      },
    },
  };
  const html = renderToStaticMarkup(createElement(LessonVisual, { activity }));
  assert.match(html, /Input \(mL\)/);
  assert.match(html, /Output \(cm\)/);
  assert.match(html, /Measured: 1, 12/);
  assert.match(html, /starts at 10, not zero/);
  assert.match(html, /Measured: 2, 18/);
  const compact = renderToStaticMarkup(
    createElement(LessonVisual, { activity, compact: true }),
  );
  assert.doesNotMatch(compact, /<select/);
  assert.match(compact, /Measured outputs/);
});

test("marking English evidence keeps an underlined phrase intact", () => {
  const html = renderToStaticMarkup(
    createElement(LessonVisual, {
      activity: {
        evidenceText: "The guide [[walked through]] the tunnel.",
        prompt: "Which verb fits?",
        choices: ["walks", "walking"],
        answer: 0,
        explanation: "The sentence needs a finite verb.",
      },
    }),
  );
  assert.match(html, /class="ul">walked through<\/span>/);
  assert.doesNotMatch(html, /\[\[/);
});
