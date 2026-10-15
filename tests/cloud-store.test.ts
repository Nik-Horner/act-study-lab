import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createCloudProgressStore } from "../src/lib/act/cloud-store";
import {
  createDefaultState,
  recordAnswer,
  setPlanTaskComplete,
} from "../src/lib/act/progress-model";
import { getQuestions } from "../src/lib/act/content";
const first = randomUUID(),
  second = randomUUID(),
  q = getQuestions("reading-inference")[0];
function fixture() {
  const values = new Map<string, string>();
  let owner: string = first,
    fail = false,
    unauthorized = false;
  const posts: unknown[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    if (!init?.method)
      return Response.json(
        unauthorized
          ? { error: "Sign in again" }
          : { userId: owner, state: createDefaultState() },
        { status: unauthorized ? 401 : 200 },
      );
    posts.push(JSON.parse(String(init.body)));
    return Response.json(fail ? { error: "Offline save" } : { ok: true }, {
      status: fail ? 503 : 200,
    });
  };
  const storage = () => ({
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  });
  const make = () =>
    createCloudProgressStore({
      fetcher,
      storage,
      timeZone: () => "America/Chicago",
    });
  return {
    make,
    values,
    posts,
    setFail: (value: boolean) => {
      fail = value;
    },
    setOwner: (value: string) => {
      owner = value;
    },
    setUnauthorized: () => {
      unauthorized = true;
    },
  };
}
const answer = () => ({
  id: randomUUID(),
  questionId: q.id,
  chosen: q.answer,
  elapsedMs: 8000,
  confidence: "high" as const,
  cause: null,
  at: "2026-10-06T21:00:00Z",
  mode: "drill" as const,
});
test("authenticated hydration leaves the SSR snapshot stable and saves once", async () => {
  const f = fixture(),
    store = f.make(),
    ssr = store.getServerSnapshot();
  assert.equal(ssr.ready, false);
  await store.refresh();
  assert.equal(store.getSnapshot().userId, first);
  const a = answer();
  assert(await store.update((state) => recordAnswer(state, a)));
  assert.equal(f.posts.length, 1);
  assert.equal(store.pendingCount(), 0);
  assert.equal(ssr.state.answers.length, 0);
  assert.equal(store.getServerSnapshot(), ssr);
  await store.update((state) => recordAnswer(state, a));
  assert.equal(f.posts.length, 1);
});
test("failed cloud saves preserve optimistic work and recover after a reload", async () => {
  const f = fixture();
  f.setFail(true);
  const store = f.make();
  await store.refresh();
  const a = answer();
  assert.equal(await store.update((state) => recordAnswer(state, a)), false);
  assert.equal(store.getSnapshot().state.answers.length, 1);
  assert(store.getSnapshot().storageError);
  assert(
    f.values.has(
      `act-study-unsaved:${first}:${encodeURIComponent(`answer:${a.id}`)}`,
    ),
  );
  const restored = f.make();
  await restored.refresh();
  assert.equal(restored.getSnapshot().state.answers[0].id, a.id);
  await restored.retry();
  f.setFail(false);
  assert(await restored.retry());
  assert.equal(restored.pendingCount(), 0);
  assert.equal(f.values.size, 0);
});
test("recovered plan check dates survive retry and undo", async () => {
  const f = fixture(),
    store = f.make();
  await store.refresh();
  f.setFail(true);
  const id = "2026-10-05:reading-diagnostic";
  await store.update((state) =>
    setPlanTaskComplete(state, id, true, "2026-10-06"),
  );
  const restored = f.make();
  await restored.refresh();
  assert.equal(restored.getSnapshot().state.planCheckDates?.[id], "2026-10-06");
  await restored.retry();
  f.setFail(false);
  await restored.retry();
  await restored.update((state) =>
    setPlanTaskComplete(state, id, false, "2026-10-07"),
  );
  assert.deepEqual(restored.getSnapshot().state.planChecks, []);
  assert.equal((f.posts.at(-1) as { checked: boolean }).checked, false);
});
test("changing accounts never displays or sends the previous account pending work", async () => {
  const f = fixture(),
    store = f.make();
  await store.refresh();
  f.setFail(true);
  await store.update((state) => recordAnswer(state, answer()));
  assert.equal(store.pendingCount(), 1);
  f.setOwner(second);
  await store.refresh();
  assert.equal(store.getSnapshot().userId, second);
  assert.equal(store.getSnapshot().state.answers.length, 0);
  assert.equal(store.pendingCount(), 0);
  f.setFail(false);
  await store.retry();
  assert.equal(f.posts.length, 1);
  assert(
    [...f.values.keys()].some((key) =>
      key.startsWith(`act-study-unsaved:${first}:`),
    ),
  );
});
test("expired authentication clears the previous account snapshot and blocks updates", async () => {
  const f = fixture(),
    store = f.make();
  await store.refresh();
  await store.update((state) => recordAnswer(state, answer()));
  f.setUnauthorized();
  await store.refresh();
  assert.equal(store.getSnapshot().userId, null);
  assert.equal(store.getSnapshot().state.answers.length, 0);
  assert.equal(
    await store.update((state) => recordAnswer(state, answer())),
    false,
  );
  assert.equal(f.posts.length, 1);
});
test("malformed recovery and blocked storage do not prevent loading cloud history", async () => {
  const f = fixture();
  f.values.set(`act-study-unsaved:${first}`, "{broken");
  const store = f.make();
  await store.refresh();
  assert.equal(store.getSnapshot().userId, first);
  assert.equal(store.getSnapshot().state.answers.length, 0);
  const blocked = createCloudProgressStore({
    fetcher: async () =>
      Response.json({ userId: first, state: createDefaultState() }),
    storage: () => {
      throw new Error("SecurityError");
    },
  });
  await blocked.refresh();
  assert.equal(blocked.getSnapshot().userId, first);
  assert.equal(blocked.getSnapshot().storageError, null);
});

