import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transpileModule, ScriptTarget } from "typescript";
import DailyPage from "../src/app/daily/page";
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
const open = source.slice(
  source.indexOf("  async function openDaily("),
  source.indexOf("  const step ="),
);
const script = transpileModule(
  `${choice}\n${load}\n${open}\nglobalThis.choose = chooseFormulaReview; globalThis.reload = load; globalThis.open = openDaily;`,
  { compilerOptions: { target: ScriptTarget.ES2022 } },
).outputText;
function learner({
  view,
  runner = true,
  failedSave = false,
}: { view?: string; runner?: boolean; failedSave?: boolean } = {}) {
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
  const requests: string[] = [],
    routes: string[] = [],
    actions: string[] = [];
  let later = false,
    resumed = false;
  const context = vm.createContext({
    data,
    runner,
    initialView: view,
    pending: false,
    localStorage: {
      getItem() {
        throw new Error("Storage unavailable");
      },
      setItem() {
        throw new Error("Storage unavailable");
      },
      removeItem() {
        throw new Error("Storage unavailable");
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
      push(url: string) {
        routes.push(url);
      },
      replace(url: string) {
        routes.push(url);
      },
    },
    action: async (body: { action: string }) => {
      actions.push(body.action);
      return failedSave ? null : data;
    },
    fetch: async (url: string, init?: RequestInit) => {
      assert.equal(
        init?.method,
        undefined,
        "loading the selected view must not write answers or ratings",
      );
      requests.push(url);
      return Response.json(data);
    },
  });
  vm.runInContext(script, context);
  return {
    context,
    data,
    requests,
    routes,
    actions,
    later: () => later,
    resumed: () => resumed,
  };
}
test("home lesson choice survives a new runner mount with browser storage unavailable", async () => {
  const home = learner({ runner: false });
  const before = structuredClone(home.data);
  await home.context.open("lesson");
  assert.deepEqual(home.routes, ["/daily?view=lesson"]);
  assert.deepEqual(home.actions, ["start"]);
  const view = new URL(home.routes[0], "https://study.test").searchParams.get(
    "view",
  )!;
  const page = await DailyPage({ searchParams: Promise.resolve({ view }) });
  const mounted = learner({ view: page.props.initialView });
  await mounted.context.reload();
  assert(mounted.later(), "new mount must open lessons, not pending formulas");
  assert(mounted.resumed());
  assert.deepEqual(mounted.data, before);
  assert.deepEqual(mounted.requests, ["/api/daily"]);
});
test("explicit formula choice survives a new runner mount without changing recall data", async () => {
  const home = learner({ runner: false });
  const before = structuredClone(home.data);
  await home.context.open("formulas");
  assert.deepEqual(home.routes, ["/daily?view=formulas"]);
  const page = await DailyPage({
    searchParams: Promise.resolve({ view: "formulas" }),
  });
  const mounted = learner({ view: page.props.initialView });
  await mounted.context.reload();
  assert.equal(mounted.later(), false);
  assert.deepEqual(mounted.data, before);
  mounted.context.choose(true);
  assert.deepEqual(mounted.routes, ["/daily?view=lesson"]);
  const returned = learner({ view: "lesson" });
  await returned.context.reload();
  assert(returned.later());
  assert.deepEqual(returned.data.formulas.remaining, ["distance"]);
});
test("completed lessons open their saved answers while formulas remain an optional choice", async () => {
  const home = learner({ runner: false });
  home.data.plan.complete = true;
  const before = structuredClone(home.data);
  await home.context.open("lesson");
  assert.deepEqual(home.routes, ["/daily?view=lesson"]);
  assert.deepEqual(home.actions, [], "reviewing completion needs no write");
  await home.context.open("formulas");
  assert.equal(home.routes.at(-1), "/daily?view=formulas");
  assert.deepEqual(home.data, before);
});
test("direct visits default to lessons and failed starts do not navigate away", async () => {
  const direct = learner();
  await direct.context.reload();
  assert(direct.later());
  const home = learner({ runner: false, failedSave: true });
  await home.context.open("lesson");
  assert.deepEqual(home.routes, []);
  assert.deepEqual(home.actions, ["start"]);
  assert.deepEqual(home.data.answers, { "saved-question": 2 });
});
