import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSchedule,
  buildStudyPlan,
  type PlanItem,
  type PlanProgress,
  type StudyPlan,
} from "../src/lib/act/plan";

const target = "2026-10-17";
const start = "2026-10-05";
const date = (day: number, hour = 12) => new Date(2026, 9, day, hour);
const fresh = (): PlanProgress => ({ startDate: start, completedTaskIds: [] });
const sum = (items: readonly PlanItem[]) =>
  items.reduce((total, item) => total + item.minutes, 0);
const allItems = (plan: StudyPlan) => [
  ...plan.days.flatMap((day) => day.items),
  ...plan.deferred,
];
const ids = (items: readonly PlanItem[]) => items.map((item) => item.id);
const canonical = (budget = 75) => buildSchedule(target, budget, date(5));

function assertAccountedFor(plan: StudyPlan, expected: readonly PlanItem[]) {
  const actualIds = ids(allItems(plan));
  assert.equal(new Set(actualIds).size, actualIds.length, "no duplicated task");
  assert.deepEqual([...actualIds].sort(), [...ids(expected)].sort());
}

test("a missed October 5 rolls the diagnostic to October 6 with exact original IDs", () => {
  const original = canonical();
  const plan = buildStudyPlan(target, 75, fresh(), date(6));
  assert.equal(plan.days[0].date, "2026-10-06");
  assert.deepEqual(plan.days[0].items, original[0].items);
  assert.equal(plan.days[0].items[0].id, "2026-10-05:science-diagnostic");
  assert.ok(plan.days[0].items[0].title.includes("focused diagnostic"));
  assertAccountedFor(
    plan,
    original.flatMap((day) => day.items),
  );
});

test("an untouched plan preserves its original releases and daily layout", () => {
  const original = canonical();
  const plan = buildStudyPlan(target, 75, fresh(), date(5));
  assert.deepEqual(plan.days, original);
  assert.deepEqual(plan.deferred, []);
});

test("carryover stays within 15/30/60/75/90 minute budgets and accounts for every task", () => {
  for (const budget of [15, 30, 60, 75, 90]) {
    const original = canonical(budget);
    const plan = buildStudyPlan(target, budget, fresh(), date(8));
    assert.ok(plan.days.every((day) => sum(day.items) <= budget));
    assert.equal(plan.days.at(-1)?.date, "2026-10-16");
    assert.ok(sum(plan.days.at(-1)!.items) <= Math.min(45, budget));
    assert.ok(
      plan.days
        .at(-1)!
        .items.every((item) => /light-review|digital-checklist/.test(item.id)),
    );
    assert.ok(plan.deferred.length > 0);
    assertAccountedFor(
      plan,
      original.flatMap((day) => day.items),
    );
  }
});

test("partly completed missed days carry only remaining tasks, including legacy checks", () => {
  const original = canonical();
  const finished = original[0].items[0].id;
  for (const completionDates of [undefined, { [finished]: start }]) {
    const progress: PlanProgress = {
      ...fresh(),
      completedTaskIds: [finished],
      completionDates,
    };
    const plan = buildStudyPlan(target, 75, progress, date(6));
    assert.deepEqual(plan.days[0].items, original[0].items.slice(1));
    assert.ok(!ids(allItems(plan)).includes(finished));
    assertAccountedFor(
      plan,
      original
        .flatMap((day) => day.items)
        .filter((item) => item.id !== finished),
    );
  }
});

test("checking carried tasks today preserves layout and does not refill their slots", () => {
  const before = buildStudyPlan(target, 75, fresh(), date(6));
  const currentIds = ids(before.days[0].items);
  for (let count = 1; count <= currentIds.length; count += 1) {
    const completedTaskIds = currentIds.slice(0, count);
    const after = buildStudyPlan(
      target,
      75,
      {
        ...fresh(),
        completedTaskIds,
        completionDates: Object.fromEntries(
          completedTaskIds.map((id) => [id, "2026-10-06"]),
        ),
      },
      date(6),
    );
    assert.deepEqual(after, before);
  }
});

