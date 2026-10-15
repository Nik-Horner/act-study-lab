"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Exam, ExamPassage } from "@/lib/content";
import { parsePassage, type PassageSegment } from "@/lib/passage";
import { Button } from "@/components/ui/Button";
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
    const unanswered = flat.filter((f) => answers[f.number] == null).length;
    const msg =
      unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway?`
        : "Submit your exam?";
    if (window.confirm(msg)) void submit();
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
    <div className="space-y-6">
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {exam.title}
          </p>
          <p className="text-sm text-ink-soft">
            Question {current.number} of {flat.length} · Passage{" "}
            {current.passageIndex + 1} of {exam.passages.length}
          </p>
        </div>
        <div
          className={`rounded-full border px-4 py-1.5 text-sm font-bold ${
            secondsLeft <= 300
              ? "border-bad bg-bad-soft text-bad"
              : "border-border bg-bg-soft text-ink"
          }`}
        >
          {fmtTime(secondsLeft)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">{passage.title}</h2>
          <PassageView
            passage={passage}
            activeNumber={current.number}
            onSelect={selectQuestion}
          />
        </Card>

        <Card className="flex flex-col p-6">
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
          <div className="mt-4 space-y-2">
            {current.choices.map((choice, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(i)}
                disabled={locked}
                aria-pressed={answers[current.number] === i}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  answers[current.number] === i
                    ? "border-brand bg-brand-soft"
                    : "border-border hover:bg-bg-raised"
                }`}
              >
                <span className="font-bold text-ink-soft">{LETTERS[i]}</span>
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
              ← Back
            </Button>
            <Button
              size="sm"
              onClick={goNext}
              disabled={currentIndex >= flat.length - 1}
            >
              Next →
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 text-xs text-ink-soft">
          {answeredCount}/{flat.length} answered · {flagged.size} flagged
        </div>
        <div className="grid grid-cols-10 gap-1.5">
          {flat.map((f) => {
            const answered = answers[f.number] != null;
            const isFlagged = flagged.has(f.number);
            const isCurrent = f.number === current.number;
            return (
              <button
                key={f.number}
                type="button"
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
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmitClick} disabled={submitting}>
          {submitting
            ? "Submitting…"
            : submitError
              ? "Retry submission"
              : "Submit exam"}
        </Button>
      </div>
    </div>
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

/* Text segments carry raw \n\n paragraph breaks from the source; split them into
   separate <p>-worthy groups while keeping inline blanks attached to their paragraph. */
function groupParagraphs(segments: PassageSegment[]): PassageSegment[][] {
  const paragraphs: PassageSegment[][] = [[]];
  for (const seg of segments) {
    if (seg.type === "text") {
      const parts = seg.value.split(/\n\n+/);
      parts.forEach((part, i) => {
        if (i > 0) paragraphs.push([]);
        if (part)
          paragraphs[paragraphs.length - 1].push({ type: "text", value: part });
      });
    } else {
      paragraphs[paragraphs.length - 1].push(seg);
    }
  }
  return paragraphs.filter((p) => p.length > 0);
}
