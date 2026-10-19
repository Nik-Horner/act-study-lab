import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readStudySettings,
  validateStudySettings,
  geometryFirst,
  hasCustomStudyPreferences,
  standardStudyPreferences,
  planningScores,
  hasSavedStudyTime,
} from "../src/lib/account-settings";
import { hydrateCloudState } from "../src/lib/act/cloud-records";
import { subjectBaseline, validateState } from "../src/lib/act/progress-model";
import { dailyScopes } from "../src/lib/daily-plan";
const settings = {
  scores: { english: 32, math: 34, reading: 30, science: 27 },
  minutesPerDay: 90,
};

test("onboarding distinguishes a chosen study time from a legacy fallback", () => {
  assert.equal(hasSavedStudyTime(), false);
  assert.equal(
    hasSavedStudyTime({ act_study_settings: { minutesPerDay: 7 } }),
    false,
  );
  for (const minutesPerDay of [15, 30, 75, 240])
    assert.equal(
      hasSavedStudyTime({ act_study_settings: { ...settings, minutesPerDay } }),
      true,
    );
});

test("standard plans cover the full Math course at every starting score", () => {
  for (const math of [null, 18, 24, 31, 32, 34, 36]) {
    const student = readStudySettings({
      act_study_settings: { ...settings, scores: { ...settings.scores, math } },
    });
    assert.equal(geometryFirst(student), false);
    assert.equal(hasCustomStudyPreferences(student), false);
    const topics = new Set(
      dailyScopes("math", student).map((scope) => scope.topic.slug),
    );
    assert.equal(topics.size, 8);
    assert(topics.has("math-algebra"));
    assert(topics.has("math-geometry"));
    assert(topics.has("math-modeling"));
    assert.equal(planningScores(student).science, 27);
  }
});

test("earlier custom choices survive normal edits; standard planning is an explicit reset", () => {
  const stored = {
    ...settings,
    mathFocus: "geometry-trig" as const,
    mathCoveredTopics: ["math-algebra", "math-functions"],
    scienceScoreRepresentative: false,
    includeScience: false,
  };
  const original = JSON.stringify(stored);
  const loaded = readStudySettings({ act_study_settings: stored }, 32);
  assert.deepEqual(loaded, stored);
  assert(hasCustomStudyPreferences(loaded));
  const changed = validateStudySettings({ ...loaded, minutesPerDay: 45 });
  assert(changed);
  assert.deepEqual(changed.mathCoveredTopics, stored.mathCoveredTopics);
  assert.equal(changed.mathFocus, "geometry-trig");
  assert.equal(changed.scienceScoreRepresentative, false);
  const standard = standardStudyPreferences(changed);
  assert(!hasCustomStudyPreferences(standard));
  assert.equal(geometryFirst(standard), false);
  assert.deepEqual(standard.scores, stored.scores);
  assert.equal(standard.minutesPerDay, 45);
  assert.equal(standard.includeScience, false);
  assert.equal(planningScores(standard).science, 27);
  assert.equal(
    new Set(dailyScopes("math", standard).map((scope) => scope.topic.slug))
      .size,
    8,
  );
  assert.equal(JSON.stringify(stored), original);
});
test("legacy accounts keep English score without inventing other baselines", () => {
  assert.deepEqual(readStudySettings({}, 32), {
    scores: { english: 32, math: null, reading: null, science: null },
    minutesPerDay: 75,
  });
  assert.equal(
    readStudySettings(
      {
        act_study_settings: {
          ...settings,
          scores: { ...settings.scores, english: 10 },
        },
      },
      32,
    ).scores.english,
    32,
  );
});
test("section settings validate every score and budget, including explicit blanks", () => {
  assert.deepEqual(validateStudySettings(settings), settings);
  assert(
    validateStudySettings({
      ...settings,
      scores: { ...settings.scores, science: null },
    }),
  );
  for (const value of [
    null,
    [],
    {},
    { ...settings, minutesPerDay: 241 },
    { ...settings, minutesPerDay: 14 },
    { ...settings, minutesPerDay: 30.5 },
    { ...settings, minutesPerDay: "30" },
    { ...settings, scores: { ...settings.scores, math: 34.5 } },
    { ...settings, scores: { ...settings.scores, reading: 37 } },
    { ...settings, scores: { english: 32, math: 34, science: 27 } },
  ])
    assert.equal(validateStudySettings(value), null);
});
test("Science is optional without clearing its saved score", () => {
  for (const includeScience of [false, true]) {
    const preference = { ...settings, includeScience };
    assert.deepEqual(validateStudySettings(preference), preference);
    const restored = readStudySettings({ act_study_settings: preference }, 32);
    assert.equal(restored.includeScience, includeScience);
    assert.equal(restored.scores.science, 27);
  }
  assert.equal(
    validateStudySettings({ ...settings, includeScience: "false" }),
    null,
  );
});
test("account settings hydrate and survive validation for all three added subjects", () => {
  const state = hydrateCloudState([], null, [], "America/Chicago", {
    act_study_settings: settings,
  });
  const validated = validateState(state)!;
  assert(validated);
  assert.equal(validated.profile.minutesPerDay, 90);
  assert.equal(subjectBaseline(validated.profile, "math"), 34);
  assert.equal(subjectBaseline(validated.profile, "science"), 27);
  assert.equal(subjectBaseline(validated.profile, "reading"), 30);
});

test("custom daily minutes survive account hydration without changing preferences or scores", () => {
  for (const minutesPerDay of [15, 23, 45, 60, 75, 90, 120, 167, 240]) {
    const preference = { ...settings, minutesPerDay, includeScience: false };
    assert.deepEqual(validateStudySettings(preference), preference);
    assert.deepEqual(
      readStudySettings({ act_study_settings: preference }, 32),
      preference,
    );
    const state = hydrateCloudState([], null, [], "America/Chicago", {
      act_study_settings: preference,
    });
    assert.equal(validateState(state)?.profile.minutesPerDay, minutesPerDay);
  }
  for (const minutesPerDay of [14, 241, 20.5, "60", Infinity, NaN])
    assert.equal(
      readStudySettings({ act_study_settings: { ...settings, minutesPerDay } })
        .minutesPerDay,
      75,
    );
});
