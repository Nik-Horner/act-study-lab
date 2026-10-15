import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transpileModule, ScriptTarget } from "typescript";

const dailySource = readFileSync(
  new URL("../src/components/DailyStudy.tsx", import.meta.url),
  "utf8",
);
const actionSource = dailySource.slice(
  dailySource.indexOf("  async function action("),
  dailySource.indexOf("  const step ="),
);
const actionScript = transpileModule(
  `${actionSource}\nglobalThis.runAction = action;`,
  {
    compilerOptions: { target: ScriptTarget.ES2022 },
  },
).outputText;

test("a new unsaved daily plan starts before its next step even when today's timer exists", async () => {
  for (const data of [
    {
      saved: false,
      deadline: 1792000000000,
      plan: { id: "today-after-carryover" },
    },
    { saved: true, deadline: null, plan: { id: "saved-after-midnight" } },
  ]) {
    const requests: { action: string; planId: string }[] = [];
    let savedData = data;
    const context = vm.createContext({
      data,
      pending: false,
      setPending() {},
      setError() {},
      setAnsweringQuestion() {},
      setStarted() {},
      setData(value: typeof data | ((previous: typeof data) => typeof data)) {
        savedData = typeof value === "function" ? value(savedData) : value;
      },
      answerUncertainty: { current: {} },
      fetch: async (_url: string, init: RequestInit) => {
        requests.push(JSON.parse(String(init.body)));
        return Response.json({ ...data, saved: true, deadline: 1792000000000 });
      },
    });
    vm.runInContext(actionScript, context);
    await context.runAction({
      action: "concept",
      unitId: "reading-1",
      index: 0,
    });
    assert.deepEqual(
      requests.map((request) => request.action),
      ["start", "concept"],
    );
    assert(requests.every((request) => request.planId === data.plan.id));
    assert.equal(savedData.saved, true);
  }
});

test("account switch effects never write the previous owner's active section into a new account key", () => {
  const source = readFileSync(
    new URL("../src/components/act/ExamRunner.tsx", import.meta.url),
    "utf8",
  );
  const first = source.indexOf("  useEffect(() => {");
  const second = source.indexOf("  useEffect(() => {", first + 1);
  const third = source.indexOf("  useEffect(() => {", second + 1);
  const effects: (() => void)[] = [];
  const writes: string[] = [];
  const context = vm.createContext({
    ready: true,
    userId: "account-b",
    key: "act-study-active:account-b:reading-1",
    session: { ownerId: "account-a", answers: { q: 2 } },
    exam: {},
    useEffect(callback: () => void) {
      effects.push(callback);
    },
    setNow() {},
    setSession() {},
    setCompletedId() {},
    setLoadedOwner() {},
    setError() {},
    finishing: { current: false },
    lastSaveAttempt: { current: 0 },
    localStorage: {
      getItem: () => null,
      setItem: (key: string) => writes.push(key),
    },
  });
  vm.runInContext(
    transpileModule(source.slice(first, third), {
      compilerOptions: { target: ScriptTarget.ES2022 },
    }).outputText,
    context,
  );
  effects.forEach((effect) => effect());
  assert.deepEqual(writes, []);
});

test("finalized or mismatched-owner sections reject answer edits while saving is retried", () => {
  const source = readFileSync(
    new URL("../src/components/act/ExamRunner.tsx", import.meta.url),
    "utf8",
  );
  const mutateSource = source.slice(
    source.indexOf("  function mutate("),
    source.indexOf("  function choose("),
  );
  const script = transpileModule(
    `${mutateSource}\nglobalThis.mutateSession = mutate;`,
    {
      compilerOptions: { target: ScriptTarget.ES2022 },
    },
  ).outputText;
  for (const fixture of [
    {
      ownerId: "account-a",
      userId: "account-a",
      finishedAt: Date.now(),
      saving: false,
    },
    {
      ownerId: "account-a",
      userId: "account-b",
      finishedAt: null,
      saving: false,
    },
    {
      ownerId: "account-a",
      userId: "account-a",
      finishedAt: null,
      saving: true,
    },
  ]) {
    let writes = 0;
    const context = vm.createContext({
      session: {
        ownerId: fixture.ownerId,
        finishedAt: fixture.finishedAt,
        deadline: Date.now() + 60000,
        answers: { q: 0 },
      },
      userId: fixture.userId,
      finishing: { current: fixture.saving },
      setSession() {
        writes++;
      },
      finish() {},
    });
    vm.runInContext(script, context);
    context.mutateSession({ answers: { q: 1 } });
    assert.equal(writes, 0);
  }
});