test("the next day removes yesterday's carried completion and retains only remaining work", () => {
  const original = canonical();
  const completedTaskIds = [original[0].items[0].id];
  const progress: PlanProgress = {
    ...fresh(),
    completedTaskIds,
    completionDates: { [completedTaskIds[0]]: "2026-10-06" },
  };
  const plan = buildStudyPlan(target, 75, progress, date(7));
  assert.deepEqual(plan.days[0].items, original[0].items.slice(1));
  assert.ok(!ids(allItems(plan)).includes(completedTaskIds[0]));
  assertAccountedFor(
    plan,
    original
      .flatMap((day) => day.items)
      .filter((item) => !completedTaskIds.includes(item.id)),
  );
});

test("completed-today tasks are pinned to Today even when older unfinished sessions precede them", () => {
  const original = canonical();
  const completed = original[1].items[0];
  const plan = buildStudyPlan(
    target,
    75,
    {
      ...fresh(),
      completedTaskIds: [completed.id],
      completionDates: { [completed.id]: "2026-10-06" },
    },
    date(6),
  );
  assert.ok(ids(plan.days[0].items).includes(completed.id));
  assert.ok(!ids(plan.deferred).includes(completed.id));
  assert.equal(
    plan.days.filter((day) => ids(day.items).includes(completed.id)).length,
    1,
  );
  assert.ok(sum(plan.days[0].items) <= 75);
  assertAccountedFor(
    plan,
    original.flatMap((day) => day.items),
  );
});

test("full sections carry with their review, while an earlier completed section leaves review-only work", () => {
  const original = canonical();
  const plan = buildStudyPlan(target, 75, fresh(), date(8));
  for (const exam of ["math-1", "science-1", "math-2", "science-2"]) {
    const originalGroup = original.find((day) =>
      day.items.some((item) => item.href === `/exam/${exam}`),
    )!;
    const locations = [...plan.days.map((day) => day.items), plan.deferred];
    const located = locations.find((items) =>
      items.some((item) => item.href === `/exam/${exam}`),
    )!;
    assert.ok(
      originalGroup.items.every((item) => ids(located).includes(item.id)),
    );
  }
  const math = original.find((day) =>
    day.items.some((item) => item.href === "/exam/math-1"),
  )!;
  const section = math.items.find((item) => item.href === "/exam/math-1")!;
  const review = math.items.find((item) => item.id.includes("section-review"))!;
  const partial = buildStudyPlan(
    target,
    75,
    {
      ...fresh(),
      completedTaskIds: [section.id],
      completionDates: { [section.id]: "2026-10-07" },
    },
    date(8),
  );
  assert.ok(!ids(allItems(partial)).includes(section.id));
  assert.deepEqual(
    allItems(partial).find((item) => item.id === review.id),
    review,
  );
  assertAccountedFor(
    partial,
    original
      .flatMap((day) => day.items)
      .filter((item) => item.id !== section.id),
  );
});

test("October 16 stays light and explicitly defers all unfinished heavy work", () => {
  const original = canonical();
  const plan = buildStudyPlan(target, 75, fresh(), date(16));
  assert.equal(plan.days.length, 1);
  assert.equal(plan.days[0].date, "2026-10-16");
  assert.deepEqual(plan.days[0].items, original.at(-1)!.items);
  assert.equal(sum(plan.days[0].items), 45);
  assert.deepEqual(
    plan.deferred,
    original.slice(0, -1).flatMap((day) => day.items),
  );
  assertAccountedFor(
    plan,
    original.flatMap((day) => day.items),
  );
  assert.deepEqual(buildStudyPlan(target, 75, fresh(), date(17)), {
    days: [],
    deferred: [],
  });
});

