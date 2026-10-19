import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transpileModule, ScriptTarget, JsxEmit } from "typescript";
import { getQuestions } from "../src/lib/act/content";
import { getQuestions as getEnglishQuestions } from "../src/lib/content";

const source = readFileSync(
  new URL("../src/components/DailyStudy.tsx", import.meta.url),
  "utf8",
);
const component = source
  .slice(
    source.indexOf("export function DailyMissRecovery("),
    source.indexOf("function DailyCorrection("),
  )
  .replace("export function", "function");
const script = transpileModule(
  `${component}\nglobalThis.renderRecovery = DailyMissRecovery;`,
  {
    compilerOptions: { target: ScriptTarget.ES2022, jsx: JsxEmit.React },
    fileName: "recovery.tsx",
  },
).outputText;
type Element = {
  type: string;
  props: Record<string, unknown>;
  children: Element[];
};
function find(element: Element, type: string): Element | undefined {
  if (element.type === type) return element;
  return element.children
    .flat(Infinity)
    .filter(Boolean)
    .map((child) =>
      typeof child === "object" ? find(child as Element, type) : undefined,
    )
    .find(Boolean);
}
function recovery(
  question: { id: string; answer: number; choices: string[] },
  outcomes = ["opened"],
) {
  const chosen = (question.answer + 1) % question.choices.length;
  const states: boolean[] = [];
  let cursor = 0,
    advanced = 0,
    retries = 0;
  const context = vm.createContext({
    React: {
      createElement: (
        type: string,
        props: Record<string, unknown>,
        ...children: Element[]
      ) => ({ type, props: props ?? {}, children }),
    },
    Button: "Button",
    LessonActivity: "LessonActivity",
    useState: (initial: boolean) => {
      const slot = cursor++;
      states[slot] ??= initial;
      return [
        states[slot],
        (value: boolean) => {
          states[slot] = value;
        },
      ];
    },
    fetch: () => assert.fail("Guided recovery must never submit an answer"),
  });
  vm.runInContext(script, context);
  return {
    chosen,
    advanced: () => advanced,
    retries: () => retries,
    render(pending = false) {
      cursor = 0;
      return context.renderRecovery({
        question,
        chosen,
        pending,
        onNext: () => advanced++,
        onRetry: async () => {
          retries++;
          return outcomes.shift() ?? "opened";
        },
      }) as Element;
    },
  };
}
const click = (tree: Element) =>
  (find(tree, "Button")!.props.onClick as () => Promise<void>)();
const finishStep = (tree: Element) =>
  (find(tree, "LessonActivity")!.props.onComplete as () => void)();

test("saved misses in every subject require supported recovery before requesting a fresh question", async () => {
  for (const question of [
    { ...getEnglishQuestions("commas")[0], subject: "english" },
    ...["math", "reading", "science"].map((subject) =>
      getQuestions().find((q) => q.subject === subject)!,
    ),
  ]) {
    const session = recovery(question);
    const before = structuredClone(question);
    let tree = session.render();
    const activity = find(tree, "LessonActivity")!;
    const content = activity.props.activity as {
      answer: number;
      choices: string[];
      explanation: string;
      evidence?: unknown;
    };
    assert.equal(activity.props.initialWrongChoice, session.chosen);
    assert.equal(content.answer, question.answer);
    assert.deepEqual(content.choices, question.choices);
    assert.equal(content.explanation, question.explanation);
    assert.deepEqual(
      content.evidence,
      "passage" in question ? question.passage : undefined,
    );
    assert.equal(find(tree, "Button")!.props.disabled, true);
    await click(tree);
    assert.equal(session.retries(), 0);
    finishStep(tree);
    tree = session.render();
    assert.equal(find(tree, "Button")!.props.disabled, false);
    assert.match(JSON.stringify(tree), /Try a fresh question/);
    await click(tree);
    assert.equal(session.retries(), 1);
    assert.equal(
      session.advanced(),
      0,
      "the retry handler must open its verified new item before navigation",
    );
    assert.deepEqual(question, before);
  }
});

test("retry save errors stay retryable and unavailable skills show an explicit review notice", async () => {
  const session = recovery(getQuestions()[0], ["failed", "unavailable"]);
  finishStep(session.render());
  await click(session.render(true));
  assert.equal(session.retries(), 0, "pending request cannot be duplicated");
  await click(session.render());
  assert.equal(session.retries(), 1);
  assert.equal(session.advanced(), 0);
  assert.match(JSON.stringify(session.render()), /Try a fresh question/);
  await click(session.render());
  const fallback = session.render();
  assert.match(
    JSON.stringify(fallback),
    /No fresh question is available for this skill; it will return in review/,
  );
  await click(fallback);
  assert.equal(session.advanced(), 1);
  assert.equal(session.retries(), 2);
});

const retryScript = transpileModule(
  `${source.slice(source.indexOf("  async function retryMiss("), source.indexOf("  const LessonComponent ="))}\nglobalThis.retry = retryMiss;`,
  { compilerOptions: { target: ScriptTarget.ES2022 } },
).outputText;
test("retry response only opens the verified next new question and retains the original answer and duration", async () => {
  for (const scenario of [
    "opened",
    "unavailable",
    "failed",
    "same-question",
    "wrong-next",
  ]) {
    const saved = {
      answers: { original: 2 },
      answerTimes: { original: 54000 },
      lessons: ["saved-concept"],
    };
    const before = structuredClone(saved);
    const result = {
      ...saved,
      plan: { id: "saved-plan" },
      retryQuestionId: "fresh",
      ...(scenario === "unavailable" ? { retryUnavailable: true } : {}),
    };
    let advanced = 0,
      errors = 0;
    const context = vm.createContext({
      action: async (body: { action: string; questionId: string }) => {
        assert.deepEqual(JSON.parse(JSON.stringify(body)), {
          action: "retry",
          questionId: "original",
        });
        return scenario === "failed" ? null : result;
      },
      dailyStep: () => ({
        kind: "drill",
        question: {
          id:
            scenario === "same-question"
              ? "original"
              : scenario === "wrong-next"
                ? "other"
                : "fresh",
        },
      }),
      nextQuestion: () => advanced++,
      setError: () => errors++,
    });
    vm.runInContext(retryScript, context);
    const outcome = await context.retry({ id: "original" });
    assert.equal(
      outcome,
      ["same-question", "wrong-next"].includes(scenario) ? "failed" : scenario,
    );
    assert.equal(advanced, scenario === "opened" ? 1 : 0);
    assert.equal(
      errors,
      ["same-question", "wrong-next"].includes(scenario) ? 1 : 0,
    );
    assert.deepEqual(saved, before);
  }
});
