"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderStem, LETTERS, shuffle, fmtTime } from "@/lib/format";
import type { Question } from "@/lib/content";
import { MASTERY_STREAK, topicStatus, masteryProgress, type TopicProgressRow } from "@/lib/mastery";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Card } from "@/components/ui/Card";

const TARGET_SEC = 42;

export type PoolItem = { topicSlug: string; topicTitle: string; question: Question };

type DrillClientProps =
  | { mode: "topic"; slug: string; title: string; questions: Question[]; initialProgress: TopicProgressRow | undefined }
  | { mode: "weak"; pool: PoolItem[] }
  | { mode: "misses"; pool: PoolItem[] };

export function DrillClient(props: DrillClientProps) {
  const items: PoolItem[] = useMemo(() => {
    if (props.mode === "topic") {
      return props.questions.map((q) => ({ topicSlug: props.slug, topicTitle: props.title, question: q }));
    }
    return props.pool;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode]);

  const [drillState, setDrillState] = useState(() => ({
    order: shuffle(items.map((_, i) => i)),
    idx: 0,
  }));
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [answerSec, setAnswerSec] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [streak, setStreak] = useState(
    props.mode === "topic" ? (props.initialProgress?.current_streak ?? 0) : 0,
  );
  const [progress, setProgress] = useState<TopicProgressRow | undefined>(
    props.mode === "topic" ? props.initialProgress : undefined,
  );
  const [elapsed, setElapsed] = useState(0);
  const [justMastered, setJustMastered] = useState(false);

  const qStartRef = useRef(0);
  const answeredRef = useRef(false);
  useEffect(() => {
    answeredRef.current = answered;
  }, [answered]);

  const { order, idx } = drillState;
  const current = order.length > 0 ? items[order[idx]] : null;

  // Pace timer chip: freezes once the question is answered, resets on a new question.
  useEffect(() => {
    if (!current) return;
    qStartRef.current = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the pace chip when the question changes, not a derived-state anti-pattern
    setElapsed(0);
    const id = setInterval(() => {
      if (answeredRef.current) return;
      setElapsed(Math.floor((Date.now() - qStartRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, idx]);

  const submitAnswer = useCallback(
    async (choiceIdx: number) => {
      if (answered || !current) return;
      setAnswered(true);
      setPicked(choiceIdx);
      setAnswerSec(Math.round((Date.now() - qStartRef.current) / 1000));

      const correct = choiceIdx === current.question.answer;
      setSessionCount((c) => c + 1);
      if (correct) setSessionCorrect((c) => c + 1);

      try {
        const res = await fetch("/api/drill/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicSlug: current.topicSlug,
            questionId: current.question.id,
            correct,
          }),
        });
        if (!res.ok) return;
        const updated = (await res.json()) as TopicProgressRow;
        setStreak(updated.current_streak);
        if (props.mode === "topic") {
          setProgress(updated);
          if (updated.current_streak === MASTERY_STREAK && topicStatus(updated) === "mastered") {
            setJustMastered(true);
          }
        }
      } catch {
        // best-effort; session score above already reflects the answer
      }
    },
    [answered, current, props.mode],
  );

  const goNext = useCallback(() => {
    if (!current) return;
    setJustMastered(false);
    const lastRight = picked === current.question.answer;

    setDrillState((s) => {
      if (props.mode === "misses") {
        let { order: o, idx: i } = s;
        if (lastRight) {
          o = o.slice();
          o.splice(i, 1);
        } else {
          i = i + 1;
        }
        if (o.length === 0) return { order: o, idx: 0 };
        if (i >= o.length) i = 0;
        return { order: o, idx: i };
      }
      const nextIdx = s.idx + 1;
      if (nextIdx >= s.order.length) {
        return { order: shuffle(items.map((_, i) => i)), idx: 0 };
      }
      return { order: s.order, idx: nextIdx };
    });
    setAnswered(false);
    setPicked(null);
  }, [current, picked, props.mode, items]);

  // Keyboard shortcuts: A-D / 1-4 to answer, Enter / N / Space for next.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const key = e.key.toLowerCase();
      if (!answeredRef.current) {
        const letterIdx = ["a", "b", "c", "d"].indexOf(key);
        const numIdx = ["1", "2", "3", "4"].indexOf(key);
        const i = letterIdx >= 0 ? letterIdx : numIdx;
        if (i >= 0 && current && i < current.question.choices.length) {
          e.preventDefault();
          void submitAnswer(i);
        }
      } else if (key === "enter" || key === "n" || key === " ") {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, submitAnswer, goNext]);

  const headerTitle =
    props.mode === "topic" ? `${props.title} — Drill` : props.mode === "weak" ? "Weak-Topics Drill" : "Review Your Misses";
  const backHref = props.mode === "topic" ? `/learn/${props.slug}` : "/dashboard";

  if (items.length === 0) {
    return <EmptyState mode={props.mode} backHref={backHref} />;
  }
  if (props.mode === "misses" && order.length === 0) {
    return <EmptyState mode="misses" backHref={backHref} />;
  }
  if (!current) return null;

  const status = props.mode === "topic" ? topicStatus(progress) : "none";
  const accuracyPct = progress && progress.attempts > 0 ? Math.round((progress.correct / progress.attempts) * 100) : 0;
  const missTotal = items.length;
  const missesLeft = order.length;
  const missesCleared = missTotal - missesLeft;
  const weakSubtitle =
    props.mode === "weak"
      ? "Mixing: " + Array.from(new Set(props.pool.map((p) => p.topicTitle))).join(" · ")
      : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <ButtonLink href={backHref} variant="ghost" size="sm" className="mb-2">
            ← Back
          </ButtonLink>
          <h1 className="text-2xl font-semibold text-ink">{headerTitle}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Stat label="This session" value={`${sessionCorrect}/${sessionCount}`} />
          <Stat label="Streak" value={String(streak)} />
          <span
            className={`rounded-full border border-border px-3 py-1 text-sm font-mono ${
              elapsed > TARGET_SEC ? "text-warn" : "text-ink-soft"
            }`}
          >
            {fmtTime(elapsed)}
          </span>
        </div>
      </div>

      {props.mode === "topic" && (
        <div>
          <p className="mb-1.5 text-sm text-ink-soft">
            {status === "mastered" ? (
              <>
                <b className="text-good">Mastered ✓</b> — best streak {progress?.best_streak ?? 0}. Keep sharp.
              </>
            ) : (
              <>
                Streak {streak} · <b>{Math.max(0, MASTERY_STREAK - streak)} in a row</b> to master ({accuracyPct}%
                all-time)
              </>
            )}
          </p>
          <ProgressBar percent={masteryProgress(progress) * 100} tone={status === "mastered" ? "good" : "brand"} />
        </div>
      )}
      {props.mode === "weak" && <p className="text-sm text-ink-soft">{weakSubtitle}</p>}
      {props.mode === "misses" && (
        <p className="text-sm text-ink-soft">
          <b>{missesLeft}</b> miss{missesLeft === 1 ? "" : "es"} left — answer correctly to clear ({missesCleared}/
          {missTotal} cleared)
        </p>
      )}

      <Card className="p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="neutral">{current.question.difficulty}</Badge>
          {props.mode !== "topic" && <Badge tone="brand">{current.topicTitle}</Badge>}
        </div>
        {current.question.stem && (
          <div
            className="mb-3 text-lg text-ink"
            dangerouslySetInnerHTML={{ __html: renderStem(current.question.stem) }}
          />
        )}
        <p className="mb-4 text-sm text-ink-soft">{current.question.questionText}</p>

        <div className="grid gap-2 sm:grid-cols-2">
          {current.question.choices.map((choice, i) => {
            const isCorrect = i === current.question.answer;
            const isPicked = i === picked;
            let tone = "border-border bg-bg-raised hover:bg-border";
            if (answered && isCorrect) tone = "border-good bg-good-soft text-good";
            else if (answered && isPicked) tone = "border-bad bg-bad-soft text-bad";
            else if (answered) tone = "border-border bg-bg-raised opacity-60";

            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                onClick={() => void submitAnswer(i)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${tone}`}
              >
                <span className="font-semibold">{LETTERS[i]}</span>
                <span>{choice}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="mt-4 space-y-2">
            <p className={`text-sm font-medium ${picked === current.question.answer ? "text-good" : "text-bad"}`}>
              {picked === current.question.answer ? "Correct ✓" : "Not quite"}
            </p>
            <p className="text-sm text-ink-soft">{current.question.explanation}</p>
            <p className={`text-xs ${answerSec <= TARGET_SEC ? "text-good" : "text-warn"}`}>
              {answerSec}s — {answerSec <= TARGET_SEC ? "on pace" : "a little slow"} (target {TARGET_SEC}s)
            </p>
          </div>
        )}

        {justMastered && (
          <div className="mt-4 rounded-xl border border-good bg-good-soft px-4 py-3 text-sm text-good">
            <p className="font-semibold">🎉 Topic mastered!</p>
            <p>You hit an {MASTERY_STREAK}-question streak. Move to the next topic or keep drilling.</p>
          </div>
        )}

      </Card>

      {answered && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            Next question →
          </button>
        </div>
      )}

      <p className="text-center text-xs text-ink-faint">
        Keys: <b>A–D</b> answer · <b>Enter</b> next question
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-semibold text-ink">{value}</div>
      <div className="text-xs text-ink-faint">{label}</div>
    </div>
  );
}

function EmptyState({ mode, backHref }: { mode: "weak" | "misses" | "topic"; backHref: string }) {
  if (mode === "misses") {
    return (
      <Card className="p-10 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="mt-2 text-xl font-semibold text-ink">All misses cleared!</h2>
        <p className="mt-2 text-ink-soft">
          You&apos;ve re-drilled every question you got wrong. That&apos;s the habit that gets you to 36.
        </p>
        <ButtonLink href="/dashboard" className="mt-4">
          Back to dashboard
        </ButtonLink>
      </Card>
    );
  }
  return (
    <Card className="p-10 text-center">
      <p className="text-ink-soft">No questions available yet.</p>
      <ButtonLink href={backHref} className="mt-4">
        Back
      </ButtonLink>
    </Card>
  );
}