test("already completed heavy work on the final day stays visible but creates no heavy assignment", () => {
  const original = canonical();
  const completed = original[0].items[0];
  const plan = buildStudyPlan(
    target,
    75,
    {
      ...fresh(),
      completedTaskIds: [completed.id],
      completionDates: { [completed.id]: "2026-10-16" },
    },
    date(16),
  );
  const todayItems = plan.days[0].items;
  assert.ok(ids(todayItems).includes(completed.id));
  assert.ok(!ids(plan.deferred).includes(completed.id));
  const pending = todayItems.filter((item) => item.id !== completed.id);
  assert.ok(
    pending.every((item) => /light-review|digital-checklist/.test(item.id)),
  );
  assert.ok(sum(pending) <= 45);
  assert.ok(sum(todayItems) <= 75);
  assertAccountedFor(
    plan,
    original.flatMap((day) => day.items),
  );
});

test("intentional extra completions remain visible without assigning more pending work today", () => {
  const original = canonical();
  const completedTaskIds = ids(
    original.slice(0, 2).flatMap((day) => day.items),
  );
  const plan = buildStudyPlan(
    target,
    75,
    {
      ...fresh(),
      completedTaskIds,
      completionDates: Object.fromEntries(
        completedTaskIds.map((id) => [id, "2026-10-06"]),
      ),
    },
    date(6),
  );
  assert.deepEqual(ids(plan.days[0].items), completedTaskIds);
  assert.ok(sum(plan.days[0].items) > 75);
  assert.ok(plan.deferred.every((item) => !completedTaskIds.includes(item.id)));
  assert.ok(plan.days.slice(1).every((day) => sum(day.items) <= 75));
  assertAccountedFor(
    plan,
    original.flatMap((day) => day.items),
  );
});

test("unknown completion IDs do not affect known tasks or create new assignments", () => {
  const expected = buildStudyPlan(target, 75, fresh(), date(6));
  assert.deepEqual(
    buildStudyPlan(
      target,
      75,
      {
        ...fresh(),
        completedTaskIds: ["unknown:task"],
        completionDates: { "unknown:task": "2026-10-06" },
      },
      date(6),
    ),
    expected,
  );
});

test("later targets keep the date fixed, respect releases, and still account for carryover", () => {
  const laterTarget = "2026-10-22";
  const original = buildSchedule(laterTarget, 60, date(5));
  const plan = buildStudyPlan(laterTarget, 60, fresh(), date(6));
  assert.equal(plan.days.at(-1)?.date, "2026-10-21");
  assert.ok(
    plan.days.every(
      (day) => day.date >= "2026-10-06" && day.date < laterTarget,
    ),
  );
  assert.ok(plan.days.every((day) => sum(day.items) <= 60));
  assert.ok(
    plan.days.every((day) =>
      day.items.every((item) => item.id.slice(0, 10) <= day.date),
    ),
  );
  assertAccountedFor(
    plan,
    original.flatMap((day) => day.items),
  );
});

test("local calendar days remain stable across late-night, daylight saving, and year boundaries", () => {
  assert.deepEqual(
    buildStudyPlan(target, 75, fresh(), date(6, 1)),
    buildStudyPlan(target, 75, fresh(), date(6, 23)),
  );
  for (const scenario of [
    {
      target: "2026-11-03",
      start: new Date(2026, 9, 30, 12),
      now: new Date(2026, 10, 1, 12),
      expectedDays: ["2026-11-01", "2026-11-02"],
    },
    {
      target: "2027-01-02",
      start: new Date(2026, 11, 28, 12),
      now: new Date(2026, 11, 30, 12),
      expectedDays: ["2026-12-30", "2026-12-31", "2027-01-01"],
    },
  ]) {
    const original = buildSchedule(scenario.target, 75, scenario.start);
    const startDate = original[0].date;
    const plan = buildStudyPlan(
      scenario.target,
      75,
      { startDate, completedTaskIds: [] },
      scenario.now,
    );
    assert.deepEqual(
      plan.days.map((day) => day.date),
      scenario.expectedDays,
    );
    assert.ok(plan.days.every((day) => sum(day.items) <= 75));
    assertAccountedFor(
      plan,
      original.flatMap((day) => day.items),
    );
  }
});
