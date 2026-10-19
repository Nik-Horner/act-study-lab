import { test } from "node:test";
import assert from "node:assert/strict";
import { learningRewards } from "../src/lib/learning-rewards";

test("earned levels credit old sessions and advance only after five complete sessions", () => {
  assert.deepEqual(learningRewards(0), {
    xp: 0,
    level: 1,
    sessionsToNextLevel: 5,
  });
  assert.deepEqual(learningRewards(4), {
    xp: 400,
    level: 1,
    sessionsToNextLevel: 1,
  });
  assert.deepEqual(learningRewards(5), {
    xp: 500,
    level: 2,
    sessionsToNextLevel: 5,
  });
  assert.deepEqual(learningRewards(10), {
    xp: 1000,
    level: 3,
    sessionsToNextLevel: 5,
  });
  assert.equal(learningRewards(4.9).level, 1);
});
