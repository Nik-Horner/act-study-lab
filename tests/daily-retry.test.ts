import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transpileModule, ScriptTarget } from "typescript";
import {
  addDailyRetry,
  makeDailyPlan,
  refreshDailyContent,
  dailyId,
  dailyComplete,
  type DailyPlan,
} from "../src/lib/daily-plan";
import {
  blockUnits,
  dailyConcepts,
  dailyStep,
  dailyFocus,
  readingConceptProgress,
} from "../src/lib/daily-flow";
import { getQuestions, getExams } from "../src/lib/act/content";
import { englishDailyQuestions } from "../src/lib/english-daily-content";
const settings = {
  minutesPerDay: 60,
  scores: { english: 32, math: 34, reading: 30, science: 27 },
};
const build = () => makeDailyPlan("retry-owner", "2026-10-17", settings, 0);
const keys = (plan: DailyPlan) =>
  plan.blocks
    .flatMap(blockUnits)
    .flatMap((unit) => [
      unit.id,
      ...dailyConcepts(unit).map((i) => `${unit.id}:concept:${i}`),
    ]);

test("every subject gets a distinct same-skill retry after its last wrong question without changing earned work", () => {
  for (const block of build().blocks) {
    const plan = { ...build(), blocks: [block] };
    const original = block.questions.at(-1)!;
    const answers = Object.fromEntries(
      block.questions.map((q) => [q.id, q.answer]),
    );
    answers[original.id] = (original.answer + 1) % 4;
    const before = structuredClone({ plan, answers });
    const result = addDailyRetry(plan, answers, original.id);
    assert(result.retryQuestionId, block.subject);
    const retry = result.plan.blocks[0].questions.find(
      (q) => q.id === result.retryQuestionId,
    )!;
    assert.equal(retry.skillId, original.skillId);
    assert.equal(retry.retryOf, original.id);
    assert(!block.questions.some((q) => q.id === retry.id));
    assert(!getExams().some((exam) => exam.questionIds.includes(retry.id)));
    assert.deepEqual(
      result.plan.blocks[0].questions.filter((q) => !q.retryOf),
      block.questions,
    );
    assert.equal(result.plan.id, plan.id);
    assert.equal(result.plan.date, plan.date);
    assert.equal(result.plan.minutes, plan.minutes);
    assert.deepEqual(
      result.plan.nextCurriculumPositions,
      plan.nextCurriculumPositions,
    );
    assert.deepEqual({ plan, answers }, before);
    const step = dailyStep(result.plan, answers, keys(plan));
    assert.equal(step.kind, "drill");
    assert.equal(step.kind === "drill" && step.question.id, retry.id);
    const reloaded = refreshDailyContent(
      JSON.parse(JSON.stringify(result.plan)),
      answers,
    );
    assert(
      reloaded.blocks[0].questions.some(
        (q) => q.id === retry.id && q.retryOf === original.id,
      ),
    );
    assert.equal(
      addDailyRetry(reloaded, answers, original.id).retryQuestionId,
      retry.id,
    );
  }
});

test("retries reject correct, unanswered, unrelated and completed work", () => {
  const plan = build(),
    q = plan.blocks[0].questions[0];
  for (const [source, answers, id] of [
    [plan, {}, q.id],
    [plan, { [q.id]: q.answer }, q.id],
    [plan, { foreign: 1 }, "foreign"],
    [{ ...plan, complete: true }, { [q.id]: (q.answer + 1) % 4 }, q.id],
  ] as const)
    assert.throws(() => addDailyRetry(source, answers, id));
});

