import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSchedule, buildStudyPlan } from "../src/lib/act/plan";
test("Reading plans use only Reading tasks and both fresh full forms before test day", () => {
  const plan = buildSchedule(
    "2026-10-17",
    75,
    new Date("2026-10-05T12:00:00"),
    "reading",
  );
  const items = plan.flatMap((d) => d.items);
  assert(items.filter((i) => i.href.startsWith("/exam/reading-")).length === 2);
  assert(
    items.every(
      (i) => !i.title.startsWith("Math:") && !i.title.startsWith("Science:"),
    ),
  );
  assert(
    plan.every(
      (d) =>
        d.date < "2026-10-17" &&
        d.items.reduce((n, i) => n + i.minutes, 0) <= 75,
    ),
  );
  assert(plan.at(-1)!.items.reduce((n, i) => n + i.minutes, 0) <= 45);
});
test("missed Reading work carries within budget with stable IDs and explicit overflow", () => {
  const canonical = buildSchedule(
    "2026-10-17",
    75,
    new Date("2026-10-05T12:00:00"),
    "reading",
  );
  const plan = buildStudyPlan(
    "2026-10-17",
    75,
    { startDate: "2026-10-05", completedTaskIds: [] },
    new Date("2026-10-08T12:00:00"),
    "reading",
  );
  assert.deepEqual(plan.days[0].items, canonical[0].items);
  assert(
    plan.days.every((d) => d.items.reduce((n, i) => n + i.minutes, 0) <= 75),
  );
  const all = [...plan.days.flatMap((d) => d.items), ...plan.deferred];
  assert.equal(
    new Set(all.map((i) => i.id)).size,
    canonical.flatMap((d) => d.items).length,
  );
  assert(plan.deferred.length > 0);
});
