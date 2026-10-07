import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSchedule } from "../src/lib/act/plan";

const today = new Date(2026, 9, 5, 12, 0, 0);

test("October sprint begins today and ends before the test", () => {
  const days = buildSchedule("2026-10-17", 75, today);
  assert.equal(days.length, 12);
  assert.equal(days[0].date, "2026-10-05");
  assert.equal(days.at(-1)?.date, "2026-10-16");
  assert.equal(days.filter((day) => day.isToday).length, 1);
  assert.ok(
    days[0].items.some((item) =>
      item.title.includes("Science: focused diagnostic"),
    ),
  );
  assert.ok(
    days.every((day) =>
      day.items.every(
        (item) =>
          item.minutes > 0 &&
          (item.href.startsWith("/") ||
            item.href.startsWith("https://www.act.org/")),
      ),
    ),
  );
});

test("60–90 minute budgets include full section timing and actual review", () => {
  for (const budget of [60, 75, 90]) {
    const days = buildSchedule("2026-10-17", budget, today);
    assert.ok(
      days.every(
        (day) =>
          day.items.reduce((total, item) => total + item.minutes, 0) <= budget,
      ),
    );
    const math = days
      .flatMap((day) => day.items)
      .find((item) => item.href === "/exam/math-1");
    const science = days
      .flatMap((day) => day.items)
      .find((item) => item.href === "/exam/science-1");
    assert.equal(math?.minutes, 50);
    assert.equal(science?.minutes, 40);
    for (const day of days.filter((day) =>
      day.items.some((item) => item.href.startsWith("/exam/")),
    )) {
      assert.ok(
        day.items.some(
          (item) => item.id.includes("section-review") && item.minutes >= 10,
        ),
      );
    }
  }
});

test("Science receives most preparation time; the day before the test is light", () => {
  const days = buildSchedule("2026-10-17", 75, today);
  const items = days.flatMap((day) => day.items);
  const scienceMinutes = items
    .filter((item) => item.title.startsWith("Science:"))
    .reduce((sum, item) => sum + item.minutes, 0);
  const mathMinutes = items
    .filter((item) => item.title.startsWith("Math:"))
    .reduce((sum, item) => sum + item.minutes, 0);
  assert.ok(scienceMinutes > mathMinutes);
  const finalDay = days.at(-1)!;
  assert.equal(
    finalDay.items.reduce((total, item) => total + item.minutes, 0),
    45,
  );
  assert.ok(finalDay.items.every((item) => !item.href.startsWith("/exam/")));
  assert.ok(
    finalDay.items.some((item) => item.title.startsWith("Digital ACT:")),
  );
});

test("both independent forms are used once each, followed by fresh official Science", () => {
  const items = buildSchedule("2026-10-17", 75, today).flatMap(
    (day) => day.items,
  );
  assert.equal(items.filter((item) => item.href === "/exam/math-1").length, 1);
  assert.equal(
    items.filter((item) => item.href === "/exam/science-1").length,
    1,
  );
  assert.equal(items.filter((item) => item.href === "/exam/math-2").length, 1);
  assert.equal(
    items.filter((item) => item.href === "/exam/science-2").length,
    1,
  );
  const official = items.filter((item) =>
    item.href.startsWith("https://www.act.org/"),
  );
  assert.equal(official.length, 1);
  assert.equal(official[0].minutes, 40);
  assert.ok(official[0].title.startsWith("Science:"));
});

test("canonical task IDs and content stay stable across calendar windows", () => {
  const initial = buildSchedule("2026-10-17", 75, today);
  const tomorrow = buildSchedule("2026-10-17", 75, new Date(2026, 9, 6, 12));
  assert.equal(tomorrow[0].date, "2026-10-06");
  assert.deepEqual(
    tomorrow.map((day) => ({ date: day.date, items: day.items })),
    initial.slice(1).map((day) => ({ date: day.date, items: day.items })),
  );
});

test("changing the test date adjusts the runway and no task is put in the past", () => {
  const short = buildSchedule("2026-10-08", 60, today);
  assert.equal(short.length, 3);
  assert.equal(short[0].date, "2026-10-05");
  assert.equal(short.at(-1)?.date, "2026-10-07");
  const longer = buildSchedule("2026-10-22", 75, today);
  assert.equal(longer.length, 17);
  assert.equal(longer[0].date, "2026-10-05");
  assert.equal(longer.at(-1)?.date, "2026-10-21");
  assert.ok(longer.every((day) => day.date >= "2026-10-05"));
});

test("test day, elapsed targets, and invalid calendar dates have no preparation tasks", () => {
  assert.deepEqual(buildSchedule("2026-10-05", 75, today), []);
  assert.deepEqual(buildSchedule("2026-10-04", 75, today), []);
  assert.deepEqual(buildSchedule("2026-02-30", 75, today), []);
  assert.deepEqual(buildSchedule("invalid", 75, today), []);
});

test("short sessions use timed sets, rather than claiming to fit a full ACT section", () => {
  const days = buildSchedule("2026-10-17", 30, today);
  assert.ok(
    days.every(
      (day) => day.items.reduce((sum, item) => sum + item.minutes, 0) <= 30,
    ),
  );
  assert.ok(
    days
      .flatMap((day) => day.items)
      .every((item) => !item.href.startsWith("/exam/")),
  );
  assert.ok(
    days
      .flatMap((day) => day.items)
      .some((item) => item.title.includes("timed digital question set")),
  );
});

test("calendar arithmetic remains correct across daylight saving and year boundaries", () => {
  const november = buildSchedule("2026-11-03", 75, new Date(2026, 9, 31, 12));
  assert.deepEqual(
    november.map((day) => day.date),
    ["2026-10-31", "2026-11-01", "2026-11-02"],
  );
  const year = buildSchedule("2027-01-02", 75, new Date(2026, 11, 30, 12));
  assert.deepEqual(
    year.map((day) => day.date),
    ["2026-12-30", "2026-12-31", "2027-01-01"],
  );
});
