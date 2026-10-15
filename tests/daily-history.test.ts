import { test } from "node:test";
import assert from "node:assert/strict";
import fixture from "./fixtures/focused-curriculum-legacy.json";
import {
  dailyHistory,
  dailyCoverage,
  makeDailyPlan,
  type DailyPlan,
} from "../src/lib/daily-plan";
import { blockUnits } from "../src/lib/daily-flow";
import { getQuestionTeaching } from "../src/lib/learning-skills";
const settings = {
  scores: { english: 32, math: 30, reading: 30, science: 30 },
  minutesPerDay: 60,
};
const legacy = () => structuredClone(fixture.cases[0].plan) as DailyPlan;
test("completed legacy lessons retain original history and recover only assessed primary skills", () => {
  const plan = legacy();
  plan.complete = true;
  const history = dailyHistory([plan]);
  for (const block of plan.blocks)
    for (const unit of blockUnits(block)) {
      assert(history.coveredUnits.includes(unit.courseId ?? unit.id));
      for (const q of unit.questions) {
        const skill = getQuestionTeaching(unit.topic, q.id)?.skillId;
        assert(skill, q.id);
        assert(
          history.coveredUnits.includes(
            `${block.subject}:${unit.topic}:skill:${skill}`,
          ),
        );
      }
    }
  const geometry = history.coveredUnits.filter((id) =>
    id.startsWith("math:math-geometry:skill:"),
  );
  assert.equal(
    geometry.length,
    2,
    "do not grant the entire broad geometry practice pool",
  );
  assert.deepEqual(history.completedSessions, [plan.id]);
  assert.equal(history.coverageVersion, 1);
});
test("a week of legacy sessions survives snapshots, repeated loads, and the focused curriculum", () => {
  const week = Array.from({ length: 10 }, (_, i) => ({
    ...legacy(),
    id: `legacy-${i}`,
    complete: true,
  }));
  const current = makeDailyPlan(
    "history-test",
    "2026-10-14",
    settings,
    10,
    undefined,
    [],
    {},
    {
      testDate: "2026-10-17",
      coveredUnits: ["english:sentence-structure:original:0"],
    },
  );
  const before = JSON.stringify(current);
  const history = dailyHistory([current, ...week]);
  assert.equal(history.completedSessions.length, 10);
  const snapshot = { ...current, course: { ...current.course!, ...history } };
  assert.deepEqual(dailyHistory([snapshot]), history);
  assert.equal(
    JSON.stringify(current),
    before,
    "leave the active plan and checkpoints intact",
  );
  const coverage = dailyCoverage(
    snapshot,
    settings,
    snapshot.course,
    snapshot.date,
  );
  assert.equal(coverage.completedSessions, 10);
  assert(
    coverage.covered > 3,
    "legacy coverage must not disappear at the curriculum change",
  );
  const next = makeDailyPlan(
    "history-test",
    "2026-10-15",
    settings,
    11,
    undefined,
    [],
    {},
    snapshot.course,
  );
  for (const block of next.blocks)
    if (!block.reviewOnly)
      for (const unit of blockUnits(block))
        assert(!history.coveredUnits.includes(unit.courseId ?? unit.id));
});
test("unfinished sessions earn no completion or unpracticed skills; finished sessions count once", () => {
  const plan = legacy();
  plan.complete = false;
  assert.deepEqual(dailyHistory([plan]).coveredUnits, []);
  assert.deepEqual(dailyHistory([plan]).completedSessions, []);
  plan.complete = true;
  const history = dailyHistory([plan, plan]);
  assert.equal(history.completedSessions.length, 1);
  const course = { testDate: "2026-10-17", ...history };
  assert.equal(
    dailyCoverage({ ...plan, course }, settings, course, "2026-10-14")
      .completedSessions,
    1,
  );
});
