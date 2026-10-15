import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import * as settings from "../src/lib/account-settings";
import * as scoreChecks from "../src/lib/score-checks";
import * as englishAnswer from "../src/lib/english-drill-answer";
import { loadEnglishProgress } from "../src/lib/english-progress-server";
import { getQuestions } from "../src/lib/content";
import * as englishContent from "../src/lib/content";
import * as englishExamSession from "../src/lib/english-exam-session";
import * as scoring from "../src/lib/scoring";
import { EnglishProgressError } from "../src/components/EnglishProgressError";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";

type Row = Record<string, unknown>;
type QueryResult = {
  data: Row[] | Row | null;
  error: { code?: string; message: string } | null;
};
function database(userId = randomUUID()) {
  const tables: Record<string, Row[]> = {
    topic_progress: [],
    question_misses: [],
    exam_attempts: [],
  };
  const failed = new Set<string>();
  let writes = 0;
  class Query {
    filters: [string, unknown][] = [];
    start = 0;
    end = Infinity;
    constructor(readonly table: string) {}
    select() {
      return this;
    }
    eq(key: string, value: unknown) {
      this.filters.push([key, value]);
      return this;
    }
    order() {
      return this;
    }
    range(start: number, end: number) {
      this.start = start;
      this.end = end;
      return this;
    }
    result(): QueryResult {
      if (failed.has(this.table))
        return { data: null, error: { message: "Database unavailable" } };
      return {
        data: (tables[this.table] ?? [])
          .filter((row) =>
            this.filters.every(([key, value]) => row[key] === value),
          )
          .slice(this.start, this.end + 1),
        error: null,
      };
    }
    then(resolve: (value: QueryResult) => unknown) {
      return Promise.resolve(this.result()).then(resolve);
    }
    async maybeSingle() {
      const result = this.result();
      return {
        ...result,
        data: Array.isArray(result.data) ? (result.data[0] ?? null) : null,
      };
    }
    async insert(row: Row) {
      writes++;
      if (failed.has("insert"))
        return { error: { message: "Insert unavailable" } };
      if (tables[this.table].some((existing) => existing.id === row.id))
        return { error: { code: "23505", message: "Duplicate" } };
      tables[this.table].push({
        ...row,
        completed_at: `2026-10-14T12:00:${String(writes).padStart(2, "0")}.000Z`,
      });
      return { error: null };
    }
  }
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: userId } } }) },
    from: (table: string) => new Query(table),
  };
  return { db, tables, failed, userId, writes: () => writes };
}

function route(file: string, db: ReturnType<typeof database>["db"]) {
  const path = new URL(`../${file}`, import.meta.url);
  const require = createRequire(path);
  const mocks: Record<string, unknown> = {
    "next/server": { NextResponse: Response },
    "@/lib/supabase/server": { createClient: async () => db },
    "@/lib/account-settings": settings,
    "@/lib/score-checks": scoreChecks,
    "@/lib/english-drill-answer": englishAnswer,
    "@/lib/english-exam-session": englishExamSession,
    "@/lib/scoring": scoring,
    "@/lib/english-progress-server": { loadEnglishProgress },
    "@/lib/act/content": { getTopic: () => undefined },
    "@/components/act/StudyClient": { DrillView: () => null },
    "@/lib/content": englishContent,
    "@/components/EnglishProgressError": { EnglishProgressError },
    "./DrillClient": { DrillClient: () => null },
    "next/navigation": {
      notFound: () => {
        throw new Error("Not found");
      },
    },
  };
  const loadedModule = { exports: {} };
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  vm.runInNewContext(compiled.outputText, {
    module: loadedModule,
    exports: loadedModule.exports,
    require: (name: string) => mocks[name] ?? require(name),
    Response,
    Request,
    URL,
    Date,
    crypto,
  });
  return loadedModule.exports as Record<
    string,
    (request: Request) => Promise<Response>
  >;
}
function request(body: unknown, path = "/api/drill/answer") {
  return new Request(`https://qa.invalid${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("stale or ownerless account forms cannot write to the newly signed-in account", async () => {
  for (const [file, method] of [
    ["src/app/api/profile/route.ts", "PATCH"],
    ["src/app/api/plan-check/route.ts", "POST"],
    ["src/app/api/score-checks/route.ts", "POST"],
    ["src/app/api/drill/answer/route.ts", "POST"],
  ]) {
    const mock = database();
    const handler = route(file, mock.db)[method];
    for (const body of [
      { ownerId: randomUUID(), target_score: 20 },
      { target_score: 20 },
    ])
      assert.equal((await handler(request(body))).status, 409, file);
    assert.equal(mock.writes(), 0);
  }
});

test("score history rejects a stale tab before returning a different account's scores", async () => {
  const mock = database();
  const handler = route("src/app/api/score-checks/route.ts", mock.db).GET;
  assert.equal(
    (
      await handler(
        new Request(
          `https://qa.invalid/api/score-checks?ownerId=${randomUUID()}`,
        ),
      )
    ).status,
    409,
  );
  assert.equal(
    (await handler(new Request("https://qa.invalid/api/score-checks"))).status,
    409,
  );
});

