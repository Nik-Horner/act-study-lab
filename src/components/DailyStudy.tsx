"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { AnswerFeedback } from "./AnswerFeedback";
import { DailyEnglishLesson } from "./DailyEnglishLesson";
import { EnglishLessonSections } from "./EnglishLessonSections";
import { DrillClient as EnglishDrill } from "@/app/drill/[slug]/DrillClient";
import type { Question as EnglishQuestion } from "@/lib/content";
import { DailyLesson } from "./DailyLesson";
import { DailyDrill } from "./DailyDrill";
import { LessonSections } from "./LessonSections";
import { answerPacing } from "@/lib/question-pacing";
import { type DailyPlan, type DailyQuestion } from "@/lib/daily-plan";
import { DesmosPanel } from "./act/DesmosPanel";
import { QuestionView } from "./act/QuestionView";
import type { Question } from "@/lib/act/types";
import { renderStem } from "@/lib/format";
import {
  dailyStep,
  blockUnits,
  dailyReviewKey,
  dailyFocus,
  dailyConcepts,
} from "@/lib/daily-flow";
import { ScoreChecks } from "./ScoreChecks";
import { dailyDate } from "@/lib/daily-date";
interface DailyState {
  userId: string;
  plan: DailyPlan;
  saved: boolean;
  answers: Record<string, number>;
  answerTimes: Record<string, number>;
  uncertainAnswers?: Record<string, boolean>;
  lessons: string[];
  deadline: number | null;
  today: string;
  error?: string;
  minutes: number;
  includeScience?: boolean;
  goal?: { targetScore: number; testDate: string };
  coverage?: {
    covered: number;
    completedSessions: number;
    total: number;
    testDate: string;
    finishDate: string | null;
    onTrack: boolean;
    requiredMinutes: number | null;
  };
}
const label = (s: string) => s[0].toUpperCase() + s.slice(1);
export function DailyStudy({ runner = false }: { runner?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<DailyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [review, setReview] = useState<DailyQuestion | null>(null);
  const [now, setNow] = useState(Date.now);
  const [started, setStarted] = useState(false);
  const [revisitLesson, setRevisitLesson] = useState(false);
  const [history, setHistory] = useState(false);
  const [uncertainQuestions, setUncertainQuestions] = useState<string[]>([]);
  const [answeringQuestion, setAnsweringQuestion] = useState<string | null>(
    null,
  );
  const answerUncertainty = useRef<Record<string, boolean>>({});
  async function load() {
    try {
      const r = await fetch("/api/daily", { cache: "no-store" });
      const d = await r.json();
      if (r.status === 409) {
        router.replace("/account");
        return;
      }
      if (!r.ok)
        throw new Error(d.error ?? "Couldn’t load your daily lesson. Retry.");
      setError(null);
      setData((previous) => ({ ...previous, ...d }));
      if (runner && d.saved && !d.plan.complete) setStarted(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const initialLoad = setTimeout(() => void load(), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(timer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!data?.today) return;
    const checkDay = () => {
      const today = dailyDate();
      if (today === data.today) return;
      setStarted(false);
      setReview(null);
      setHistory(false);
      setRevisitLesson(false);
      void load();
    };
    const timer = setInterval(checkDay, 60000);
    window.addEventListener("focus", checkDay);
    document.addEventListener("visibilitychange", checkDay);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", checkDay);
      document.removeEventListener("visibilitychange", checkDay);
    };
  }, [data?.today]); // eslint-disable-line react-hooks/exhaustive-deps
  async function action(body: Record<string, unknown>) {
    if (!data || pending) return;
    if (body.action === "answer" && typeof body.questionId === "string") {
      const id = body.questionId;
      answerUncertainty.current[id] ??= body.uncertain === true;
      body = { ...body, uncertain: answerUncertainty.current[id] };
      setAnsweringQuestion(id);
    }
    setPending(true);
    setError(null);
    try {
      // A session crossing local midnight gets today's durable clock before
      // saving its next step. It does not reset an existing daily deadline.
      if (
        body.action !== "start" &&
        body.action !== "next" &&
        (!data.saved || data.deadline === null)
      ) {
        const start = await fetch("/api/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: data.plan.id, action: "start" }),
        });
        const clock = await start.json();
        if (!start.ok)
          throw new Error(clock.error ?? "Couldn’t start today’s study timer.");
        setData(clock);
      }
      const r = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: data.plan.id, ...body }),
      });
      const d = await r.json();
      if (!r.ok)
        throw new Error(d.error ?? "Couldn’t save. Retry before leaving.");
      setData((previous) => ({ ...previous, ...d }));
      if (body.action === "start" || body.action === "next") {
        setStarted(true);
        if (body.action === "next") {
          answerUncertainty.current = {};
          setAnsweringQuestion(null);
        }
      }
      return d as DailyState;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setPending(false);
    }
  }
  const step = data ? dailyStep(data.plan, data.answers, data.lessons) : null;
  const screenKey = `${started}:${revisitLesson}:${review ? "drill" : step?.kind}:${review?.id ?? (step && "question" in step ? step.question?.id : step && "unit" in step ? step.unit?.id : "")}`;
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      window.scrollTo({ top: 0, behavior: "auto" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [screenKey]);
  if (!data)
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8">
          <h1 className="text-xl font-semibold">Your daily lesson</h1>
          <p role="status" className="mt-3 text-ink-soft">
            {error ?? "Preparing your daily session…"}
          </p>
          {error && (
            <Button className="mt-4" onClick={() => void load()}>
              Retry
            </Button>
          )}
        </Card>
      </div>
    );
  const { plan, answers, lessons } = data;
  const targetScore = data.goal?.targetScore ?? plan.course?.targetScore;
  const testDate = data.goal?.testDate ?? plan.course?.testDate;
  const focus = dailyFocus(
    plan,
    answers,
    data.answerTimes,
    data.uncertainAnswers,
  );
  const weakCount = plan.blocks.reduce(
    (total, block) => total + (focus?.[block.subject]?.length ?? 0),
    0,
  );
  const all = plan.blocks.flatMap((b) => [
    ...b.questions,
    ...(b.historicalQuestions ?? []),
  ]);
  const count = all.filter((q) => answers[q.id] !== undefined).length;
  const remaining =
    data.deadline === null
      ? data.minutes * 60
      : Math.max(0, Math.ceil((data.deadline - now) / 1000));
  const block = step && "block" in step ? step.block : undefined;
  const resumeTitle =
    step && "unit" in step && step.unit
      ? step.unit.title.replace(/^\d+\.\s*/, "")
      : "Final review";
  const q = step?.kind === "drill" ? step.question : undefined;
  const time = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const errorView = error && (
    <p
      role="alert"
      className="rounded-xl border border-border bg-bg-soft p-4 text-sm text-bad"
    >
      {error}
    </p>
  );
  if (plan.date < data.today && !plan.complete && !started)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">
            Continue where you left off
          </h1>
          <p className="mt-3 text-ink-soft">
            {block && `${label(block.subject)} · ${resumeTitle}`}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {count} saved answers · session started {plan.date}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              disabled={pending}
              onClick={() => {
                if (runner) void action({ action: "start" });
                else router.push("/daily");
              }}
            >
              Resume saved session
            </Button>
            <details>
              <summary className="min-h-11 cursor-pointer py-3 text-sm text-ink-soft underline">
                Choose new lessons instead
              </summary>
              <p className="mb-3 text-sm text-ink-soft">
                This starts a different session. Your previous answers stay in
                history; unfinished lessons return later.
              </p>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={async () => {
                  const result = await action({ action: "next" });
                  if (result && !runner) router.push("/daily");
                }}
              >
                Start today’s lesson
              </Button>
            </details>
          </div>
          <p className="mt-4 text-xs text-ink-soft">
            Resume opens your next unfinished concept or question. Today’s{" "}
            {data.minutes}-minute timer is a goal; you can keep studying after
            it ends.
          </p>
        </Card>
        {errorView}
      </div>
    );
  if (!runner)
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">
            {targetScore ? `Your path to ${targetScore}` : "Daily study"}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {data.minutes} minutes a day ·{" "}
            {testDate
              ? `Test date: ${new Date(`${testDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : `${plan.blocks.length} subjects`}
          </p>
          {data.coverage && (
            <p className="mt-2 text-sm text-ink-soft">
              {data.coverage.completedSessions} Daily sessions completed ·{" "}
              {data.coverage.covered}/{data.coverage.total} focused skills
              covered ·{" "}
              {data.coverage.onTrack
                ? `First pass planned by ${data.coverage.finishDate}`
                : data.coverage.requiredMinutes
                  ? `Set ${data.coverage.requiredMinutes} min/day to finish before ${data.coverage.testDate}`
                  : `The remaining lessons don’t fit before ${data.coverage.testDate}. Focus on weak skills and timed practice.`}
            </p>
          )}
          <div className="mt-6">
            {plan.complete ? (
              <>
                <p className="font-semibold text-good">
                  Today’s lesson is complete.
                </p>
                <p className="mt-2 text-sm text-ink-soft">
                  You answered {count} questions. Come back tomorrow for the
                  next categories.
                </p>
                <Link
                  href="/daily"
                  className="mt-4 inline-block text-sm text-brand underline"
                >
                  Review today’s answers
                </Link>
              </>
            ) : (
              <Link
                href="/daily"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand px-6 font-semibold text-white hover:bg-brand-dark"
              >
                {data.saved ? "Continue daily lesson" : "Start daily lesson"}
              </Link>
            )}
          </div>
          <ol className="mt-7 divide-y divide-border">
            {plan.blocks.map((b) => (
              <li
                key={b.subject}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{label(b.subject)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {blockUnits(b)
                      .map((unit) => unit.title.replace(/^\d+\.\s*/, ""))
                      .join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {b.questions.length} practice questions
                    {focus?.[b.subject]?.length
                      ? ` · ${focus[b.subject]!.length} skills to revisit`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-ink-soft">
                  {plan.complete || lessons.includes(dailyReviewKey(b))
                    ? "Done"
                    : `~${b.minutes} min`}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-ink-soft">
            Wrong, slow, and uncertain answers return for review. New questions
            take priority over questions you’ve already answered.
          </p>
          {targetScore && (
            <ScoreChecks
              ownerId={data.userId}
              targetScore={targetScore}
              today={data.today}
              includeScience={data.includeScience !== false}
            />
          )}
        </Card>
        {errorView}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm">
          <Link
            href="/account#daily-subjects"
            className="text-ink-soft underline"
          >
            Change daily subjects, time, or scores
          </Link>
          <Link href="/practice" className="text-ink-soft underline">
            Extra practice
          </Link>
        </div>
      </div>
    );
  if (plan.complete && !review)
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Daily lesson complete</h1>
          <p className="mt-3 text-ink-soft">
            {count} of {all.length} questions answered ·{" "}
            {all.filter((q) => answers[q.id] === q.answer).length} correct
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            {weakCount
              ? `${weakCount} skills need another look. They return in upcoming practice.`
              : "No new weak skills flagged in this session. Keep checking your progress with fresh, timed practice."}{" "}
            Your next lesson is ready tomorrow.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-brand underline"
          >
            Back to daily study
          </Link>
          <Button
            variant="ghost"
            className="ml-4"
            onClick={() => setHistory(!history)}
          >
            {history ? "Hide" : "Review"} saved answers
          </Button>
        </Card>
        {history &&
          all
            .filter((q) => answers[q.id] !== undefined)
            .map((q) => (
              <Card className="p-5" key={q.id}>
                <details open={answers[q.id] !== q.answer}>
                  <summary className="cursor-pointer font-semibold">
                    {label(q.subject)} ·{" "}
                    {answers[q.id] === q.answer
                      ? "Correct"
                      : "Missed — review this"}
                  </summary>
                  <DailyCorrection
                    q={q}
                    chosen={answers[q.id]}
                    elapsedMs={data.answerTimes[q.id]}
                  />
                </details>
              </Card>
            ))}
        {errorView}
      </div>
    );
  if (!started)
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8">
          <h1 className="text-2xl font-semibold">Daily study</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {data.minutes} minutes ·{" "}
            {plan.blocks.map((block) => label(block.subject)).join(", ")}
          </p>
          <ol className="mt-5 divide-y divide-border">
            {plan.blocks.map((b) => (
              <li
                key={b.subject}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="font-semibold">{label(b.subject)}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {blockUnits(b).length}{" "}
                    {b.reviewOnly
                      ? "skills to review"
                      : `focused lesson${blockUnits(b).length === 1 ? "" : "s"}`}{" "}
                    · {b.questions.length} questions · recap
                  </p>
                </div>
                <span className="text-sm text-ink-soft">~{b.minutes} min</span>
              </li>
            ))}
          </ol>
          <Button
            className="mt-6 w-full"
            disabled={pending}
            onClick={() => void action({ action: "start" })}
          >
            {pending
              ? "Starting…"
              : data.saved
                ? "Continue lesson"
                : "Begin lesson"}
          </Button>
          {errorView}
        </Card>
      </div>
    );
  const current = review ?? q;
  const currentBlock = plan.blocks.find(
    (b) => b.subject === (review?.subject ?? block?.subject),
  );
  const currentUnit =
    currentBlock &&
    (review
      ? [...blockUnits(currentBlock), ...(currentBlock.reviewUnits ?? [])].find(
          (u) =>
            review.reviewUnitId
              ? u.id === review.reviewUnitId
              : (u.practiceIds?.includes(review.id) ??
                u.topic === review.topic),
        )
      : step && "unit" in step
        ? step.unit
        : undefined);
  const practiceQuestions =
    current?.phase === "review"
      ? (currentBlock?.reviewQuestions ?? [])
      : (currentUnit?.questions ?? []);
  const blockAnswers = practiceQuestions.filter(
    (item) => answers[item.id] !== undefined,
  );
  let streak = 0;
  for (const item of [...blockAnswers].reverse()) {
    if (answers[item.id] !== item.answer) break;
    streak++;
  }
  function nextQuestion() {
    answerUncertainty.current = {};
    setAnsweringQuestion(null);
    setReview(null);
    setRevisitLesson(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  const LessonComponent =
    currentBlock?.subject === "english" ? DailyEnglishLesson : DailyLesson;
  const showLesson =
    currentUnit && (revisitLesson || (!review && step?.kind === "lesson"));
  return (
    <div className="daily-workbench mx-auto max-w-6xl space-y-6">
      <ol
        className="daily-subject-rail"
        aria-label="Daily subjects"
        style={{
          gridTemplateColumns: `repeat(${plan.blocks.length}, minmax(0, 1fr))`,
        }}
      >
        {plan.blocks.map((item) => (
          <li
            key={item.subject}
            aria-current={
              item.subject === currentBlock?.subject ? "step" : undefined
            }
            data-done={lessons.includes(dailyReviewKey(item))}
          >
            {label(item.subject)}
            {lessons.includes(dailyReviewKey(item)) && (
              <span className="sr-only"> complete</span>
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          {label(currentBlock?.subject ?? "english")} ·{" "}
          {currentBlock?.reviewOnly ||
          current?.phase === "review" ||
          step?.kind === "review"
            ? "Review"
            : `Lesson ${currentUnit ? blockUnits(currentBlock!).findIndex((u) => u.id === currentUnit.id) + 1 : 1}/${currentBlock ? blockUnits(currentBlock).length : 2}`}
        </p>
        <p className="tabular-nums text-sm text-ink-soft">
          {remaining > 0 ? `${time} left` : "Goal reached · keep going"}
        </p>
      </div>
      {errorView}
      {current &&
        !showLesson &&
        (!review || data.uncertainAnswers?.[current.id]) && (
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              disabled={pending || !!review || answeringQuestion === current.id}
              checked={
                review
                  ? !!data.uncertainAnswers?.[current.id]
                  : uncertainQuestions.includes(current.id)
              }
              onChange={(e) =>
                setUncertainQuestions(
                  e.target.checked
                    ? [...uncertainQuestions, current.id]
                    : uncertainQuestions.filter((id) => id !== current.id),
                )
              }
            />
            {review
              ? "Marked unsure — this skill returns for review"
              : "I’m guessing or I can’t explain this yet"}
          </label>
        )}
      {currentBlock && currentBlock.subject === "math" && (
        <DesmosPanel
          key={currentBlock.subject}
          subject={currentBlock.subject}
        />
      )}
      {currentBlock?.subject === "science" && !showLesson && (
        <p className="rounded-xl border border-border bg-bg-raised px-4 py-3 text-sm">
          Science: no calculator. Use the question to find the right evidence.
        </p>
      )}
      {!review && step?.kind === "review" ? (
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-semibold">
              {label(step.block.subject)} · final review
            </h1>
            <p className="mt-3 font-semibold">
              {
                step.block.questions.filter((q) => answers[q.id] === q.answer)
                  .length
              }
              /{step.block.questions.length} correct
            </p>
          </header>
          {[...blockUnits(step.block), ...(step.block.reviewUnits ?? [])].map(
            (unit) => (
              <Card key={unit.id} className="p-6 sm:p-8">
                <h2 className="text-xl font-semibold">{unit.title}</h2>
                <details className="mt-5 rounded-xl border border-border p-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    Rules and worked examples
                  </summary>
                  <div className="mt-5">
                    {step.block.subject === "english" ? (
                      <EnglishLessonSections
                        sections={dailyConcepts(unit).map(
                          (i) => unit.lesson.sections[i],
                        )}
                      />
                    ) : (
                      <LessonSections
                        sections={dailyConcepts(unit).map(
                          (i) => unit.lesson.sections[i],
                        )}
                        idPrefix={`review-${unit.id}`}
                      />
                    )}
                  </div>
                </details>
                <div className="mt-6 divide-y divide-border">
                  {[
                    ...unit.questions,
                    ...(step.block.reviewQuestions ?? []).filter((q) =>
                      q.reviewUnitId
                        ? q.reviewUnitId === unit.id
                        : unit.practiceIds
                          ? unit.practiceIds.includes(q.id)
                          : q.topic === unit.topic,
                    ),
                  ].map((item, i) => (
                    <details
                      key={item.id}
                      className="py-4"
                      open={answers[item.id] !== item.answer}
                    >
                      <summary className="cursor-pointer text-sm font-semibold">
                        Question {i + 1} ·{" "}
                        {answers[item.id] === item.answer
                          ? "Correct"
                          : "Missed — review this"}{" "}
                        ·{" "}
                        {data.answerTimes[item.id] === undefined
                          ? "Pacing unavailable"
                          : `${answerPacing(data.answerTimes[item.id], item.subject).seconds}s / target ${answerPacing(data.answerTimes[item.id], item.subject).target}s`}
                      </summary>
                      <DailyCorrection q={item} chosen={answers[item.id]} />
                    </details>
                  ))}
                </div>
              </Card>
            ),
          )}
          <Button
            disabled={pending}
            className="w-full"
            onClick={() =>
              void action({ action: "review", subject: step.block.subject })
            }
          >
            {pending
              ? "Saving…"
              : step.block.subject === plan.blocks.at(-1)?.subject
                ? "Finish daily study"
                : `Finish ${label(step.block.subject)} review · next subject`}
          </Button>
        </div>
      ) : showLesson && currentUnit ? (
        <LessonComponent
          key={`${currentUnit.id}:${revisitLesson}`}
          unit={currentUnit}
          completed={lessons}
          revisiting={revisitLesson}
          pending={pending}
          onBack={() => setRevisitLesson(false)}
          onAdvance={async (index) => {
            return !!(await action({
              action: "concept",
              unitId: currentUnit.id,
              index,
            }));
          }}
        />
      ) : current && currentBlock?.subject === "english" ? (
        <EnglishDrill
          key={current.id}
          mode="topic"
          slug={current.topic}
          title={currentUnit?.title ?? currentBlock.title}
          questions={[current as EnglishQuestion]}
          initialProgress={undefined}
          daily={{
            savedChoice: review ? answers[current.id] : undefined,
            savedSeconds:
              data.answerTimes[current.id] === undefined
                ? undefined
                : Math.round(data.answerTimes[current.id] / 1000),
            count: blockAnswers.length,
            correct: blockAnswers.filter(
              (item) => answers[item.id] === item.answer,
            ).length,
            streak,
            onNext: nextQuestion,
            onAnswer: async (choice, seconds) => {
              const result = await action({
                action: "answer",
                questionId: current.id,
                chosen: choice,
                elapsedMs: seconds * 1000,
                uncertain: uncertainQuestions.includes(current.id),
              });
              if (result) setReview(current);
              return !!result;
            },
          }}
        />
      ) : current && currentBlock ? (
        <DailyDrill
          key={current.id}
          q={current}
          title={currentUnit?.title ?? currentBlock.title}
          revealed={!!review}
          savedChoice={answers[current.id]}
          savedTime={data.answerTimes[current.id]}
          count={blockAnswers.length}
          total={practiceQuestions.length}
          onLesson={() => {
            setRevisitLesson(true);
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
          onNext={nextQuestion}
          onSubmit={async (choice, elapsedMs) => {
            const result = await action({
              action: "answer",
              questionId: current.id,
              chosen: choice,
              elapsedMs,
              uncertain: uncertainQuestions.includes(current.id),
            });
            if (result) setReview(current);
            return !!result;
          }}
        />
      ) : (
        <p>Saving your completed lesson…</p>
      )}
      <p className="text-xs text-ink-soft">
        Progress saves automatically. Unfinished work carries forward.
      </p>
    </div>
  );
}

function DailyCorrection({
  q,
  chosen,
  elapsedMs,
}: {
  q: DailyQuestion;
  chosen: number;
  elapsedMs?: number;
}) {
  return (
    <div className="mt-4 space-y-4">
      {q.subject === "english" ? (
        <>
          <div
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderStem(q.stem) }}
          />
          <p className="font-semibold">{q.questionText}</p>
          <ol className="space-y-2 text-sm">
            {q.choices.map((choice, i) => (
              <li
                key={i}
                className={`rounded-lg border p-3 ${i === q.answer ? "border-good bg-good-soft" : i === chosen ? "border-bad bg-bad-soft" : "border-border"}`}
              >
                {String.fromCharCode(65 + i)}. {choice}
                {i === q.answer
                  ? " (correct)"
                  : i === chosen
                    ? " (your answer)"
                    : ""}
              </li>
            ))}
          </ol>
          <AnswerFeedback
            choices={q.choices}
            answer={q.answer}
            chosen={chosen}
            explanation={q.explanation}
          />
        </>
      ) : (
        <QuestionView
          q={q as Question}
          chosen={chosen}
          onChoose={() => {}}
          revealed
        />
      )}
      {elapsedMs !== undefined && (
        <p className="text-sm text-ink-soft">
          {answerPacing(elapsedMs, q.subject).seconds}s · target{" "}
          {answerPacing(elapsedMs, q.subject).target}s
        </p>
      )}
    </div>
  );
}
