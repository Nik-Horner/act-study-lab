import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { dailyDate } from "../src/lib/daily-date";
import * as server from "../src/lib/formula-server";
import { formulaDay } from "../src/lib/formula-schedule";

type Row = Record<string, unknown>;
function fixture() {
  const today = dailyDate();
  const testDate = new Date(Date.parse(today) + 14 * 86400000)
    .toISOString()
    .slice(0, 10);
  let owner: string | null = "account-a";
  const rows: Record<string, Row[]> = {
    profiles: [
      { id: owner, test_date: testDate },
      { id: "account-b", test_date: testDate },
    ],
    plan_checks: [],
    exam_attempts: [],
  };
  const fail = new Set<string>();
  class Query {
    filters: ((row: Row) => boolean)[] = [];
    from = 0;
    to = Infinity;
    constructor(public table: string) {}
    select() {
      return this;
    }
    eq(key: string, value: unknown) {
      this.filters.push((row) => row[key] === value);
      return this;
    }
    like(key: string, value: string) {
      this.filters.push((row) =>
        String(row[key]).startsWith(value.replace(/%$/, "")),
      );
      return this;
    }
    order() {
      return this;
    }
    range(from: number, to: number) {
      this.from = from;
      this.to = to;
      return this;
    }
    result() {
      return {
        data: rows[this.table]
          .filter((row) => this.filters.every((filter) => filter(row)))
          .slice(this.from, this.to + 1),
        error: fail.has(this.table) ? { message: "Unavailable" } : null,
      };
    }
    then(resolve: (result: unknown) => unknown) {
      return Promise.resolve(this.result()).then(resolve);
    }
    async maybeSingle() {
      const result = this.result();
      return { ...result, data: result.data[0] ?? null };
    }
    async insert(row: Row) {
      if (fail.has("insert")) return { error: { message: "Unavailable" } };
      if (rows[this.table].some((prior) => prior.id === row.id))
        return { error: { code: "23505" } };
      rows[this.table].push(row);
      return { error: null };
    }
    async upsert(row: Row) {
      if (fail.has("upsert")) return { error: { message: "Unavailable" } };
      if (
        !rows[this.table].some(
          (prior) =>
            prior.user_id === row.user_id && prior.item_key === row.item_key,
        )
      )
        rows[this.table].push(row);
      return { error: null };
    }
  }
  const db = {
    auth: {
      getUser: async () => ({ data: { user: owner ? { id: owner } : null } }),
    },
    from: (table: string) => new Query(table),
  };
  const compiled = ts.transpileModule(
    readFileSync(
      new URL("../src/app/api/formulas/route.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: loadedModule,
    exports: loadedModule.exports,
    Response,
    Error,
    require: (name: string) => {
      if (name === "@/lib/supabase/server")
        return { createClient: async () => db };
      if (name === "@/lib/daily-date") return { dailyDate: () => today };
      if (name === "@/lib/formula-server") return server;
      throw new Error(name);
    },
  });
  const { POST } = loadedModule.exports as {
    POST: (request: Request) => Promise<Response>;
  };
  const call = (overrides: Row = {}) =>
    POST(
      new Request("https://qa.invalid/api/formulas", {
        method: "POST",
        body: JSON.stringify({
          ownerId: "account-a",
          date: today,
          cardId: "slope",
          rating: "remembered",
          ...overrides,
        }),
      }),
    );
  return {
    today,
    testDate,
    db: db as unknown as Parameters<typeof server.loadFormulaDay>[0],
    rows,
    fail,
    call,
    setOwner: (value: string | null) => {
      owner = value;
    },
  };
}

test("formula API persists an immutable daily packet and idempotent account-scoped ratings", async () => {
  const f = fixture();
  assert.equal((await f.call()).status, 200);
  assert.equal((await f.call()).status, 200);
  assert.equal(f.rows.exam_attempts.length, 1);
  assert.equal(f.rows.plan_checks.length, 1);
  const a = await server.loadFormulaDay(f.db, "account-a", f.today, f.testDate);
  assert(!a.day.remaining.includes("slope"));
  assert.equal(a.day.recalled, 0);
  assert.deepEqual(a.day.ids, formulaDay([], f.today, f.testDate).ids);
  const b = await server.loadFormulaDay(f.db, "account-b", f.today, f.testDate);
  assert(b.day.remaining.includes("slope"));
  assert.equal(b.saved, false);
});

test("formula API rejects stale accounts, wrong days, invalid ratings, and unassigned cards before writing", async () => {
  for (const [overrides, status] of [
    [{ ownerId: "account-b" }, 409],
    [{ date: "2001-01-01" }, 409],
    [{ rating: "mastered" }, 400],
    [{ cardId: "nonexistent" }, 409],
    [{ cardId: "circle-area" }, 409],
  ] as [Row, number][]) {
    const f = fixture();
    assert.equal((await f.call(overrides)).status, status);
    assert.equal(f.rows.exam_attempts.length + f.rows.plan_checks.length, 0);
  }
  const f = fixture();
  f.setOwner(null);
  assert.equal((await f.call()).status, 401);
});

test("a stale tab cannot mark an already-finished card missed, while successful-save retries stay idempotent", async () => {
  const f = fixture();
  assert.equal((await f.call()).status, 200);
  assert.equal((await f.call({ rating: "again" })).status, 409);
  assert.equal(f.rows.plan_checks.length, 1);
  assert(
    !f.rows.plan_checks.some((row) => String(row.item_key).includes(":miss:")),
  );
  assert.equal((await f.call()).status, 200);
  assert.equal(f.rows.plan_checks.length, 1);
});

test("formula save/read failures remain errors and retries recover saved work", async () => {
  for (const failure of [
    "profiles",
    "plan_checks",
    "exam_attempts",
    "insert",
    "upsert",
  ]) {
    const f = fixture();
    f.fail.add(failure);
    assert.equal((await f.call()).status, 503, failure);
    assert.equal(f.rows.plan_checks.length, 0);
    f.fail.clear();
    assert.equal((await f.call()).status, 200);
    assert.equal(f.rows.plan_checks.length, 1);
  }
});

test("formula history reads beyond one database page and rejects broken saved packets", async () => {
  const f = fixture();
  f.rows.plan_checks.push(
    ...Array.from({ length: 1100 }, (_, i) => ({
      user_id: "account-a",
      item_key: `formula:old-${i}:recall:2026-01-01`,
    })),
    { user_id: "account-a", item_key: `formula:slope:recall:${f.today}` },
  );
  const state = await server.loadFormulaDay(
    f.db,
    "account-a",
    f.today,
    f.testDate,
  );
  assert(!state.day.ids.includes("slope"));
  f.rows.exam_attempts.push({
    id: server.formulaPacketId("account-a", f.today),
    user_id: "account-a",
    exam_id: "formula:daily",
    answers: { date: f.today, ids: ["broken"] },
  });
  assert.equal((await f.call()).status, 503);
});
