import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transpileModule, ScriptTarget } from "typescript";

const source = readFileSync(
  new URL("../src/components/DailyStudy.tsx", import.meta.url),
  "utf8",
);
const choice = source.slice(
  source.indexOf("  function chooseFormulaReview("),
  source.indexOf("  async function load("),
);
const load = source.slice(
  source.indexOf("  async function load("),
  source.indexOf("  useEffect(() => {"),
);
const script = transpileModule(
  `${choice}\n${load}\nglobalThis.choose = chooseFormulaReview; globalThis.reload = load;`,
  { compilerOptions: { target: ScriptTarget.ES2022 } },
).outputText;

function learner(storage = new Map<string, string>(), unavailable = false) {
  const data = {
    userId: "student-a",
    today: "2026-10-15",
    saved: true,
    plan: { id: "saved-plan", complete: false },
    answers: { "saved-question": 2 },
    formulas: {
      ids: ["slope", "distance"],
      remaining: ["distance"],
      recalled: 12,
    },
  };
  const requests: string[] = [];
  let later = false;
  let resumed = false;
  const context = vm.createContext({
    data,
    runner: true,
    localStorage: {
      getItem(key: string) {
        if (unavailable) throw new Error("Storage unavailable");
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        if (unavailable) throw new Error("Storage unavailable");
        storage.set(key, value);
      },
      removeItem(key: string) {
        if (unavailable) throw new Error("Storage unavailable");
        storage.delete(key);
      },
    },
    setFormulasLater(value: boolean) {
      later = value;
    },
    setReview() {},
    setRevisitLesson() {},
    setData() {},
    setError(error: string | null) {
      assert.equal(error, null);
    },
    setStarted(value: boolean) {
      resumed = value;
    },
    router: {
      replace() {
        assert.fail("A saved learner must not be redirected");
      },
    },
    fetch: async (url: string, init?: RequestInit) => {
      assert.equal(
        init?.method,
        undefined,
        "navigation must not save a rating or complete work",
      );
      requests.push(url);
      return Response.json(data);
    },
  });
  vm.runInContext(script, context);
  return {
    context,
    data,
    storage,
    requests,
    later: () => later,
    resumed: () => resumed,
  };
}

test("continuing lessons preserves formula ratings, answers, and unfinished work across reload", async () => {
  const first = learner();
  const before = structuredClone(first.data);
  first.context.choose(true);
  assert(first.later());
  assert.deepEqual(first.data, before);
  assert.deepEqual(first.requests, []);

  const returned = learner(first.storage);
  await returned.context.reload();
  assert(
    returned.later(),
    "the same student can resume lessons without another formula gate",
  );
  assert(returned.resumed());
  assert.deepEqual(returned.data, before);
  assert.deepEqual(returned.requests, ["/api/daily"]);

  returned.context.choose(false);
  assert.equal(
    returned.later(),
    false,
    "explicit review reopens the remaining formulas",
  );
  assert.deepEqual(returned.data.formulas.remaining, ["distance"]);
  assert.equal(returned.storage.size, 0);
});

test("formula deferral belongs to this student and this study day", async () => {
  const first = learner();
  first.context.choose(true);
  for (const patch of [{ userId: "student-b" }, { today: "2026-10-16" }]) {
    const other = learner(first.storage);
    Object.assign(other.data, patch);
    await other.context.reload();
    assert.equal(other.later(), false);
  }
});

test("finished lessons can reopen pending formulas without undoing completion", () => {
  const state = learner();
  state.data.plan.complete = true;
  const before = structuredClone(state.data);
  state.context.choose(true);
  state.context.choose(false);
  assert.equal(state.later(), false);
  assert.deepEqual(state.data, before);
  assert.deepEqual(state.requests, []);
});

test("unavailable browser storage does not prevent continuing lessons", () => {
  const state = learner(new Map(), true);
  const before = structuredClone(state.data);
  assert.doesNotThrow(() => state.context.choose(true));
  assert(state.later());
  assert.deepEqual(state.data, before);
});