test("account budget is authoritative over the retired browser preference", async () => {
  const f = fixture();
  f.values.set(`act-daily-minutes:${first}`, "90");
  const store = f.make();
  await store.refresh();
  assert.equal(store.getSnapshot().state.profile.minutesPerDay, 75);
});

test("two offline tabs keep both answer jobs and a successful retry removes only its own job", async () => {
  const f = fixture(),
    a = f.make(),
    b = f.make();
  await a.refresh();
  await b.refresh();
  f.setFail(true);
  const firstAnswer = answer(),
    secondAnswer = answer();
  await a.update((state) => recordAnswer(state, firstAnswer));
  await b.update((state) => recordAnswer(state, secondAnswer));
  assert.equal(f.values.size, 2);
  const restored = f.make();
  await restored.refresh();
  assert.deepEqual(
    new Set(restored.getSnapshot().state.answers.map((event) => event.id)),
    new Set([firstAnswer.id, secondAnswer.id]),
  );
  await restored.retry();
  f.setFail(false);
  assert(await a.retry());
  assert.equal(f.values.size, 1);
  const remaining = f.make();
  f.setFail(true);
  await remaining.refresh();
  assert.deepEqual(
    remaining.getSnapshot().state.answers.map((event) => event.id),
    [secondAnswer.id],
  );
  await remaining.retry();
});

test("legacy shared recovery migrates alongside newer per-job work without changing answers or dates", async () => {
  const f = fixture(),
    store = f.make();
  await store.refresh();
  f.setFail(true);
  const a = answer();
  await store.update((state) => recordAnswer(state, a));
  const checkKey = "2026-10-05:reading-diagnostic";
  const draft = setPlanTaskComplete(
    createDefaultState(),
    checkKey,
    true,
    "2026-10-06",
  );
  f.values.set(
    `act-study-unsaved:${first}`,
    JSON.stringify({
      state: draft,
      jobs: [
        [
          `check:${checkKey}`,
          {
            ownerId: first,
            url: "/api/plan-check",
            body: { ownerId: first, itemKey: checkKey, checked: true },
          },
        ],
      ],
    }),
  );
  const restored = f.make();
  await restored.refresh();
  assert.equal(restored.getSnapshot().state.answers[0].id, a.id);
  assert.equal(
    restored.getSnapshot().state.planCheckDates?.[checkKey],
    "2026-10-06",
  );
  assert(!f.values.has(`act-study-unsaved:${first}`));
  assert.equal(f.values.size, 2);
  await restored.retry();
  f.setFail(false);
  await restored.retry();
  assert.equal(f.values.size, 0);
});

test("an acknowledged older job cannot remove a newer version written by another tab", async () => {
  const f = fixture(),
    store = f.make();
  await store.refresh();
  f.setFail(true);
  const a = answer();
  await store.update((state) => recordAnswer(state, a));
  const key = `act-study-unsaved:${first}:${encodeURIComponent(`answer:${a.id}`)}`;
  const newer = JSON.parse(f.values.get(key)!);
  newer.body.record.event.cause = "concept";
  f.values.set(key, JSON.stringify(newer));
  f.setFail(false);
  await store.retry();
  assert.equal(f.values.get(key), JSON.stringify(newer));
});
