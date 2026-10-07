import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readStudySettings,
  validateStudySettings,
} from "../src/lib/account-settings";
import { hydrateCloudState } from "../src/lib/act/cloud-records";
import { subjectBaseline, validateState } from "../src/lib/act/progress-model";
const settings = {
  scores: { english: 32, math: 34, reading: 30, science: 27 },
  minutesPerDay: 90,
};
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
    { ...settings, minutesPerDay: 120 },
    { ...settings, scores: { ...settings.scores, math: 34.5 } },
    { ...settings, scores: { ...settings.scores, reading: 37 } },
    { ...settings, scores: { english: 32, math: 34, science: 27 } },
  ])
    assert.equal(validateStudySettings(value), null);
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
