import {
  createDefaultState,
  recordAnswer,
  recordExam,
  setPlanTaskComplete,
  validateState,
  type StudyState,
} from "./progress-model";
import { getExamQuestions } from "./content";
import { validateCloudRecord } from "./cloud-records";
type Snapshot = {
  state: StudyState;
  ready: boolean;
  storageError: string | null;
  userId: string | null;
  saving: boolean;
};
type PendingJob = {
  ownerId: string;
  checkedDate?: string;
  url: string;
  body: {
    ownerId: string;
    record?: unknown;
    itemKey?: string;
    checked?: boolean;
  };
};
const serverSnapshot: Snapshot = {
  state: createDefaultState(),
  ready: false,
  storageError: null,
  userId: null,
  saving: false,
};
export function createCloudProgressStore(
  options: {
    fetcher?: typeof fetch;
    storage?: () => Pick<
      Storage,
      "getItem" | "setItem" | "removeItem" | "key" | "length"
    >;
    timeZone?: () => string;
  } = {},
) {
  const fetcher = options.fetcher ?? fetch;
  const storage = options.storage ?? (() => window.localStorage);
  let snapshot = serverSnapshot;
  const listeners = new Set<() => void>();
  const pending = new Map<string, PendingJob>();
  let loading = false,
    flushing: Promise<boolean> | null = null;
  const recoveryKey = (userId: string) => `act-study-unsaved:${userId}`;
  const jobKey = (key: string, job: PendingJob) =>
    `${recoveryKey(job.ownerId)}:${encodeURIComponent(key)}`;
  function persistJob(key: string, job: PendingJob) {
    try {
      storage().setItem(jobKey(key, job), JSON.stringify(job));
      return true;
    } catch {
      /* The visible save error still asks the student to retry before leaving. */
      return false;
    }
  }
  function publish(next: Snapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  function restorePending(userId: string, cloud: StudyState): StudyState {
    let state = cloud;
    try {
      const entries: [string, PendingJob][] = [];
      const local = storage();
      for (let i = 0; i < local.length; i++) {
        const key = local.key(i);
        if (!key?.startsWith(`${recoveryKey(userId)}:`)) continue;
        try {
          entries.push([
            decodeURIComponent(key.slice(recoveryKey(userId).length + 1)),
            JSON.parse(local.getItem(key)!),
          ]);
        } catch {
          /* A damaged entry must not hide other recoverable answers. */
        }
      }
      const raw = storage().getItem(recoveryKey(userId));
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          const draft = validateState(saved.state);
          if (
            draft &&
            Array.isArray(saved.jobs) &&
            saved.jobs.length <= 10000
          ) {
            let migrated = true;
            for (const entry of saved.jobs) {
              if (!Array.isArray(entry) || entry.length !== 2) continue;
              const [key, job] = entry as [string, PendingJob];
              if (
                !job ||
                job.ownerId !== userId ||
                job.body?.ownerId !== userId
              )
                continue;
              const recovered = {
                ...job,
                checkedDate: draft.planCheckDates?.[job.body.itemKey ?? ""],
              };
              // Prefer a newer per-job entry written by another tab.
              if (!local.getItem(jobKey(key, job))) {
                entries.push([key, recovered]);
                migrated = persistJob(key, recovered) && migrated;
              }
            }
            if (migrated) local.removeItem(recoveryKey(userId));
          }
        } catch {
          /* Other per-job recovery remains usable if the legacy snapshot is damaged. */
        }
      }
      for (const entry of entries) {
        if (!Array.isArray(entry) || entry.length !== 2) continue;
        const [key, job] = entry as [string, PendingJob];
        if (!job || job.ownerId !== userId || job.body?.ownerId !== userId)
          continue;
        if (job.url === "/api/study/event") {
          const record = validateCloudRecord(job.body.record);
          if (!record) continue;
          const id =
            record.kind === "answer"
              ? `answer:${record.event.id}`
              : `exam:${record.attempt.id}`;
          if (key !== id) continue;
          state =
            record.kind === "answer"
              ? recordAnswer(state, record.event)
              : recordExam(
                  state,
                  record.attempt,
                  getExamQuestions(record.attempt.examId),
                );
          if (record.kind === "answer")
            state = {
              ...state,
              answers: state.answers.map((event) =>
                event.id === record.event.id
                  ? { ...event, cause: record.event.cause }
                  : event,
              ),
            };
        } else if (job.url === "/api/plan-check") {
          const { itemKey, checked } = job.body;
          if (
            typeof itemKey !== "string" ||
            itemKey.length > 200 ||
            typeof checked !== "boolean" ||
            key !== `check:${itemKey}`
          )
            continue;
          state = setPlanTaskComplete(
            state,
            itemKey,
            checked,
            (typeof job.checkedDate === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(job.checkedDate)
              ? job.checkedDate
              : null) ?? new Date().toLocaleDateString("en-CA"),
          );
        } else continue;
        pending.set(key, job);
      }
    } catch {
      /* Ignore invalid device recovery; authenticated cloud history stays authoritative. */
    }
    return state;
  }
  async function refresh() {
    if (loading) return;
    loading = true;
    let shouldFlush = false;
    try {
      const timeZone =
        options.timeZone?.() ??
        Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetcher(
        `/api/study/progress?timeZone=${encodeURIComponent(timeZone)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (response.status === 401) {
        pending.clear();
        publish({
          ...serverSnapshot,
          ready: true,
          storageError: "Sign in again to load your progress.",
        });
        return;
      }
      let state = validateState(data.state);
      if (!response.ok || !state || typeof data.userId !== "string")
        throw new Error(
          data.error ?? "Your account progress could not be loaded. Try again.",
        );
      if (snapshot.userId !== data.userId) pending.clear();
      if (snapshot.userId === data.userId && pending.size) {
        shouldFlush = true;
        return;
      }
      state = restorePending(data.userId, state);
      shouldFlush = Boolean(pending.size);
      publish({
        state,
        userId: data.userId,
        ready: true,
        saving: false,
        storageError: shouldFlush
          ? "Recovered unsaved work. Retrying your account save."
          : null,
      });
    } catch (error) {
      publish({
        ...snapshot,
        ready: true,
        storageError:
          error instanceof Error
            ? error.message
            : "Your saved account progress could not be loaded.",
      });
    } finally {
      loading = false;
      if (shouldFlush)
        queueMicrotask(() => {
          void retryPending();
        });
    }
  }
  async function retryPending(): Promise<boolean> {
    if (flushing) return flushing;
    if (!snapshot.userId) {
      await refresh();
      return Boolean(snapshot.userId);
    }
    flushing = (async () => {
      publish({ ...snapshot, saving: true });
      while (pending.size) {
        const [key, job] = pending.entries().next().value!;
        if (job.ownerId !== snapshot.userId) {
          pending.delete(key);
          continue;
        }
        try {
          const response = await fetcher(job.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(job.body),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error ?? "Progress was not saved. Retry before leaving.",
            );
          if (job.ownerId !== snapshot.userId) return false;
          if (pending.get(key) === job) pending.delete(key);
          try {
            const local = storage();
            if (local.getItem(jobKey(key, job)) === JSON.stringify(job))
              local.removeItem(jobKey(key, job));
          } catch {
            /* A retained recovery entry is safe to retry because writes are idempotent. */
          }
        } catch (error) {
          if (job.ownerId === snapshot.userId) {
            publish({
              ...snapshot,
              saving: false,
              storageError:
                error instanceof Error
                  ? error.message
                  : "Progress was not saved. Retry before leaving.",
            });
          }
          return false;
        }
      }
      publish({ ...snapshot, saving: false, storageError: null });
      return true;
    })();
    try {
      return await flushing;
    } finally {
      flushing = null;
    }
  }
  function update(
    next: StudyState | ((current: StudyState) => StudyState),
  ): Promise<boolean> {
    const ownerId = snapshot.userId;
    if (!ownerId) return Promise.resolve(false);
    const current = snapshot.state;
    const previousPending = new Map(pending);
    const state = validateState(
      typeof next === "function" ? next(current) : next,
    );
    if (!state) {
      publish({
        ...snapshot,
        storageError: "This progress change could not be validated.",
      });
      return Promise.resolve(false);
    }
    const oldAnswers = new Map(
      current.answers.map((record) => [record.id, record]),
    );
    for (const event of state.answers.filter(
      (record) => record.mode === "drill",
    )) {
      const previous = oldAnswers.get(event.id);
      if (!previous || previous.cause !== event.cause)
        pending.set(`answer:${event.id}`, {
          ownerId,
          url: "/api/study/event",
          body: { ownerId, record: { kind: "answer", event } },
        });
    }
    const oldAttempts = new Set(current.attempts.map((attempt) => attempt.id));
    for (const attempt of state.attempts)
      if (!oldAttempts.has(attempt.id))
        pending.set(`exam:${attempt.id}`, {
          ownerId,
          url: "/api/study/event",
          body: { ownerId, record: { kind: "exam", attempt } },
        });
    const before = new Set(current.planChecks),
      after = new Set(state.planChecks);
    for (const itemKey of new Set([...before, ...after]))
      if (before.has(itemKey) !== after.has(itemKey))
        pending.set(`check:${itemKey}`, {
          ownerId,
          checkedDate: state.planCheckDates?.[itemKey],
          url: "/api/plan-check",
          body: { ownerId, itemKey, checked: after.has(itemKey) },
        });
    publish({ ...snapshot, state });
    for (const [key, job] of pending)
      if (previousPending.get(key) !== job) persistJob(key, job);
    return retryPending();
  }
  function subscribe(listener: () => void) {
    listeners.add(listener);
    void refresh();
    return () => {
      listeners.delete(listener);
    };
  }
  return {
    subscribe,
    refresh,
    update,
    retry: retryPending,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    pendingCount: () => pending.size,
  };
}
