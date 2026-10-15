import { test } from "node:test";
import assert from "node:assert/strict";
import {
  practicePriority,
  makeDailyPlan,
  dailyDate,
} from "../src/lib/daily-plan";
import { hydrateCloudState } from "../src/lib/act/cloud-records";

test("challenge selection follows subject baseline and actual goal without inventing a score", () => {
  assert(practicePriority("hard", 34, 36) < practicePriority("easy", 34, 36));
  assert(practicePriority("easy", 19, 24) < practicePriority("hard", 19, 24));
  assert(practicePriority("medium", 27, 30) < practicePriority("hard", 27, 30));
  assert.equal(
    practicePriority("hard", null, 36),
    practicePriority("easy", null, 36),
  );
});
test("different students retain their own dates, targets, baselines and Science choice", () => {
  for (const [date, target, math, science] of [
    ["2026-10-17", 36, 34, true],
    ["2027-06-12", 24, 18, false],
  ] as const) {
    const settings = {
      scores: { english: 22, math, reading: 23, science: 25 },
      minutesPerDay: 75,
      includeScience: science,
    };
    const p = makeDailyPlan(
      `student-${target}`,
      "2026-10-14",
      settings,
      0,
      undefined,
      [],
      {},
      { testDate: date, targetScore: target, coveredUnits: [] },
    );
    assert.equal(p.course?.testDate, date);
    assert.equal(p.course?.targetScore, target);
    assert.equal(
      p.blocks.some((b) => b.subject === "science"),
      science,
    );
    assert.equal(
      p.blocks.reduce((n, b) => n + b.minutes, 0),
      75,
    );
  }
  assert.equal(dailyDate(new Date("2026-10-15T01:00:00Z")), "2026-10-14");
});
test("cloud personalization takes real profile values rather than another student defaults", () => {
  const profile = {
    id: "qa",
    display_name: null,
    current_score: 21,
    target_score: 25,
    test_date: "2027-06-12",
    created_at: "2026-10-14T00:00:00Z",
  };
  const state = hydrateCloudState([], profile, [], "America/Chicago", {
    act_study_settings: {
      scores: { english: 21, math: 19, reading: 22, science: null },
      minutesPerDay: 60,
    },
  });
  assert.equal(state.profile.testDate, "2027-06-12");
  assert.equal(state.profile.targetScore, 25);
  assert.equal(state.profile.mathBaseline, 19);
  assert.equal(state.profile.scienceBaseline, null);
  assert.equal(state.profile.minutesPerDay, 60);
});