test("retries exclude all assigned and historically seen items and explicitly report exhausted pools", () => {
  const plan = build();
  for (const block of plan.blocks) {
    const q = block.questions[0];
    const answers = { [q.id]: (q.answer + 1) % 4 };
    const first = addDailyRetry(plan, answers, q.id);
    assert(first.retryQuestionId, block.subject);
    const historical = {
      ...plan,
      previouslyAnsweredQuestions: [first.retryQuestionId],
    };
    assert.notEqual(
      addDailyRetry(historical, answers, q.id).retryQuestionId,
      first.retryQuestionId,
    );
    const bank =
      block.subject === "english"
        ? englishDailyQuestions(q.topic)
        : getQuestions(q.topic);
    const exhausted = addDailyRetry(
      plan,
      answers,
      q.id,
      bank.map((candidate) => candidate.id),
    );
    assert.equal(exhausted.retryUnavailable, true);
    assert.equal(exhausted.retryQuestionId, null);
    assert.strictEqual(exhausted.plan, plan);
  }
});

test("a retry survives refresh even when recovery exceeds the original time estimate", () => {
  const plan = build(),
    block = plan.blocks[0],
    original = block.questions[0];
  const answers = { [original.id]: (original.answer + 1) % 4 };
  const result = addDailyRetry(
    { ...plan, minutes: 1, blocks: [{ ...block, minutes: 1 }] },
    answers,
    original.id,
  );
  const reloaded = refreshDailyContent(
    JSON.parse(JSON.stringify(result.plan)),
    answers,
  );
  assert.equal(reloaded.minutes, 1);
  assert.deepEqual(
    reloaded.blocks[0].questions.map((q) => q.id),
    result.plan.blocks[0].questions.map((q) => q.id),
  );
  assert.equal(
    reloaded.blocks[0].questions.find((q) => q.retryOf)?.id,
    result.retryQuestionId,
  );
});

const source = readFileSync(
  new URL("../src/app/api/daily/route.ts", import.meta.url),
  "utf8",
);
const compiled = transpileModule(
  `${source.slice(source.indexOf("async function saveDailyPlan("), source.indexOf("async function load("))}\n${source.slice(source.indexOf("export async function POST(")).replace("export async", "async")}\nglobalThis.post = POST; globalThis.save = saveDailyPlan;`,
  { compilerOptions: { target: ScriptTarget.ES2022 } },
).outputText;

function apiFixture() {
  const originalPlan = build();
  let stored = { ...originalPlan, blocks: [originalPlan.blocks[2]] };
  const original = stored.blocks[0].questions.at(-1)!;
  const answers = Object.fromEntries(
    stored.blocks[0].questions.map((q) => [q.id, q.answer]),
  );
  answers[original.id] = (original.answer + 1) % 4;
  const lessons = keys(stored);
  let failed = false;
  let writes = 0;
  let owner = "retry-owner";
  const events: Record<string, { chosen: number }> = {};
  const historyLoads: boolean[] = [];
  class Query {
    filters: [string, unknown][] = [];
    updateValue?: { answers: DailyPlan };
    update(value: { answers: DailyPlan }) {
      this.updateValue = value;
      return this;
    }
    eq(key: string, value: unknown) {
      this.filters.push([key, value]);
      return this;
    }
    is(key: string, value: unknown) {
      return this.eq(key, value);
    }
    select() {
      return this;
    }
    async maybeSingle() {
      if (failed) return { data: null, error: { message: "Unavailable" } };
      const values: Record<string, unknown> = {
        id: stored.id,
        user_id: "retry-owner",
        "answers->>retryRevision":
          stored.retryRevision === undefined
            ? null
            : String(stored.retryRevision),
      };
      if (this.filters.some(([key, value]) => values[key] !== value))
        return { data: null, error: null };
      if (this.updateValue) {
        stored = structuredClone(this.updateValue.answers);
        writes++;
      }
      return { data: { id: stored.id }, error: null };
    }
    async insert(row: {
      id: string;
      answers: { event: { questionId: string; chosen: number } };
    }) {
      if (events[row.id]) return { error: { code: "23505" } };
      events[row.id] = row.answers.event;
      answers[row.answers.event.questionId] = row.answers.event.chosen;
      return { error: null };
    }
  }
  const db = { from: () => new Query() };
  const context = vm.createContext({
    Response,
    Date,
    Error,
    JSON,
    addDailyRetry,
    dailyId,
    dailyComplete,
    dailyStep,
    dailyFocus,
    blockUnits,
    readingConceptProgress,
    db,
    load: async (fullHistory: boolean) => {
      historyLoads.push(fullHistory);
      return {
        db,
        user: { id: owner },
        today: stored.date,
        plan: refreshDailyContent(structuredClone(stored), answers),
        storedPlan: structuredClone(stored),
        saved: true,
        answers: { ...answers },
        answerTimes: {},
        uncertainAnswers: {},
        lessons: [...lessons],
        course: { seenQuestions: [] },
      };
    },
    dailyResponse: (
      ctx: { plan: DailyPlan; answers: object; lessons: string[] },
      _coverage: boolean,
      _formulas: unknown,
      retry: object,
    ) =>
      Response.json({
        plan: ctx.plan,
        answers: ctx.answers,
        lessons: ctx.lessons,
        ...retry,
      }),
  });
  vm.runInContext(compiled, context);
  return {
    original,
    context,
    db,
    answers,
    lessons,
    events,
    historyLoads,
    stored: () => stored,
    writes: () => writes,
    fail: (value: boolean) => {
      failed = value;
    },
    owner: (value: string) => {
      owner = value;
    },
    call: (body: object) =>
      context.post(
        new Request("https://qa.invalid/api/daily", {
          method: "POST",
          body: JSON.stringify({ planId: stored.id, ...body }),
        }),
      ) as Promise<Response>,
  };
}

