import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSchedule, itemKey } from "../src/lib/plan";
import { getTopics } from "../src/lib/content";
test("English plan uses Chicago calendar date after UTC midnight and stops before test day", () => {
  const plan = buildSchedule(
    getTopics(),
    "2026-10-17",
    new Date("2026-10-11T01:00:00Z"),
  );
  const today = plan.days.find((d) => d.isToday)!;
  assert(today);
  assert.equal(today.date.getDate(), 10);
  assert.equal(plan.days.at(-1)!.date.getDate(), 16);
  assert(plan.days.every((d) => d.date < plan.examDate));
});
test("English task IDs stay stable across date changes and the plan ends on test day", () => {
  const before = buildSchedule(
    getTopics(),
    "2026-10-17",
    new Date("2026-10-10T18:00:00Z"),
  );
  const after = buildSchedule(
    getTopics(),
    "2026-10-17",
    new Date("2026-10-11T18:00:00Z"),
  );
  const ids = (plan: typeof before) =>
    plan.days.flatMap((d) =>
      d.items.map((item, i) => itemKey(item, d.dayNum, i)),
    );
  assert.deepEqual(ids(before), ids(after));
  assert.equal(
    buildSchedule(getTopics(), "2026-10-17", new Date("2026-10-17T18:00:00Z"))
      .days.length,
    0,
  );
});

test("English countdown agrees with the plan calendar", async () => {
  const { daysUntil } = await import("../src/lib/format");
  assert.equal(daysUntil("2026-10-17", new Date("2026-10-11T01:00:00Z")), 7);
});

test("English assigns work now throughout the twelve-day prep window and preserves legacy manual checks", () => {
  const topics = getTopics();
  const plan = buildSchedule(
    topics,
    "2026-10-17",
    new Date("2026-10-06T18:00:00Z"),
  );
  assert.equal(plan.days.length, 12);
  const today = plan.days.find((d) => d.isToday)!;
  assert.equal(today.date.getDate(), 6);
  assert(today.items.some((i) => i.kind === "learn"));
  const legacyTotal =
    Math.max(
      1,
      Math.ceil(topics.filter((t) => t.part !== "final").length / 2.5),
    ) + 2;
  const manual = plan.days
    .flatMap((d) =>
      d.items.map((i, index) => ({ i, key: itemKey(i, d.dayNum, index) })),
    )
    .filter((x) => x.i.kind !== "learn");
  assert.deepEqual(
    manual.map((x) => x.key),
    [
      `d${legacyTotal - 1}-0-exam`,
      `d${legacyTotal - 1}-1-review`,
      `d${legacyTotal}-0-weak`,
      `d${legacyTotal}-1-rest`,
    ],
  );
});
