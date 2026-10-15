import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transpileModule, ScriptTarget } from "typescript";
import { displayChoiceOrder } from "../src/lib/act/choice-order";
import { getQuestions } from "../src/lib/act/content";
import { getQuestions as englishQuestions } from "../src/lib/content";

const source = readFileSync(
  new URL("../src/components/DailyDrill.tsx", import.meta.url),
  "utf8",
);
const effect = source.slice(
  source.indexOf(
    "  useEffect(() => {",
    source.indexOf("  async function submit("),
  ),
  source.indexOf("  const chosen ="),
);
const script = transpileModule(effect, {
  compilerOptions: { target: ScriptTarget.ES2022 },
}).outputText;

function keyboard(q: { id: string; subject: string; choices: string[] }) {
  const submitted: number[] = [];
  let continued = 0;
  let handler: (event: Record<string, unknown>) => void;
  let cleanup: () => void;
  const context = vm.createContext({
    q,
    revealed: false,
    saving: false,
    failed: false,
    displayChoiceOrder,
    submit: (choice: number) => submitted.push(choice),
    onNext: () => continued++,
    useEffect(callback: () => () => void) {
      cleanup = callback();
    },
    window: {
      addEventListener(name: string, listener: typeof handler) {
        assert.equal(name, "keydown");
        handler = listener;
      },
      removeEventListener(name: string, listener: typeof handler) {
        assert.equal(name, "keydown");
        assert.equal(listener, handler);
      },
    },
  });
  vm.runInContext(script, context);
  return {
    context,
    submitted,
    get continued() {
      return continued;
    },
    press(key: string, extra: Record<string, unknown> = {}) {
      let prevented = false;
      handler!({
        key,
        target: null,
        preventDefault() {
          prevented = true;
        },
        ...extra,
      });
      return prevented;
    },
    cleanup: () => cleanup!(),
  };
}

test("daily Reading keyboard letters and numbers submit the same content answer as visible choices", () => {
  const q = getQuestions().find((q) => q.id === "RP-01-2")!;
  assert(q);
  assert.deepEqual(displayChoiceOrder(q), [2, 0, 3, 1]);
  const daily = keyboard(q);
  for (const key of ["a", "B", "c", "D", "1", "2", "3", "4"])
    assert.equal(daily.press(key), true);
  assert.deepEqual(daily.submitted, [2, 0, 3, 1, 2, 0, 3, 1]);
  assert.equal(
    q.choices[daily.submitted[0]],
    "She is avoiding volunteering to play alone",
  );
  daily.cleanup();
});

test("daily English, Math, and Science preserve their displayed identity order", () => {
  for (const q of [
    { ...englishQuestions("commas")[0], subject: "english" },
    getQuestions("math-algebra")[0],
    getQuestions().find((q) => q.subject === "science")!,
  ]) {
    const daily = keyboard(q);
    for (const key of ["a", "b", "c", "d", "1", "2", "3", "4"])
      daily.press(key);
    assert.deepEqual(daily.submitted, [0, 1, 2, 3, 0, 1, 2, 3], q.id);
    daily.cleanup();
  }
});

test("daily keyboard preserves input, save, and feedback navigation guards", () => {
  const daily = keyboard(getQuestions().find((q) => q.subject === "reading")!);
  for (const extra of [
    { metaKey: true },
    { ctrlKey: true },
    { altKey: true },
    { target: { isContentEditable: true } },
    { target: { closest: () => ({}) } },
  ])
    assert.equal(daily.press("a", extra), false);
  for (const flag of ["saving", "failed", "revealed"]) {
    daily.context[flag] = true;
    assert.equal(daily.press("a"), false);
    daily.context[flag] = false;
  }
  assert.equal(daily.press("z"), false);
  assert.deepEqual(daily.submitted, []);
  assert.equal(daily.press("Enter"), false);
  daily.context.revealed = true;
  for (const key of ["Enter", "n", "N", " "])
    assert.equal(daily.press(key), true);
  assert.equal(daily.continued, 4);
  daily.cleanup();
});