test("English exam submissions cannot assign an ownerless or stale attempt to the current account", async () => {
  const mock = database();
  const post = route("src/app/api/exam/submit/route.ts", mock.db).POST;
  const legacy = {
    examId: "exam-1",
    answers: [{ number: 1, picked: 0 }],
    durationSeconds: 30,
  };
  for (const body of [
    legacy,
    { ...legacy, attemptId: randomUUID() },
    { ...legacy, attemptId: randomUUID(), ownerId: randomUUID() },
  ]) {
    const response = await post(request(body, "/api/exam/submit"));
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /Reload before continuing/);
  }
  assert.equal(mock.writes(), 0);
  assert.equal(
    (
      await post(
        request(
          { ...legacy, ownerId: mock.userId, attemptId: "invalid" },
          "/api/exam/submit",
        ),
      )
    ).status,
    400,
  );
});

test("actual English route counts concurrent answers once each, including retries and legacy counters", async () => {
  const mock = database();
  mock.tables.topic_progress.push({
    user_id: mock.userId,
    topic_slug: "commas",
    attempts: 5,
    correct: 5,
    current_streak: 5,
    best_streak: 5,
    last_practiced_at: null,
  });
  const post = route("src/app/api/drill/answer/route.ts", mock.db).POST;
  const inputs = getQuestions("commas")
    .slice(0, 2)
    .map((question) => ({
      ownerId: mock.userId,
      answerId: randomUUID(),
      topicSlug: "commas",
      questionId: question.id,
      chosen: question.answer,
    }));
  const responses = await Promise.all(
    inputs.map((body) => post(request(body))),
  );
  assert.deepEqual(
    responses.map((response) => response.status),
    [200, 200],
  );
  assert.equal((await post(request(inputs[0]))).status, 200);
  const loaded = await loadEnglishProgress(
    mock.db as unknown as Parameters<typeof loadEnglishProgress>[0],
    mock.userId,
  );
  assert.equal(loaded.progress[0].attempts, 7);
  assert.equal(loaded.progress[0].correct, 7);
  assert.equal(loaded.progress[0].current_streak, 7);
  assert.equal(mock.tables.exam_attempts.length, 2);
  assert.equal(mock.tables.topic_progress[0].attempts, 5);
  assert.equal(
    (await post(request({ ...inputs[0], chosen: (inputs[0].chosen + 1) % 4 })))
      .status,
    409,
  );
});

test("an uncertain English save can be confirmed without incrementing again", async () => {
  const mock = database();
  const post = route("src/app/api/drill/answer/route.ts", mock.db).POST;
  const question = getQuestions("commas")[0];
  const input = {
    ownerId: mock.userId,
    answerId: randomUUID(),
    topicSlug: "commas",
    questionId: question.id,
    chosen: question.answer,
  };
  mock.failed.add("topic_progress");
  assert.equal((await post(request(input))).status, 503);
  assert.equal(mock.tables.exam_attempts.length, 1);
  mock.failed.clear();
  const retry = await post(request(input));
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).attempts, 1);
});

test("English history failures are explicit for baselines, misses, and answer events", async () => {
  for (const table of ["topic_progress", "question_misses", "exam_attempts"]) {
    const mock = database();
    mock.failed.add(table);
    await assert.rejects(
      loadEnglishProgress(
        mock.db as unknown as Parameters<typeof loadEnglishProgress>[0],
        mock.userId,
      ),
      /could not load/,
    );
  }
});

test("failed English reads render a reload alert instead of cleared misses or zero mastery", async () => {
  for (const slug of ["misses", "weak", "commas"]) {
    const mock = database();
    mock.failed.add("question_misses");
    const page = route("src/app/drill/[slug]/page.tsx", mock.db)
      .default as unknown as (props: {
      params: Promise<{ slug: string }>;
      searchParams: Promise<Record<string, string>>;
    }) => Promise<ReactElement>;
    const result = await page({
      params: Promise.resolve({ slug }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(result);
    assert.match(html, /role="alert"/);
    assert.match(html, /Reload progress/);
    assert.doesNotMatch(html, /All misses cleared|Not started|0%/);
  }
});

test("an answer ID owned by a different account cannot report success", async () => {
  const mock = database();
  const question = getQuestions("commas")[0];
  const answerId = randomUUID();
  mock.tables.exam_attempts.push({
    id: answerId,
    user_id: randomUUID(),
    exam_id: englishAnswer.ENGLISH_PRACTICE_ID,
    answers: {},
  });
  const post = route("src/app/api/drill/answer/route.ts", mock.db).POST;
  assert.equal(
    (
      await post(
        request({
          ownerId: mock.userId,
          answerId,
          topicSlug: "commas",
          questionId: question.id,
          chosen: question.answer,
        }),
      )
    ).status,
    409,
  );
});
