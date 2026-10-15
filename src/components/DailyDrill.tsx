"use client";
import { AnswerFeedback } from "./AnswerFeedback";
import { useEffect, useRef, useState } from "react";
import type { DailyQuestion } from "@/lib/daily-plan";
import type { Question } from "@/lib/act/types";
import { QUESTION_TARGET_SECONDS, answerPacing } from "@/lib/question-pacing";
import { renderStem, fmtTime } from "@/lib/format";
import { QuestionView } from "./act/QuestionView";
import { useQuestionNavigation } from "./act/useQuestionNavigation";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
export function DailyDrill({
  q,
  title,
  revealed,
  savedChoice,
  savedTime,
  count,
  total,
  onSubmit,
  onNext,
  onLesson,
}: {
  q: DailyQuestion;
  title: string;
  revealed: boolean;
  savedChoice?: number;
  savedTime?: number;
  count: number;
  total: number;
  onSubmit: (choice: number, elapsedMs: number) => Promise<boolean>;
  onNext: () => void;
  onLesson: () => void;
}) {
  const [start] = useState(Date.now),
    [now, setNow] = useState(Date.now);
  const [selection, setSelection] = useState<{
    choice: number;
    elapsedMs: number;
  } | null>(null);
  const [saving, setSaving] = useState(false),
    [failed, setFailed] = useState(false);
  const guard = useRef(false);
  const navigation = useQuestionNavigation(q as Question);
  const target = QUESTION_TARGET_SECONDS[q.subject];
  const elapsedMs = revealed
    ? savedTime
    : (selection?.elapsedMs ?? now - start);
  const pace =
    elapsedMs === undefined ? null : answerPacing(elapsedMs, q.subject);
  useEffect(() => {
    if (revealed || selection) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [revealed, selection]);
  async function submit(choice: number, retry = false) {
    if (revealed || guard.current) return;
    guard.current = true;
    const attempt =
      retry && selection
        ? selection
        : { choice, elapsedMs: Date.now() - start };
    setSelection(attempt);
    setSaving(true);
    setFailed(false);
    const ok = await onSubmit(attempt.choice, attempt.elapsedMs);
    setSaving(false);
    setFailed(!ok);
    guard.current = false;
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        t?.isContentEditable ||
        t?.closest("input,textarea,select,button,a,summary")
      )
        return;
      if (revealed && ["Enter", "n", "N", " "].includes(e.key)) {
        e.preventDefault();
        onNext();
        return;
      }
      const i = ["a", "b", "c", "d"].indexOf(e.key.toLowerCase());
      const n = ["1", "2", "3", "4"].indexOf(e.key);
      if (!revealed && !saving && !failed && (i >= 0 || n >= 0)) {
        e.preventDefault();
        void submit(i >= 0 ? i : n);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const chosen = revealed ? (savedChoice ?? null) : (selection?.choice ?? null);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {title.replace(/^\d+\.\s*/, "")}
          </h1>
          <button
            onClick={onLesson}
            disabled={saving || failed}
            className="mt-2 min-h-11 text-sm text-brand underline disabled:opacity-50"
          >
            Review the lesson
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span
            className={`rounded-full border border-border px-3 py-2 tabular-nums ${(pace?.seconds ?? 0) > target ? "text-warn" : "text-ink-soft"}`}
          >
            {elapsedMs === undefined
              ? "Time unavailable"
              : fmtTime(Math.floor(elapsedMs / 1000))}{" "}
            · target {target}s
          </span>
        </div>
      </div>
      <div className="daily-drill-status text-sm">
        <span>
          {q.phase === "review" ? "Review · " : ""}Question{" "}
          {Math.min(count + (revealed ? 0 : 1), total)} of {total}
        </span>
      </div>
      {q.subject === "english" ? (
        <Card className="p-6">
          <p
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderStem(q.stem) }}
          />
          <h2 className="mt-5 text-lg font-semibold">{q.questionText}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {q.choices.map((choice, i) => (
              <button
                key={i}
                disabled={revealed || saving || failed}
                aria-pressed={chosen === i}
                onClick={() => void submit(i)}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left ${revealed && i === q.answer ? "border-good bg-good-soft" : revealed && i === chosen ? "border-bad bg-bad-soft" : chosen === i ? "border-brand bg-brand-soft" : "border-border bg-bg hover:bg-bg-raised"}`}
              >
                {String.fromCharCode(65 + i)}. {choice}
                {revealed && i === q.answer
                  ? " (correct)"
                  : revealed && i === chosen
                    ? " (your answer)"
                    : ""}
              </button>
            ))}
          </div>
          {revealed && (
            <AnswerFeedback
              choices={q.choices}
              answer={q.answer}
              chosen={chosen}
              explanation={q.explanation}
            />
          )}
        </Card>
      ) : (
        <Card className="p-5 sm:p-8">
          <QuestionView
            {...navigation}
            q={q as Question}
            chosen={chosen}
            onChoose={(i) => {
              if (i !== null) void submit(i);
            }}
            revealed={revealed || selection !== null}
            disabled={saving || failed}
          />
        </Card>
      )}
      {revealed && pace && (
        <p className={`text-sm ${pace.onPace ? "text-good" : "text-warn"}`}>
          {pace.seconds}s — {pace.onPace ? "on pace" : "a little slow"} (target{" "}
          {pace.target}s)
        </p>
      )}
      {q.subject === "reading" && (
        <p className="text-xs text-ink-soft">
          Reading’s target includes time spent reading the passage. Learn
          accurately first; use pacing to guide timed practice.
        </p>
      )}
      {saving && (
        <p role="status" className="text-sm text-ink-soft">
          Saving answer…
        </p>
      )}
      {failed && (
        <Button onClick={() => void submit(selection!.choice, true)}>
          Retry saving answer
        </Button>
      )}
      {revealed && <Button onClick={onNext}>Continue</Button>}
      <p className="text-xs text-ink-soft">
        A–D or 1–4 answers · Enter, N, or Space continues after feedback.
      </p>
    </div>
  );
}
