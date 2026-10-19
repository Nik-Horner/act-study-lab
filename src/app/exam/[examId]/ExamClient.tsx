"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Exam, ExamPassage } from "@/lib/content";
import { parsePassage, groupParagraphs } from "@/lib/passage";
import { Button } from "@/components/ui/Button";
import { StudyWorkspace } from "@/components/StudyWorkspace";
import { Card } from "@/components/ui/Card";
import { fmtTime, LETTERS } from "@/lib/format";

import { remainingSeconds } from "@/lib/act/exam-session";
import {
  ENGLISH_EXAM_SECONDS,
  englishExamStorageKey,
  englishExamSubmission,
  newEnglishExamSession,
  validateEnglishExamSession,
  type EnglishExamSession,
} from "@/lib/english-exam-session";

interface FlatQuestion {
  number: number;
  passageIndex: number;
  questionText: string;
  choices: string[];
}

export default function ExamClient({
  exam,
  userId,
}: {
  exam: Exam;
  userId: string;
}) {
  const router = useRouter();

  const flat = useMemo<FlatQuestion[]>(() => {
    const list: FlatQuestion[] = [];
    exam.passages.forEach((p, passageIndex) => {
      p.questions.forEach((q) => {
        list.push({
          number: q.number,
          passageIndex,
          questionText: q.questionText,
          choices: q.choices,
        });
      });
    });
    return list.sort((a, b) => a.number - b.number);
  }, [exam]);

  const storageKey = englishExamStorageKey(userId, exam.id);
  const [session, setSession] = useState<EnglishExamSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const submittedRef = useRef(false);
  const autoAttempted = useRef(false);
  const saveSession = useCallback(
    (next: EnglishExamSession) => {
      setSession(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        setStorageError(null);
      } catch {
        setStorageError(
          "This browser could not save your exam. Keep this page open until submission succeeds.",
        );
      }
    },
    [storageKey],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const restored = validateEnglishExamSession(
            JSON.parse(saved),
            exam,
            userId,
          );
          if (!restored) throw new Error("invalid-session");
          setSession(restored);
        } else saveSession(newEnglishExamSession(exam, userId));
      } catch (error) {
        if (
          error instanceof SyntaxError ||
          (error instanceof Error && error.message === "invalid-session")
        ) {
          setLoadError(
            "This browser’s saved exam could not be restored. Starting again replaces that saved exam.",
          );
        } else {
          setSession(newEnglishExamSession(exam, userId));
          setStorageError(
            "This browser could not read saved progress. Keep this page open until submission succeeds.",
          );
        }
      }
      setLoaded(true);
      setNow(Date.now());
    }, 0);
    return () => clearTimeout(timer);
  }, [exam, userId, storageKey, saveSession]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  const answers = session?.answers ?? {};
  const flagged = new Set(session?.flags ?? []);
  const activeQuestion = session?.activeQuestion ?? flat[0].number;
  const secondsLeft = session
    ? remainingSeconds(session.deadline, now)
    : ENGLISH_EXAM_SECONDS;
  const locked = submitting || !!session?.finishedAt || secondsLeft === 0;
  const currentIndex = flat.findIndex((f) => f.number === activeQuestion);
  const current = flat[currentIndex] ?? flat[0];
  const passage = exam.passages[current.passageIndex];

  const submit = useCallback(async () => {
    if (!session || submittedRef.current) return;
    submittedRef.current = true;
    const finished = {
      ...session,
      finishedAt:
        session.finishedAt ??
        Math.min(session.deadline, Math.max(session.startedAt, Date.now())),
    };
    saveSession(finished);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(englishExamSubmission(finished)),
      });
      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error ?? "Your exam could not be submitted.");
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      router.push(`/exam/${exam.id}/results/${result.attemptId}`);
    } catch (error) {
      submittedRef.current = false;
      setSubmitting(false);
      setSubmitError(
        `${(error as Error).message} Your answers are still here. Retry before leaving.`,
      );
    }
  }, [session, saveSession, storageKey, exam.id, router]);
  useEffect(() => {
    if (
      !loaded ||
      !session ||
      (secondsLeft > 0 && session.finishedAt === null) ||
      autoAttempted.current
    )
      return;
    autoAttempted.current = true;
    const timer = setTimeout(() => void submit(), 0);
    return () => clearTimeout(timer);
  }, [loaded, session, secondsLeft, submit]);
  useEffect(() => {
    if (loaded)
      document
        .getElementById(`q-${activeQuestion}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeQuestion, loaded]);

  function pick(choiceIndex: number) {
    // eslint-disable-next-line react-hooks/purity -- event-time check catches a throttled countdown
    if (!session || locked || Date.now() >= session.deadline) return;
    saveSession({
      ...session,
      answers: { ...session.answers, [current.number]: choiceIndex },
    });
  }
  function toggleFlag() {
    if (!session || locked || Date.now() >= session.deadline) return;
    saveSession({
      ...session,
      flags: flagged.has(current.number)
        ? session.flags.filter((n) => n !== current.number)
        : [...session.flags, current.number],
    });
  }
  function selectQuestion(number: number) {
    if (session && !submittedRef.current)
      saveSession({ ...session, activeQuestion: number });
  }
  function goPrev() {
    if (currentIndex > 0) selectQuestion(flat[currentIndex - 1].number);
  }
  function goNext() {
    if (currentIndex < flat.length - 1)
      selectQuestion(flat[currentIndex + 1].number);
  }
  function handleSubmitClick() {
    if (submitError) {
      void submit();
      return;
    }
    setConfirmSubmit(true);
  }
  if (!loaded) return <p role="status">Loading saved exam…</p>;
  if (!session)
    return (
      <Card className="space-y-4 p-6">
        <p role="alert">{loadError}</p>
        <Button
          onClick={() => {
            setLoadError(null);
            autoAttempted.current = false;
            saveSession(newEnglishExamSession(exam, userId));
          }}
        >
          Start a new attempt
        </Button>
      </Card>
    );

  const answeredCount = Object.values(answers).filter((a) => a != null).length;

  return (
    <StudyWorkspace
      title={exam.title}
      subject="english"
      mode="exam"
      current={current.number}
      total={flat.length}
      headingLevel={1}
      tools={
        <>
          <span>
            {answeredCount}/{flat.length} answered · {flagged.size} flagged
          </span>
          <span
            role="timer"
            className={`pace-chip ${secondsLeft <= 300 ? "text-bad" : ""}`}
          >
            {fmtTime(secondsLeft)}
          </span>
        </>
      }
    >
      {storageError && (
        <p role="alert" className="rounded-xl bg-warn-soft p-4 text-sm">
          {storageError}
        </p>
      )}
      {submitError && (
        <p role="alert" className="rounded-xl bg-bad-soft p-4 text-sm">
          {submitError}
        </p>
      )}
      <div className="exam-two-pane">
        <section className="exam-evidence">
          <h2 className="mb-4 font-semibold">{passage.title}</h2>
          <PassageView
            passage={passage}
            activeNumber={current.number}
            onSelect={selectQuestion}
          />
        </section>

        <section className="exam-task">
          <div className="flex items-center justify-between">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {current.number}
            </span>
            <button
              type="button"
              onClick={toggleFlag}
              disabled={locked}
              aria-pressed={flagged.has(current.number)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                flagged.has(current.number)
                  ? "bg-warn-soft text-warn"
                  : "bg-bg-raised text-ink-soft"
              }`}
            >
              {flagged.has(current.number) ? "Flagged" : "Flag"}
            </button>
          </div>
          <p className="mt-4 text-sm font-medium">{current.questionText}</p>
          <div
            className="answer-choices mt-4"
            role="group"
            aria-label="Answer choices"
          >
            {current.choices.map((choice, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(i)}
                disabled={locked}
                aria-pressed={answers[current.number] === i}
                data-selected={answers[current.number] === i}
                className={`choice ${
                  answers[current.number] === i
                    ? "border-brand bg-brand-soft"
                    : "border-border hover:bg-bg-raised"
                }`}
              >
                <span className="answer-letter">{LETTERS[i]}</span>
                <span>{choice}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goPrev}
              disabled={currentIndex <= 0}
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={goNext}
              disabled={currentIndex >= flat.length - 1}
            >
              Next question
            </Button>
          </div>
        </section>
      </div>

      <details className="workspace-question-nav" open>
        <summary>Question navigator · answered and flagged</summary>
        <div className="mb-3 text-xs text-ink-soft">
          {answeredCount}/{flat.length} answered · {flagged.size} flagged
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {flat.map((f) => {
            const answered = answers[f.number] != null;
            const isFlagged = flagged.has(f.number);
            const isCurrent = f.number === current.number;
            return (
              <button
                key={f.number}
                type="button"
                aria-label={`Question ${f.number}, ${answered ? "answered" : "unanswered"}${isFlagged ? ", flagged" : ""}`}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => selectQuestion(f.number)}
                className={`h-8 rounded-md text-xs font-semibold ${isCurrent ? "ring-2 ring-brand" : ""} ${
                  isFlagged
                    ? "bg-warn-soft text-warn"
                    : answered
                      ? "bg-good-soft text-good"
                      : "bg-bg-raised text-ink-soft"
                }`}
              >
                {f.number}
              </button>
            );
          })}
        </div>
      </details>

      {confirmSubmit && !submitting && (
        <div
          role="alert"
          className="rounded-xl border border-border bg-brand-soft p-5"
        >
          <p className="font-semibold">Submit this exam?</p>
          <p className="mt-2 text-sm text-ink-soft">
            {flat.length - answeredCount} unanswered{" "}
            {flat.length - answeredCount === 1 ? "question" : "questions"}. Your
            answers will be saved as a completed attempt.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setConfirmSubmit(false);
                void submit();
              }}
            >
              Submit answers
            </Button>
            <Button variant="ghost" onClick={() => setConfirmSubmit(false)}>
              Keep working
            </Button>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={handleSubmitClick} disabled={submitting}>
          {submitting
            ? "Submitting…"
            : submitError
              ? "Retry submission"
              : "End section"}
        </Button>
      </div>
    </StudyWorkspace>
  );
}

function PassageView({
  passage,
  activeNumber,
  onSelect,
}: {
  passage: ExamPassage;
  activeNumber: number;
  onSelect: (number: number) => void;
}) {
  const paragraphs = useMemo(
    () => groupParagraphs(parsePassage(passage.html)),
    [passage.html],
  );

  return (
    <div className="space-y-4 text-[15px] leading-relaxed">
      {paragraphs.map((para, pi) => (
        <p key={pi}>
          {para.map((seg, si) =>
            seg.type === "text" ? (
              <span key={si}>{seg.value}</span>
            ) : (
              <span
                key={si}
                id={`q-${seg.number}`}
                data-question={seg.number}
                onClick={() => onSelect(seg.number)}
                className={`ul cursor-pointer rounded px-0.5 transition-colors ${
                  seg.number === activeNumber
                    ? "bg-brand-soft"
                    : "hover:bg-bg-raised"
                }`}
              >
                {seg.text ? (
                  seg.text
                ) : (
                  <sup className="font-bold text-brand">{seg.number}</sup>
                )}
              </span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
