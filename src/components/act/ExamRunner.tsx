"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ResultSummary, ReviewFilter } from "../ResultSummary";
import { SessionIntro } from "../SessionIntro";
import { StudyWorkspace } from "../StudyWorkspace";
import { StudyPageHeader } from "../StudyPageHeader";
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
  const router = useRouter();
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
    router.replace(`/exam/${examId}/results/${session.id}`);
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
    router,
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
        <StudyPageHeader
          title={exam.title}
          subject={exam.subject}
          description="Timed digital practice. Review answers after submission, then return to focused lessons for the methods that need work."
          back={{ href: "/exam", label: "Timed sections" }}
        />
        <SessionIntro
          subject={exam.subject}
          title="Prepare for a timed section"
          description={
            <>
              <p>{exam.description}</p>
              <p>
                Move between questions, flag answers, and eliminate options. The
                timer keeps running if this page is closed or reloaded.
                Explanations appear after submission.
              </p>
              <p>
                When time expires, saved answers are submitted automatically.
              </p>
            </>
          }
          questions={`${questions.length} original questions`}
          timing={`${exam.minutes} minutes · fixed section timer`}
        >
          {state.attempts.some((a) => a.examId === examId) && (
            <p className="text-sm text-warn">
              This form has been seen before. Use a fresh official form to
              assess readiness.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          )}
          <Button onClick={start}>Begin timed section</Button>
        </SessionIntro>
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
    <StudyWorkspace
      title={`${SUBJECT_LABELS[exam.subject]} timed section`}
      subject={exam.subject}
      mode="exam"
      current={session.index + 1}
      total={questions.length}
      headingLevel={1}
      tools={
        <>
          <span className="workspace-save-state">
            {answered}/{questions.length} answered · {session.flags.length}{" "}
            flagged
          </span>
          <span
            role="timer"
            className={`pace-chip ${remaining <= 300 ? "text-bad" : ""}`}
          >
            {hideTime ? "Timer hidden" : fmtTime(remaining)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHideTime((v) => !v)}
          >
            {hideTime ? "Show timer" : "Hide timer"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={session.finishedAt !== null}
            onClick={() => setConfirmEnd(true)}
          >
            End section
          </Button>
        </>
      }
    >
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
      <div className="workspace-question-tools">
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
      </div>
      {exam.subject === "math" && (
        <div hidden={!showCalculator} className="mb-5">
          <DesmosPanel subject="math" initiallyOpen />
        </div>
      )}
      <div className="workspace-question-stage">
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
      </div>
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
      <div className="workspace-question-nav">
        <details open>
          <summary className="cursor-pointer text-sm font-semibold">
            Question navigator · answered and flagged
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
      </div>
    </StudyWorkspace>
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
      <StudyPageHeader
        title={`${exam.title} results`}
        subject={exam.subject}
        description="Review missed answers against the evidence. Use the matching course lesson before trying independent questions again."
        back={{ href: "/exam", label: "Timed sections" }}
      />
      <ResultSummary
        correct={correct}
        total={qs.length}
        seconds={attempt.elapsedSeconds}
        unanswered={qs.filter((q) => attempt.answers[q.id] == null).length}
      />
      <Card className="result-topic-ledger">
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
          <ReviewFilter onlyMisses={onlyMisses} onChange={setOnlyMisses} />
        </div>
        {qs
          .filter((q) => !onlyMisses || attempt.answers[q.id] !== q.answer)
          .map((q) => (
            <Card className="answer-review-item" key={q.id}>
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
