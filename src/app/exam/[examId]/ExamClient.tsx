"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Exam, ExamPassage } from "@/lib/content";
import { parsePassage, type PassageSegment } from "@/lib/passage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fmtTime, LETTERS } from "@/lib/format";

const EXAM_SECONDS = 35 * 60;

interface FlatQuestion {
  number: number;
  passageIndex: number;
  questionText: string;
  choices: string[];
}

export default function ExamClient({ exam }: { exam: Exam }) {
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

  const [answers, setAnswers] = useState<Record<number, number | null>>(() =>
    Object.fromEntries(flat.map((f) => [f.number, null])),
  );
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<number>(flat[0]?.number ?? 1);
  const [secondsLeft, setSecondsLeft] = useState(EXAM_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const currentIndex = flat.findIndex((f) => f.number === activeQuestion);
  const current = flat[currentIndex] ?? flat[0];
  const passage = exam.passages[current.passageIndex];

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exam.id,
          answers: flat.map((f) => ({ number: f.number, picked: answers[f.number] ?? null })),
          durationSeconds: EXAM_SECONDS - secondsLeft,
        }),
      });
      if (!res.ok) throw new Error("submit failed");
      const { attemptId } = (await res.json()) as { attemptId: string };
      router.push(`/exam/${exam.id}/results/${attemptId}`);
    } catch {
      submittedRef.current = false;
      setSubmitting(false);
      window.alert("Couldn't submit your exam. Please try again.");
    }
  }, [answers, exam.id, flat, router, secondsLeft]);

  // Countdown, ticking every second.
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-submit once the clock hits 0. submit() is idempotent (guarded by submittedRef).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the countdown reaching zero, not derived state
    if (secondsLeft === 0) submit();
  }, [secondsLeft, submit]);

  // Scroll the active question's blank into view when it changes.
  useEffect(() => {
    document.getElementById(`q-${activeQuestion}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeQuestion]);

  function pick(choiceIndex: number) {
    setAnswers((a) => ({ ...a, [current.number]: choiceIndex }));
  }

  function toggleFlag() {
    setFlagged((f) => {
      const next = new Set(f);
      if (next.has(current.number)) next.delete(current.number);
      else next.add(current.number);
      return next;
    });
  }

  function goPrev() {
    if (currentIndex > 0) setActiveQuestion(flat[currentIndex - 1].number);
  }

  function goNext() {
    if (currentIndex < flat.length - 1) setActiveQuestion(flat[currentIndex + 1].number);
  }

  function handleSubmitClick() {
    const unanswered = flat.filter((f) => answers[f.number] == null).length;
    const msg =
      unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway?`
        : "Submit your exam?";
    if (window.confirm(msg)) submit();
  }

  const answeredCount = Object.values(answers).filter((a) => a != null).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{exam.title}</p>
          <p className="text-sm text-ink-soft">
            Question {current.number} of {flat.length} · Passage {current.passageIndex + 1} of{" "}
            {exam.passages.length}
          </p>
        </div>
        <div
          className={`rounded-full border px-4 py-1.5 text-sm font-bold ${
            secondsLeft <= 300 ? "border-bad bg-bad-soft text-bad" : "border-border bg-bg-soft text-ink"
          }`}
        >
          {fmtTime(secondsLeft)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">{passage.title}</h2>
          <PassageView passage={passage} activeNumber={current.number} onSelect={setActiveQuestion} />
        </Card>

        <Card className="flex flex-col p-6">
          <div className="flex items-center justify-between">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {current.number}
            </span>
            <button
              type="button"
              onClick={toggleFlag}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                flagged.has(current.number) ? "bg-warn-soft text-warn" : "bg-bg-raised text-ink-soft"
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
            <Button variant="ghost" size="sm" onClick={goPrev} disabled={currentIndex <= 0}>
              ← Back
            </Button>
            <Button size="sm" onClick={goNext} disabled={currentIndex >= flat.length - 1}>
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
                onClick={() => setActiveQuestion(f.number)}
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
          {submitting ? "Submitting…" : "Submit exam"}
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
  const paragraphs = useMemo(() => groupParagraphs(parsePassage(passage.html)), [passage.html]);

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
                  seg.number === activeNumber ? "bg-brand-soft" : "hover:bg-bg-raised"
                }`}
              >
                {seg.text ? seg.text : <sup className="font-bold text-brand">{seg.number}</sup>}
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
        if (part) paragraphs[paragraphs.length - 1].push({ type: "text", value: part });
      });
    } else {
      paragraphs[paragraphs.length - 1].push(seg);
    }
  }
  return paragraphs.filter((p) => p.length > 0);
}
