import { test } from "node:test";
import assert from "node:assert/strict";
import cards from "../src/content/math-formula-cards.json";
import { formulaDay, validFormulaPacket } from "../src/lib/formula-schedule";

const date = (offset: number) =>
  new Date(Date.parse("2026-10-01") + offset * 86400000)
    .toISOString()
    .slice(0, 10);
const recall = (id: string, day: string) => `formula:${id}:recall:${day}`;

test("daily scheduling can reach 36 twice-recalled formulas before test day across short and long horizons", () => {
  for (const horizon of [2, 3, 7, 14, 30, 90]) {
    const keys: string[] = [];
    for (let day = 0; day < horizon; day++) {
      const packet = formulaDay(keys, date(day), date(horizon));
      assert(packet.ids.length > 0 && packet.ids.length <= 36);
      assert.equal(new Set(packet.ids).size, packet.ids.length);
      keys.push(...packet.ids.map((id) => recall(id, date(day))));
      const resumed = formulaDay(keys, date(day), date(horizon), packet.ids);
      assert.deepEqual(resumed.remaining, []);
      assert.equal(resumed.minutes, Math.ceil(packet.ids.length / 2));
    }
    assert.equal(
      formulaDay(keys, date(horizon - 1), date(horizon)).recalled,
      36,
      `${horizon} study days`,
    );
  }
});

test("one-day retries never manufacture memorization and a miss requires two later recall days", () => {
  const id = cards[0].id;
  const keys = [recall(id, date(0)), recall(id, date(0))];
  assert.equal(formulaDay(keys, date(0), date(10)).recalled, 0);
  keys.push(recall(id, date(1)));
  assert.equal(formulaDay(keys, date(1), date(10)).recalled, 1);
  keys.push(`formula:${id}:miss:${date(2)}`, recall(id, date(2)));
  assert.equal(formulaDay(keys, date(2), date(10)).recalled, 0);
  keys.push(recall(id, date(3)));
  assert.equal(formulaDay(keys, date(3), date(10)).recalled, 0);
  keys.push(recall(id, date(4)));
  assert.equal(formulaDay(keys, date(4), date(10)).recalled, 1);
});

test("saved packets keep remaining work stable across reloads, misses, and test date changes", () => {
  const initial = formulaDay([], date(0), date(14));
  const keys = [
    recall(initial.ids[0], date(0)),
    `formula:${initial.ids[1]}:miss:${date(0)}`,
  ];
  const resumed = formulaDay(keys, date(0), date(2), initial.ids);
  assert.deepEqual(resumed.ids, initial.ids);
  assert.deepEqual(resumed.remaining, initial.ids.slice(1));
  assert.equal(formulaDay([], date(0), date(0)).daysLeft, 0);
  assert.equal(formulaDay([], date(0), date(1)).recalled, 0);
});

test("stored packets reject wrong dates, duplicate IDs, and unknown formulas", () => {
  assert(
    validFormulaPacket(
      { date: date(0), ids: cards.map((card) => card.id) },
      date(0),
    ),
  );
  for (const value of [
    null,
    {},
    { date: date(1), ids: [] },
    { date: date(0), ids: ["unknown"] },
    { date: date(0), ids: ["slope", "slope"] },
  ])
    assert.equal(validFormulaPacket(value, date(0)), false);
});
