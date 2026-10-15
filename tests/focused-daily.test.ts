import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getQuestions, getLesson } from "../src/lib/act/content";
import { englishDailyQuestions } from "../src/lib/english-daily-content";
import {
  getLearningSkills,
  getQuestionTeaching,
  hasTeaching,
} from "../src/lib/learning-skills";
import {
  dailyScopes,
  makeDailyPlan,
  refreshDailyContent,
  estimateDailyBlock,
  type DailyPlan,
} from "../src/lib/daily-plan";
import {
  blockUnits,
  dailyConcepts,
  dailyStep,
  readingConceptProgress,
} from "../src/lib/daily-flow";
import legacy from "./fixtures/focused-curriculum-legacy.json";
import { LessonExample } from "../src/components/LessonExample";

const subjects = ["english", "math", "reading", "science"] as const;
const settings = {
  scores: { english: 32, math: 34, reading: 33, science: 27 },
  minutesPerDay: 75,
};

test("Daily alone schedules every authored primary skill, including English test-day methods", () => {
  for (const subject of subjects) {
    const skills = getLearningSkills(undefined, subject);
    const scopes = dailyScopes(subject);
    assert(skills.length > 20, subject);
    assert.equal(
      new Set(scopes.map((entry) => entry.scope.skillId)).size,
      skills.length,
      subject,
    );
    assert.equal(
      scopes.length,
      skills.length,
      `${subject}: a primary method must not become repeated lessons`,
    );
    for (const entry of scopes) {
      const bank =
        subject === "english"
          ? englishDailyQuestions(entry.topic.slug)
          : getQuestions(entry.topic.slug);
      assert(entry.scope.practice.length >= 2, entry.id);
      for (const index of entry.scope.practice) {
        const q = bank[index];
        const method = getQuestionTeaching(entry.topic.slug, q.id)!;
        assert.equal(method.skillId, entry.scope.skillId, q.id);
        assert(
          method.teachingSections.every((i) =>
            entry.scope.sections.includes(i),
          ),
          q.id,
        );
      }
    }
  }
  assert(
    dailyScopes("english").some(
      (entry) => entry.topic.slug === "test-patterns",
    ),
  );
});

test("personalized daily blocks teach their exact drill methods and stay within the total budget", () => {
  for (const baseline of [null, 20, 34])
    for (const minutesPerDay of [60, 75, 90])
      for (const includeScience of [false, true])
        for (const targetScore of [24, 30, 36]) {
          const profile = {
            scores: {
              english: baseline,
              math: baseline,
              reading: baseline,
              science: baseline,
            },
            minutesPerDay,
            includeScience,
          };
          const plan = refreshDailyContent(
            makeDailyPlan(
              "daily-only",
              "2026-10-14",
              profile,
              0,
              undefined,
              [],
              {},
              { testDate: "2026-11-21", targetScore, coveredUnits: [] },
            ),
          );
          assert.equal(
            plan.blocks.reduce((n, block) => n + block.minutes, 0),
            minutesPerDay,
          );
          assert.equal(plan.blocks.length, includeScience ? 4 : 3);
          for (const block of plan.blocks) {
            assert(
              estimateDailyBlock(block) <= block.minutes,
              `${baseline}/${minutesPerDay}/${targetScore}/${block.subject}`,
            );
            for (const unit of blockUnits(block)) {
              assert(unit.skillId, unit.id);
              const visible = dailyConcepts(unit);
              assert(visible.length, unit.id);
              assert(
                visible.every((i) => hasTeaching(unit.lesson.sections[i])),
                unit.id,
              );
              assert(
                visible.some((i) => unit.lesson.sections[i].examples?.length),
                `${unit.id}: worked method`,
              );
              assert(
                visible.some((i) => unit.lesson.sections[i].activity),
                `${unit.id}: separate try-it`,
              );
              for (const q of unit.questions) {
                assert.equal(q.skillId, unit.skillId, q.id);
                assert(
                  q.teachingSections?.every((i) =>
                    unit.sectionIndices?.includes(i),
                  ),
                  q.id,
                );
              }
            }
          }
          assert.deepEqual(
            refreshDailyContent(plan),
            plan,
            "refresh must not exchange the assignment or add checkpoints again",
          );
        }
});

