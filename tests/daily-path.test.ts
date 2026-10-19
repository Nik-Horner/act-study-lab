import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DailyPath } from "../src/components/DailyPath";
import type { DailyState } from "../src/components/DailyStudy";
import type { DailyBlock } from "../src/lib/daily-plan";

function fixture(): DailyState {
  const blocks: DailyBlock[] = (
    ["english", "math", "reading", "science"] as const
  ).map((subject) => {
    const lesson = {
      slug: `${subject}-topic`,
      title: `${subject} saved skill`,
      intro: "Original lesson intro",
      sections: [
        {
          heading: `${subject} first concept`,
          body: ["Use the evidence to work through the problem."],
          activity: {
            prompt: `${subject} original prompt`,
            choices: ["One", "Two"],
            answer: 0,
            explanation: "The evidence supports one.",
            evidenceText: `${subject} original evidence`,
          },
        },
        {
          heading: `${subject} saved next concept`,
          body: ["Use this second example."],
          activity: {
            prompt: `${subject} next prompt`,
            choices: ["One", "Two"],
            answer: 1,
            explanation: "The evidence supports two.",
            evidenceText: `${subject} next evidence`,
          },
        },
      ],
      check: [],
    };
    const questions = [
      {
        id: `${subject}-q`,
        subject,
        topic: lesson.slug,
        stem: "Question",
        questionText: "What follows?",
        choices: ["One", "Two"],
        answer: 0,
        explanation: "One follows.",
        category: "Test",
        difficulty: "easy" as const,
      },
    ];
    return {
      subject,
      topic: lesson.slug,
      title: lesson.title,
      minutes: 12,
      lesson,
      questions,
      units: [
        {
          id: `${subject}-unit`,
          topic: lesson.slug,
          title: lesson.title,
          lesson,
          questions,
        },
      ],
    };
  });
  return {
    userId: "learner-a",
    saved: true,
    answers: { "english-q": 0 },
    answerTimes: {},
    lessons: ["english-unit", "review:english", "math-unit:concept:0"],
    deadline: 1,
    today: "2026-10-17",
    minutes: 48,
    availableMinutes: 65,
    plan: {
      id: "saved-plan",
      date: "2026-10-17",
      minutes: 48,
      sequence: 1,
      complete: false,
      blocks,
    },
    goal: { targetScore: 30, testDate: "2026-12-12" },
    coverage: {
      covered: 8,
      completedSessions: 3,
      total: 40,
      testDate: "2026-12-12",
      finishDate: "2026-12-01",
      onTrack: true,
      requiredMinutes: 48,
    },
    formulas: {
      date: "2026-10-17",
      ids: ["slope", "distance"],
      remaining: ["distance"],
      recalled: 6,
      total: 80,
      minutes: 1,
      daysLeft: 56,
    },
  };
}

function render(
  data: DailyState,
  pending = false,
  error: string | null = null,
) {
  return renderToStaticMarkup(
    createElement(DailyPath, {
      data,
      pending,
      error,
      onContinue() {},
      onFormulas() {},
      onNewSession() {},
    }),
  );
}

test("daily path previews the actual next saved concept and keeps completed subject credit", () => {
  const data = fixture();
  const before = structuredClone(data);
  const html = render(data);
  assert.match(html, /65 min\/day/);
  assert.match(html, /3 sessions completed/);
  assert.match(html, /Level 1/);
  assert.match(html, /300 XP/);
  assert.match(
    html,
    /100 XP per completed Daily session. Earlier sessions count./,
  );
  assert.match(html, /8\/40 focused skills covered/);
  assert.match(html, /data-subject="english" data-state="done"/);
  assert.match(
    html,
    /data-subject="math" data-state="current" aria-current="step"/,
  );
  assert.match(html, /math saved next concept/);
  assert.match(html.replace(/<[^>]+>/g, ""), /math next evidence/);
  assert.match(html, /aria-label="Mark useful evidence"/);
  assert.doesNotMatch(html, /math original evidence/);
  assert.match(html, /Continue lesson/);
  assert.deepEqual(data, before);
});

test("an old saved session stays resumable after its old clock expired", () => {
  const data = fixture();
  data.plan.date = "2026-10-15";
  const html = render(data);
  assert.match(html, /Your saved path/);
  assert.match(html, /Resume saved session/);
  assert.match(html, /Choose new lessons instead/);
  assert.doesNotMatch(html, /Goal reached|time left|timer|countdown/i);
  assert.equal(data.plan.id, "saved-plan");
});

test("completed lessons stay complete while pending formulas remain a separate optional action", () => {
  const data = fixture();
  data.plan.complete = true;
  let html = render(data);
  assert.match(html, /Review saved answers/);
  assert.match(html, /Math formula recall · optional/);
  assert.match(html, /Review<span class="sr-only"> formulas/);
  assert.match(html, /Today’s path is complete/);
  assert.doesNotMatch(html, /Finish daily formulas/);
  data.formulas!.remaining = [];
  html = render(data);
  assert.match(html, /Review saved answers/);
  assert.match(html, /Today’s path is complete/);
  assert.equal(data.answers["english-q"], 0);
});

test("path reflects the actual short-day plan and exposes save failures", () => {
  const data = fixture();
  data.plan.blocks = data.plan.blocks.slice(0, 2);
  const html = render(data, true, "Couldn’t save. Retry before leaving.");
  assert.match(html, /Your other subjects return in upcoming sessions/);
  assert.doesNotMatch(html, /data-subject="science"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Couldn’t save. Retry before leaving./);
  assert.match(html, /disabled=""/);
});

test("home exploration follows the actual skill and suppresses a repeated lesson heading", () => {
  const data = fixture();
  const unit = data.plan.blocks[1].units![0];
  unit.skillId = "math-modeling-linear-models";
  unit.lesson.sections[1].heading = unit.title;
  const html = render(data);
  assert.match(html, /Explore a linear cost model/);
  assert.match(html, /Make the graph move\./);
  assert.match(html, /\$3 to start\. \$2 for every hour\./);
  assert.match(html, /href="\/account">Edit plan/);
  unit.skillId = "different-math-skill";
  const other = render(data);
  assert.doesNotMatch(other, /Explore a linear cost model/);
  assert.doesNotMatch(other, /class="daily-next-description"/);
  assert.match(other.replace(/<[^>]+>/g, ""), /math next evidence/);
});
