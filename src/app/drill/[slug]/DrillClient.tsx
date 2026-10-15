"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderStem, LETTERS, fmtTime } from "@/lib/format";
import type { Question } from "@/lib/content";
import {
  MASTERY_STREAK,
  topicStatus,
  masteryProgress,
  type TopicProgressRow,
} from "@/lib/mastery";
import {
  englishDrillLevel,
  englishDrillOrder,
} from "@/lib/english-drill-order";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Card } from "@/components/ui/Card";

const TARGET_SEC = 42;

export type PoolItem = {
  topicSlug: string;
  topicTitle: string;
  question: Question;
};

type OriginalDrillProps =
  | {
      mode: "topic";
      slug: string;
      title: string;
      questions: Question[];
      initialProgress: TopicProgressRow | undefined;
    }
  | { mode: "weak"; pool: PoolItem[] }
  | { mode: "misses"; pool: PoolItem[] };

type DrillClientProps = OriginalDrillProps & {
  ownerId?: string;
  answeredQuestionIds?: string[];
  currentScore?: number | null;
  targetScore?: number | null;
  daily?: {
    savedChoice?: number;
    savedSeconds?: number;
    count: number;
    correct: number;
    streak: number;
    onAnswer: (choice: number, seconds: number) => Promise<boolean>;
    onNext: () => void;
  };
};
export function DrillClient(props: DrillClientProps) {
  const [ownerId] = useState(props.ownerId);
  const items: PoolItem[] = useMemo(() => {
    if (props.mode === "topic") {
      return props.questions.map((q) => ({
        topicSlug: props.slug,
        topicTitle: props.title,
        question: q,
      }));
    }
    return props.pool;
  }, [props]);

  const [drillState, setDrillState] = useState(() => ({
    order:
      props.daily || props.mode === "misses"
        ? items.map((_, i) => i)
        : englishDrillOrder(
            items.map((item) => item.question),
            props.answeredQuestionIds,
            props.currentScore,
            props.targetScore,
          ),
    idx: 0,
  }));
  const [answered, setAnswered] = useState(
    props.daily?.savedChoice !== undefined,
  );
  const [picked, setPicked] = useState<number | null>(
    props.daily?.savedChoice ?? null,
  );
  const [answerSec, setAnswerSec] = useState(props.daily?.savedSeconds ?? 0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
  const answeredRef = useRef(answered);
  const savedRef = useRef(props.daily?.savedChoice !== undefined);
  const answerIdRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);
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
    async (choiceIdx: number, retry = false) => {
      if (
        (!retry && answeredRef.current) ||
        !current ||
        savedRef.current ||
        saveInFlightRef.current
      )
        return;
      saveInFlightRef.current = true;
      answeredRef.current = true;
      setAnswered(true);
      setPicked(choiceIdx);
      const seconds = retry
        ? answerSec
        : Math.round((Date.now() - qStartRef.current) / 1000);
      setAnswerSec(seconds);
      setSaving(true);
      setSaveError(null);
      try {
        if (props.daily) {
          const saved = await props.daily.onAnswer(choiceIdx, seconds);
          savedRef.current = saved;
          if (!saved)
            setSaveError(
              "Your answer has not saved yet. Retry before continuing.",
            );
          return;
        }
        answerIdRef.current ??= crypto.randomUUID();
        const res = await fetch("/api/drill/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerId,
            answerId: answerIdRef.current,
            topicSlug: current.topicSlug,
            questionId: current.question.id,
            chosen: choiceIdx,
          }),
        });
        if (!res.ok) {
          const result = await res.json();
          setSaveError(
            result.error ??
              "Your answer save could not be confirmed. Retry before continuing.",
          );
          return;
        }
        const updated = (await res.json()) as TopicProgressRow;
        savedRef.current = true;
        setSessionCount((c) => c + 1);
        if (choiceIdx === current.question.answer)
          setSessionCorrect((c) => c + 1);
        setStreak(updated.current_streak);
        if (props.mode === "topic") {
          setProgress(updated);
          if (
            updated.current_streak === MASTERY_STREAK &&
            topicStatus(updated) === "mastered"
          ) {
            setJustMastered(true);
          }
        }
      } catch {
        setSaveError(
          props.daily
            ? "Your answer has not saved yet. Retry before continuing."
            : "Your answer save could not be confirmed. Retry before continuing.",
        );
      } finally {
        saveInFlightRef.current = false;
        setSaving(false);
      }
    },
    [current, props.mode, props.daily, ownerId, answerSec],
  );

  const goNext = useCallback(() => {
    if (
      !answeredRef.current ||
      !savedRef.current ||
      !current ||
      saving ||
      saveError
    )
      return;
    if (props.daily) {
      props.daily.onNext();
      return;
    }
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
      return { order: s.order, idx: s.idx + 1 };
    });
    answeredRef.current = false;
    savedRef.current = false;
    answerIdRef.current = null;
    setAnswered(false);
    setPicked(null);
  }, [current, picked, props.mode, props.daily, saving, saveError]);

  // Keyboard shortcuts: A-D / 1-4 to answer, Enter / N / Space for next.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.closest("input,textarea,select,button,a,summary")
      )
        return;

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
    props.mode === "topic"
      ? `${props.title} — Drill`
      : props.mode === "weak"
        ? "Weak-Topics Drill"
        : "Review Your Misses";
  const backHref =
    props.mode === "topic" ? `/learn/${props.slug}` : "/dashboard";

  if (items.length === 0) {
    return <EmptyState mode={props.mode} backHref={backHref} />;
  }
  if (props.mode === "misses" && order.length === 0) {
    return <EmptyState mode="misses" backHref={backHref} />;
  }
  if (!current)
    return (
      <Card className="p-10 text-center">
        <h2 className="text-xl font-semibold text-ink">
          Practice set complete
        </h2>
        <p className="mt-2 text-ink-soft">
          You answered every question in this set. Apply the skills in a timed
          section, or revisit the lesson before practicing again.
        </p>
        <ButtonLink href="/exam" className="mt-4">
          Try a timed section
        </ButtonLink>
      </Card>
    );

  const status = props.mode === "topic" ? topicStatus(progress) : "none";
  const accuracyPct =
    progress && progress.attempts > 0
      ? Math.round((progress.correct / progress.attempts) * 100)
      : 0;
  const missTotal = items.length;
  const missesLeft = order.length;
  const missesCleared = missTotal - missesLeft;
  const weakSubtitle =
    props.mode === "weak"
      ? "Mixing: " +
        Array.from(new Set(props.pool.map((p) => p.topicTitle))).join(" · ")
      : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <ButtonLink
            href={backHref}
            variant="ghost"
            size="sm"
            className="mb-2"
          >
            ← Back
          </ButtonLink>
          <h1 className="text-2xl font-semibold text-ink">{headerTitle}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Stat
            label="This session"
            value={`${props.daily?.correct ?? sessionCorrect}/${props.daily?.count ?? sessionCount}`}
          />
          <Stat label="Streak" value={String(props.daily?.streak ?? streak)} />
          <span
            className={`rounded-full border border-border px-3 py-1 text-sm font-mono ${
              elapsed > TARGET_SEC ? "text-warn" : "text-ink-soft"
            }`}
          >
            {fmtTime(elapsed)}
          </span>
        </div>
      </div>

      {props.mode === "topic" && !props.daily && (
        <div>
          <p className="mb-1.5 text-sm text-ink-soft">
            {status === "mastered" ? (
              <>
                <b className="text-good">Practice milestone reached</b> — best
                streak {progress?.best_streak ?? 0}. Keep building independent
                practice evidence.
              </>
            ) : (
              <>
                Streak {streak} ·{" "}
                <b>{Math.max(0, MASTERY_STREAK - streak)} in a row</b> to reach
                the practice milestone ({accuracyPct}% all-time)
              </>
            )}
          </p>
          <ProgressBar
            percent={masteryProgress(progress) * 100}
            tone={status === "mastered" ? "good" : "brand"}
          />
        </div>
      )}
      {!props.daily && props.mode !== "misses" && (
        <p className="text-sm text-ink-soft">
          {props.targetScore ? `Goal ${props.targetScore} · ` : ""}
          {
            {
              foundation: "Foundation practice",
              challenge: "Challenge practice",
              balanced: "Mixed difficulty",
            }[
              englishDrillLevel(
                props.currentScore ?? null,
                props.targetScore ?? null,
              )
            ]
          }
          {
            " · New questions first. Previously answered questions are labeled for review."
          }
        </p>
      )}
      {props.mode === "weak" && (
        <p className="text-sm text-ink-soft">{weakSubtitle}</p>
      )}
      {props.mode === "misses" && (
        <p className="text-sm text-ink-soft">
          <b>{missesLeft}</b> miss{missesLeft === 1 ? "" : "es"} left — answer
          correctly to clear ({missesCleared}/{missTotal} cleared)
        </p>
      )}

      <Card
        className={props.daily ? "daily-english-question p-5 sm:p-8" : "p-6"}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone="neutral">{current.question.difficulty}</Badge>
          {!props.daily && props.mode !== "misses" && (
            <Badge tone="neutral">
              {props.answeredQuestionIds?.includes(current.question.id)
                ? "Review question"
                : "New question"}
            </Badge>
          )}
          {props.mode !== "topic" && (
            <Badge tone="brand">{current.topicTitle}</Badge>
          )}
        </div>
        {current.question.stem && (
          <div
            className="mb-3 text-lg text-ink"
            dangerouslySetInnerHTML={{
              __html: renderStem(current.question.stem),
            }}
          />
        )}
        <p className="mb-4 text-sm text-ink-soft">
          {current.question.questionText}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {current.question.choices.map((choice, i) => {
            const isCorrect = i === current.question.answer;
            const isPicked = i === picked;
            let tone = "border-border bg-bg-raised hover:bg-border";
            if (answered && isCorrect)
              tone = "border-good bg-good-soft text-good";
            else if (answered && isPicked)
              tone = "border-bad bg-bad-soft text-bad";
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

        {answered && !saving && !saveError && (
          <div className="mt-4 space-y-2">
            <p
              className={`text-sm font-medium ${picked === current.question.answer ? "text-good" : "text-bad"}`}
            >
              {picked === current.question.answer ? "Correct ✓" : "Not quite"}
            </p>
            <p className="text-sm text-ink-soft">
              {current.question.explanation}
            </p>
            <p
              className={`text-xs ${answerSec <= TARGET_SEC ? "text-good" : "text-warn"}`}
            >
              {answerSec}s —{" "}
              {answerSec <= TARGET_SEC ? "on pace" : "a little slow"} (target{" "}
              {TARGET_SEC}s)
            </p>
          </div>
        )}

        {justMastered && (
          <div className="mt-4 rounded-xl border border-good bg-good-soft px-4 py-3 text-sm text-good">
            <p className="font-semibold">Practice milestone reached</p>
            <p>
              You hit an {MASTERY_STREAK}-question streak. Move to the next
              topic and test these skills on fresh questions. This streak does
              not estimate an ACT score.
            </p>
          </div>
        )}
      </Card>

      {saving && (
        <p role="status" className="text-center text-sm text-ink-soft">
          Saving answer…
        </p>
      )}
      {saveError && props.daily && (
        <button
          type="button"
          className="min-h-11 text-brand underline"
          onClick={async () => {
            if (picked === null) return;
            setSaving(true);
            try {
              const saved = await props.daily!.onAnswer(picked, answerSec);
              savedRef.current = saved;
              setSaveError(
                saved
                  ? null
                  : "Your answer has not saved yet. Retry before continuing.",
              );
            } catch {
              setSaveError(
                "Your answer has not saved yet. Retry before continuing.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          Retry saving answer
        </button>
      )}
      {saveError && !props.daily && (
        <button
          type="button"
          disabled={saving}
          className="min-h-11 text-brand underline"
          onClick={() => picked !== null && void submitAnswer(picked, true)}
        >
          Retry saving answer
        </button>
      )}
      {saveError && (
        <div role="alert" className="text-center text-sm text-bad">
          <p>{saveError}</p>
          {!props.daily && (
            <button
              type="button"
              className="mt-2 min-h-11 text-brand underline"
              onClick={() => window.location.reload()}
            >
              Reload and check saved progress
            </button>
          )}
        </div>
      )}
      {answered && !saving && !saveError && (
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

function EmptyState({
  mode,
  backHref,
}: {
  mode: "weak" | "misses" | "topic";
  backHref: string;
}) {
  if (mode === "misses") {
    return (
      <Card className="p-10 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="mt-2 text-xl font-semibold text-ink">
          All misses cleared!
        </h2>
        <p className="mt-2 text-ink-soft">
          You&apos;ve re-drilled the questions in your miss list. Try fresh
          questions next to check whether the skills transfer.
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