test("actual previously published sessions preserve answers, source-index positions and identity through focused repair", () => {
  for (const fixture of legacy.cases) {
    const old = fixture.plan as unknown as DailyPlan;
    const answers = fixture.answers as Record<string, number>;
    const next = refreshDailyContent(old, answers);
    assert.equal(next.id, old.id);
    assert.equal(next.date, old.date);
    assert.equal(next.minutes, old.minutes);
    assert.deepEqual(
      refreshDailyContent(next, answers),
      next,
      `${fixture.subject}/${fixture.partial}: idempotence`,
    );
    const retained = next.blocks.flatMap((block) => [
      ...block.questions,
      ...(block.historicalQuestions ?? []),
    ]);
    for (const [id, answer] of Object.entries(answers))
      assert.equal(retained.find((q) => q.id === id)?.answer, answer, id);
    for (const block of next.blocks) {
      assert(
        estimateDailyBlock(block, answers) <= block.minutes,
        `${fixture.subject}/${block.subject}: remaining budget`,
      );
      for (const unit of blockUnits(block)) {
        const previous = old.blocks
          .flatMap(blockUnits)
          .find((u) => u.id === unit.id);
        assert(previous, unit.id);
        const indices =
          previous.sectionIndices ?? previous.lesson.sections.map((_, i) => i);
        assert.deepEqual(
          unit.sectionIndices?.slice(0, indices.length),
          indices,
          unit.id,
        );
      }
    }
  }
});

test("covered daily skills go straight to retrieval while newly required teaching still gates the drill", () => {
  const coveredUnits = subjects.flatMap((subject) =>
    dailyScopes(subject).map((entry) => entry.id),
  );
  const plan = makeDailyPlan(
    "retrieval",
    "2026-10-14",
    settings,
    4,
    undefined,
    [],
    {},
    { testDate: "2026-11-21", coveredUnits },
  );
  assert(plan.blocks.every((block) => block.reviewOnly));
  assert.equal(
    dailyStep(plan, {}, []).kind,
    "drill",
    "do not force repeated lessons after first-pass completion",
  );
  const unit = blockUnits(plan.blocks[0])[0];
  unit.requiredConceptIndices = [dailyConcepts(unit)[0]];
  assert.equal(
    dailyStep(plan, {}, [unit.id]).kind,
    "lesson",
    "a new prerequisite cannot be skipped by old completion",
  );
});

test("budget estimates include a repaired visible section even when its source index already occurred in the snapshot", () => {
  const plan = makeDailyPlan("estimate", "2026-10-14", settings, 0);
  const block = structuredClone(
    plan.blocks.find((block) => block.subject === "math")!,
  );
  const unit = blockUnits(block)[0];
  const section = structuredClone(
    getLesson(unit.topic).sections[unit.sectionIndices![0]],
  );
  section.body = ["method ".repeat(540)];
  unit.lesson.sections = [{ ...section, body: ["Old overview"] }, section];
  unit.sectionIndices = [0, 0];
  unit.focusedConceptIndices = [1];
  block.units = [unit];
  assert(
    estimateDailyBlock(block) >= 3,
    "the appended repair must contribute its full 540 words",
  );
});

test("worked Reading reasoning is visible before the independent try-it", () => {
  const html = renderToStaticMarkup(
    createElement(LessonExample, {
      classify: false,
      example: {
        text: "Passage and question\n\nSupported answer: The path reopened.\nReason: The last paragraph records a new entrance.",
        label: "Worked",
        good: true,
      },
    }),
  );
  assert.match(html, /Supported answer/);
  assert.match(html, /last paragraph records/);
  assert.doesNotMatch(html, /Reveal answer|Try the worked example/);
});

test("Daily English reuses identical visible prerequisites while retaining each skill's distinct practice", () => {
  const plan = makeDailyPlan(
    "english-prerequisites",
    "2026-10-14",
    {
      scores: { english: 32, math: null, reading: null, science: null },
      minutesPerDay: 75,
    },
    0,
    undefined,
    ["daily-clauses-1"],
    {},
    { testDate: "2026-10-17", targetScore: 36, coveredUnits: [] },
  );
  const units = plan.blocks.find((b) => b.subject === "english")!.units!;
  const first = units[0],
    next = units[1];
  const index = dailyConcepts(next).find(
    (i) =>
      !next.lesson.sections[i].activity &&
      dailyConcepts(first).some(
        (j) =>
          first.sectionIndices![j] === next.sectionIndices![i] &&
          JSON.stringify(first.lesson.sections[j]) ===
            JSON.stringify(next.lesson.sections[i]),
      ),
  )!;
  assert.notEqual(index, undefined);
  const key = `${next.id}:concept:${index}`;
  assert(
    !readingConceptProgress(plan, [first.id]).includes(key),
    "unit completion alone is not visible concept proof",
  );
  const checks = dailyConcepts(first).map((i) => `${first.id}:concept:${i}`);
  const normalized = readingConceptProgress(plan, checks);
  assert(
    normalized.includes(key),
    "do not print the same prerequisite again in the next skill",
  );
  for (const i of dailyConcepts(next).filter(
    (i) => next.lesson.sections[i].activity,
  ))
    assert(
      !normalized.includes(`${next.id}:concept:${i}`),
      "each primary activity must remain required",
    );
  const changed = structuredClone(plan);
  const changedSection = changed.blocks.find((b) => b.subject === "english")!
    .units![1].lesson.sections[index];
  changedSection.body = [
    ...changedSection.body,
    "This section now teaches an additional prerequisite.",
  ];
  assert(
    !readingConceptProgress(changed, checks).includes(key),
    "changed visible teaching must not inherit completion",
  );
});