test("retry API saves once, reloads the same question and uses ordinary immutable answer grading", async () => {
  const f = apiFixture();
  const initialAnswer = f.answers[f.original.id];
  const first = await f.call({
    action: "retry",
    questionId: f.original.id,
    chosen: f.original.answer,
  });
  assert.equal(first.status, 200);
  const data = await first.json();
  assert(data.retryQuestionId);
  assert.equal(data.retryUnavailable, false);
  assert.equal(f.writes(), 1);
  assert.deepEqual(data.lessons, f.lessons);
  assert.equal(data.answers[f.original.id], initialAnswer);
  const repeated = await (
    await f.call({ action: "retry", questionId: f.original.id })
  ).json();
  assert.equal(repeated.retryQuestionId, data.retryQuestionId);
  assert.equal(f.writes(), 1);
  assert(f.historyLoads.every(Boolean), "retry checks full practice history");
  const retry = f
    .stored()
    .blocks[0].questions.find((q) => q.id === data.retryQuestionId)!;
  const graded = await f.call({
    action: "answer",
    questionId: retry.id,
    chosen: retry.answer,
    elapsedMs: 1000,
  });
  assert.equal(graded.status, 200);
  assert.equal(f.answers[retry.id], retry.answer);
  assert.equal(f.answers[f.original.id], initialAnswer);
  assert.equal(
    (
      await f.call({
        action: "answer",
        questionId: f.original.id,
        chosen: f.original.answer,
      })
    ).status,
    409,
  );
});

test("retry persistence refuses a stale revision and account mismatch without changing either saved plan", async () => {
  const f = apiFixture();
  const before = structuredClone(f.stored());
  const updated = addDailyRetry(before, f.answers, f.original.id).plan;
  const first = await f.context.save(f.db, "retry-owner", before, updated);
  assert(first.data);
  const saved = structuredClone(f.stored());
  const stale = await f.context.save(f.db, "retry-owner", before, {
    ...before,
    complete: true,
  });
  assert.equal(stale.data, null);
  const wrongOwner = await f.context.save(f.db, "different-account", saved, {
    ...saved,
    complete: true,
  });
  assert.equal(wrongOwner.data, null);
  assert.deepEqual(f.stored(), saved);
});

test("failed retry persistence stays retryable and never reports an unsaved question", async () => {
  const f = apiFixture(),
    before = structuredClone(f.stored());
  f.fail(true);
  assert.equal(
    (await f.call({ action: "retry", questionId: f.original.id })).status,
    503,
  );
  assert.deepEqual(f.stored(), before);
  f.fail(false);
  assert.equal(
    (await f.call({ action: "retry", questionId: f.original.id })).status,
    200,
  );
});
