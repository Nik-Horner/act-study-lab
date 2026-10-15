"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getExam,
  getExamQuestions,
  getTopic,
  SUBJECT_LABELS,
} from "@/lib/act/content";
import { useProgress, recordExam, type ExamAttempt } from "@/lib/act/progress";
import {
  validateSession,
  finalizeSession,
  remainingSeconds,
  type ExamSession,
} from "@/lib/act/exam-session";
import { fmtTime } from "@/lib/format";
import { QuestionView } from "./QuestionView";
import { useQuestionNavigation } from "./useQuestionNavigation";
import { DesmosPanel } from "./DesmosPanel";
import { Button, ButtonLink } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
export function ExamRunner({
  examId,
  attemptId,
}: {
  examId: string;
  attemptId?: string;
}) {
  const exam = getExam(examId),
    questions = getExamQuestions(examId);
  const { state, ready, update, storageError, userId } = useProgress(),
    params = useSearchParams();
  const key = `act-study-active:${userId ?? "signed-out"}:${examId}`;
  const [session, setSession] = useState<ExamSession | null>(null),
    [loadedOwner, setLoadedOwner] = useState<string | null>(null),
    [now, setNow] = useState<number | null>(null),
    [completedId, setCompletedId] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null),
    [showCalculator, setShowCalculator] = useState(false),
    [zoom, setZoom] = useState(1),
    [hideTime, setHideTime] = useState(false),
    [confirmEnd, setConfirmEnd] = useState(false);
  const finishing = useRef(false);
  const lastSaveAttempt = useRef(0);
  const navigation = useQuestionNavigation(
    session ? questions[session.index] : undefined,
    loadedOwner === userId && ready,
  );
  useEffect(() => {
    if (!ready || !userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted browser session after SSR
    setNow(Date.now());
    setSession(null);
    setCompletedId(null);
    setError(null);
    finishing.current = false;
    lastSaveAttempt.current = 0;
    try {
      const text = localStorage.getItem(key);
      if (text) {
        const restored = validateSession(JSON.parse(text), exam, userId);
        if (restored) setSession(restored);
        else
          setError(
            "The saved section could not be restored. Choose a section below.",
          );
      }
    } catch {
      setError(
        "This browser could not restore a saved section. Keep this page open during practice.",
      );
    }
    setLoadedOwner(userId);
    // Restore only the current account's browser key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, userId]);
  useEffect(() => {
    if (!session || session.ownerId !== userId) return;
    try {
      localStorage.setItem(key, JSON.stringify(session));
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external storage write failure
      setError(
        "Your active section cannot be saved in this browser. Keep the page open; retry saving after finishing.",
      );
    }
  }, [session, key, userId]);
  useEffect(() => {
    if (!session?.id) return;
    const tick = () => setNow(Date.now()),
      id = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [session?.id]);
  const finish = useCallback(async () => {
    if (
      !session ||
      session.ownerId !== userId ||
      finishing.current ||
      !ready ||
      Date.now() - lastSaveAttempt.current < 15000
    )
      return;
    lastSaveAttempt.current = Date.now();
    finishing.current = true;
    const finalized = finalizeSession(session);
    setSession(finalized);
    setConfirmEnd(false);
    try {
      localStorage.setItem(key, JSON.stringify(finalized));
    } catch {
      // Cloud recovery also retains the immutable submission when device storage is unavailable.
    }
    const ended = finalized.finishedAt!,
      attempt: ExamAttempt = {
        id: session.id,
        examId,
        startedAt: session.startedAt,
        completedAt: new Date(ended).toISOString(),
        answers: finalized.answers,
        elapsedSeconds: Math.min(
          exam.minutes * 60,
          Math.max(
            0,
            Math.round((ended - Date.parse(session.startedAt)) / 1000),
          ),
        ),
      };
    const saved = await update(recordExam(state, attempt, questions));
    if (!saved) {
      finishing.current = false;
      setError(
        "Your section has ended, but saving failed. Your answers remain on this page. Retry saving before leaving.",
      );
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {}
    setCompletedId(session.id);
    setSession(null);
    setConfirmEnd(false);
  }, [
    session,
    userId,
    ready,
    examId,
    exam.minutes,
    update,
    state,
    questions,
    key,
  ]);
  useEffect(() => {
    if (
      session &&
      now !== null &&
      (session.finishedAt !== null ||
        remainingSeconds(session.deadline, now) === 0)
    ) {
      const timeout = window.setTimeout(() => void finish(), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [session, now, finish]);
  const selectedId = attemptId ?? params.get("attempt") ?? completedId,
    attempt = selectedId
      ? state.attempts.find((a) => a.id === selectedId && a.examId === examId)
      : null;
  if (ready && !userId)
    return (
      <Card className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-semibold">
          Load your account before starting
        </h1>
        <p role="alert" className="mt-3 text-sm text-ink-soft">
          {storageError ?? "Sign in to save this section."}
        </p>
        <ButtonLink href="/account" className="mt-5">
          Account settings
        </ButtonLink>
      </Card>
    );
  if (loadedOwner !== userId || !ready)
    return (
      <div
        role="status"
        className="h-64 rounded-xl bg-bg-raised motion-safe:animate-pulse"
      >
        <span className="sr-only">Loading section</span>
      </div>
    );
  if (attempt) return <Results attempt={attempt} storageError={storageError} />;
  if (selectedId && !attempt)
    return (
      <Card className="p-6">
        <h1 className="text-xl font-semibold">
          Result unavailable for this account.
        </h1>
        <p className="mt-3">
          Reload to retrieve the result from your signed-in account.
        </p>
        <ButtonLink href="/account" className="mt-5">
          Account settings
        </ButtonLink>
      </Card>
    );
  function start() {
    lastSaveAttempt.current = 0;
    const time = Date.now();
    finishing.current = false;
    setNow(time);
    setCompletedId(null);
    setSession({
      id: crypto.randomUUID(),
      ownerId: userId!,
      examId,
      startedAt: new Date(time).toISOString(),
      deadline: time + exam.minutes * 60_000,
      finishedAt: null,
      answers: {},
      flags: [],
      eliminated: {},
      index: 0,
    });
  }
  if (!session)
    return (
      <div className="space-y-7">
        <Link
          href="/exam"
          className="text-sm text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
        >
          Back to digital practice
        </Link>
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {exam.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <Badge className="normal-case tracking-normal">
              {SUBJECT_LABELS[exam.subject]}
            </Badge>
            <span>Timed digital practice</span>
          </div>
        </div>
        <Card className="overflow-hidden">
          <dl className="grid grid-cols-3 divide-x divide-border border-b border-border bg-bg-raised/50">
            <div className="px-4 py-5 sm:px-7">
              <dt className="text-xs font-medium text-ink-soft">Questions</dt>
              <dd className="study-data mt-1 text-2xl font-semibold">
                {questions.length}
              </dd>
            </div>
            <div className="px-4 py-5 sm:px-7">
              <dt className="text-xs font-medium text-ink-soft">Minutes</dt>
              <dd className="study-data mt-1 text-2xl font-semibold">
                {exam.minutes}
              </dd>
            </div>
            <div className="px-4 py-5 sm:px-7">
              <dt className="text-xs font-medium text-ink-soft">
                Answer choices
              </dt>
              <dd className="study-data mt-1 text-2xl font-semibold">4</dd>
            </div>
          </dl>
          <div className="space-y-5 p-5 sm:p-7">
            <p className="prose-study text-sm leading-relaxed">
              {exam.description} Answer all questions; there is no penalty for
              guessing. You can move backward, flag questions, and eliminate
              options. The timer keeps running if you leave or reload. When time
              expires, your saved answers are submitted automatically.
            </p>
            <p className="max-w-3xl border-t border-border pt-4 text-sm leading-relaxed text-ink-soft">
              Original training questions. No explanations appear until you
              submit. This is a practice interface; rehearse the exact test-day
              software with official ACT practice.
            </p>
            {state.attempts.some((a) => a.examId === examId) && (
              <p className="rounded-xl bg-warn-soft p-4 text-sm text-warn">
                You have already seen this section. Use fresh official practice
                to assess readiness.
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-warn-soft p-4 text-sm">
                {error}
              </p>
            )}
            <Button onClick={start} className="max-sm:w-full">
              Begin timed section
            </Button>
          </div>
        </Card>
      </div>
    );
  const q = questions[session.index],
    remaining = remainingSeconds(
      session.deadline,
      now ?? Date.parse(session.startedAt),
    ),
    answered = Object.values(session.answers).filter((a) => a !== null).length;
  function mutate(next: ExamSession) {
    if (
      session!.ownerId !== userId ||
      session!.finishedAt !== null ||
      finishing.current
    )
      return;
    if (Date.now() >= session!.deadline) {
      finish();
      return;
    }
    setSession(next);
  }
  function choose(value: number | null) {
    mutate({ ...session!, answers: { ...session!.answers, [q.id]: value } });
  }
  function eliminate(i: number) {
    const old = session!.eliminated[q.id] ?? [],
      remove = old.includes(i);
    mutate({
      ...session!,
      answers:
        session!.answers[q.id] === i && !remove
          ? { ...session!.answers, [q.id]: null }
          : session!.answers,
      eliminated: {
        ...session!.eliminated,
        [q.id]: remove ? old.filter((a) => a !== i) : [...old, i],
      },
    });
  }
  return (
    <div className="space-y-5">
      {(error || storageError) && (
        <div role="alert" className="rounded-xl bg-warn-soft p-4 text-sm">
          {error ?? storageError}{" "}
          <button
            className="ml-2 underline"
            onClick={() => {
              lastSaveAttempt.current = 0;
              void finish();
            }}
          >
            Retry saving section
          </button>
        </div>
      )}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-bg-soft/95 p-4 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="min-w-0">
          <h1 className="font-semibold">
            {SUBJECT_LABELS[exam.subject]} digital section
          </h1>
          <p className="study-data mt-1 text-xs text-ink-soft">
            Answered {answered}/{questions.length} · {session.flags.length}{" "}
            flagged
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            role="timer"
            className={`study-data inline-flex min-h-10 items-center rounded-full border px-4 text-base font-semibold ${remaining <= 300 ? "border-bad bg-bad-soft text-bad" : "border-border bg-bg-raised text-ink"}`}
          >
            {hideTime ? "Timer hidden" : fmtTime(remaining)}
          </span>
          <button
            className="min-h-10 px-1 text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
            onClick={() => setHideTime((v) => !v)}
          >
            {hideTime ? "Show timer" : "Hide timer"}
          </button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          disabled={session.finishedAt !== null}
          onClick={() => setConfirmEnd(true)}
        >
          End section
        </Button>
      </div>
      {session.finishedAt !== null && (
        <p role="status" className="rounded-xl bg-warn-soft p-4 text-sm">
          This section has ended. Answers are locked while your submission
          saves. Retry saving if needed.
        </p>
      )}
      {(error || storageError) && (
        <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm">
          {error || storageError}
        </p>
      )}
      {confirmEnd && (
        <Card className="space-y-3 p-5" role="alert">
          <p>
            Submit this section now? {questions.length - answered} question(s)
            have no answer.
          </p>
          <div className="flex gap-3">
            <Button onClick={finish}>Submit answers</Button>
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              Keep working
            </Button>
          </div>
        </Card>
      )}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <p className="mr-auto text-sm font-semibold">
          Question {session.index + 1} of {questions.length}
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={session.finishedAt !== null}
          className={session.flags.includes(q.id) ? "ring-1 ring-warn" : ""}
          aria-pressed={session.flags.includes(q.id)}
          onClick={() =>
            mutate({
              ...session,
              flags: session.flags.includes(q.id)
                ? session.flags.filter((id) => id !== q.id)
                : [...session.flags, q.id],
            })
          }
        >
          {session.flags.includes(q.id) ? "Unflag question" : "Flag for review"}
        </Button>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-soft">
          Text size
          <select
            aria-label="Text size"
            className="min-h-9 rounded-full border border-border bg-bg-raised px-3 py-1.5 text-sm text-ink"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          >
            <option value="1">100%</option>
            <option value="1.15">115%</option>
            <option value="1.3">130%</option>
          </select>
        </label>
        {exam.subject === "math" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCalculator((v) => !v)}
          >
            {showCalculator ? "Close calculator" : "Calculator"}
          </Button>
        )}
      </Card>
      {exam.subject === "math" && (
        <div hidden={!showCalculator} className="mb-5">
          <DesmosPanel subject="math" initiallyOpen />
        </div>
      )}
      <Card className="p-5 sm:p-7">
        <QuestionView
          {...navigation}
          q={q}
          chosen={session.answers[q.id] ?? null}
          onChoose={choose}
          eliminated={session.eliminated[q.id] ?? []}
          onEliminate={session.finishedAt === null ? eliminate : undefined}
          disabled={session.finishedAt !== null}
          zoom={zoom}
        />
      </Card>
      <div className="flex flex-wrap justify-between gap-3">
        <Button
          variant="ghost"
          disabled={session.index === 0 || session.finishedAt !== null}
          onClick={() => mutate({ ...session, index: session.index - 1 })}
        >
          Previous
        </Button>
        {session.index < questions.length - 1 ? (
          <Button
            disabled={session.finishedAt !== null}
            onClick={() => mutate({ ...session, index: session.index + 1 })}
          >
            Next question
          </Button>
        ) : (
          <Button
            disabled={session.finishedAt !== null}
            onClick={() => setConfirmEnd(true)}
          >
            Review and submit
          </Button>
        )}
      </div>
      <Card className="p-4 sm:p-5">
        <details open>
          <summary className="cursor-pointer text-sm font-semibold">
            Question index · Filled = answered · F = flagged
          </summary>
          <nav
            aria-label="Question index"
            className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2 sm:grid-cols-10"
          >
            {questions.map((item, i) => {
              const marked = session.flags.includes(item.id),
                hasAnswer = session.answers[item.id] != null;
              return (
                <button
                  key={item.id}
                  disabled={session.finishedAt !== null}
                  aria-label={`Question ${i + 1}${hasAnswer ? ", answered" : ", unanswered"}${marked ? ", flagged" : ""}`}
                  aria-current={i === session.index ? "step" : undefined}
                  className={`study-data min-h-11 min-w-11 rounded-lg border px-2 text-sm transition-colors hover:border-brand ${hasAnswer ? "bg-brand-soft" : "bg-bg-raised text-ink-soft"} ${i === session.index ? "border-brand ring-2 ring-brand" : hasAnswer ? "border-brand" : "border-border"} ${marked ? "font-bold" : ""}`}
                  onClick={() => mutate({ ...session, index: i })}
                >
                  {i + 1}
                  {marked ? " F" : ""}
                </button>
              );
            })}
          </nav>
        </details>
      </Card>
    </div>
  );
}
function Results({
  attempt,
  storageError,
}: {
  attempt: ExamAttempt;
  storageError: string | null;
}) {
  const exam = getExam(attempt.examId),
    qs = getExamQuestions(attempt.examId),
    [onlyMisses, setOnlyMisses] = useState(true),
    correct = qs.filter((q) => attempt.answers[q.id] === q.answer).length,
    topics = [...new Set(qs.map((q) => q.topic))];
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {storageError && (
        <p role="alert" className="rounded-xl bg-warn-soft p-4 text-sm">
          {storageError}{" "}
          <Link href="/account" className="underline">
            Account settings
          </Link>
        </p>
      )}
      <Link href="/exam" className="back-link">
        Back to digital practice
      </Link>
      <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        {exam.title}
      </h1>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
          <h2 className="text-base font-semibold">Section results</h2>
          <p className="study-data text-2xl font-semibold">
            {correct}/{qs.length}
            <span className="ml-2 text-sm font-medium text-ink-soft">
              correct
            </span>
          </p>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-border bg-bg-raised/50">
          <div className="px-4 py-4 sm:px-6">
            <dt className="text-xs font-medium text-ink-soft">Accuracy</dt>
            <dd className="study-data mt-1 text-xl font-semibold sm:text-2xl">
              {Math.round((correct / qs.length) * 100)}%
            </dd>
          </div>
          <div className="px-4 py-4 sm:px-6">
            <dt className="text-xs font-medium text-ink-soft">Time elapsed</dt>
            <dd className="study-data mt-1 text-xl font-semibold sm:text-2xl">
              {fmtTime(attempt.elapsedSeconds)}
            </dd>
          </div>
          <div className="px-4 py-4 sm:px-6">
            <dt className="text-xs font-medium text-ink-soft">Unanswered</dt>
            <dd className="study-data mt-1 text-xl font-semibold sm:text-2xl">
              {qs.filter((q) => attempt.answers[q.id] == null).length}
            </dd>
          </div>
        </dl>
        <p className="border-t border-border px-5 py-4 text-sm leading-relaxed text-ink-soft sm:px-6">
          Practice raw score. ACT scaled scores require a form-specific official
          conversion; these original questions do not predict a 36.
        </p>
      </Card>
      <Card className="divide-y divide-border">
        {topics.map((slug) => {
          const group = qs.filter((q) => q.topic === slug),
            right = group.filter(
              (q) => attempt.answers[q.id] === q.answer,
            ).length;
          return (
            <div
              className="flex items-center justify-between gap-3 p-4"
              key={slug}
            >
              <Link href={`/learn/${slug}`} className="text-sm underline">
                {getTopic(slug)?.title ?? slug}
              </Link>
              <Badge tone={right === group.length ? "good" : "neutral"}>
                {right}/{group.length}
              </Badge>
            </div>
          );
        })}
      </Card>
      <ButtonLink href={`/drill/misses?subject=${exam.subject}`}>
        Drill these misses
      </ButtonLink>
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Answer review</h2>
          <label className="text-sm">
            <input
              type="checkbox"
              checked={onlyMisses}
              onChange={(e) => setOnlyMisses(e.target.checked)}
            />{" "}
            Show only misses
          </label>
        </div>
        {qs
          .filter((q) => !onlyMisses || attempt.answers[q.id] !== q.answer)
          .map((q) => (
            <Card className="mb-5 p-5" key={q.id}>
              <p className="mb-4 text-sm font-semibold">
                Question {qs.indexOf(q) + 1} · {getTopic(q.topic)?.title}
              </p>
              <QuestionView
                q={q}
                chosen={attempt.answers[q.id] ?? null}
                onChoose={() => {}}
                revealed
              />
            </Card>
          ))}
        {correct === qs.length && onlyMisses && (
          <p className="text-sm text-good">
            No misses in this section. Check a fresh official test next.
          </p>
        )}
      </section>
    </div>
  );
}
