"use client";
import { learningRewards } from "@/lib/learning-rewards";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProgressBar } from "./ui/ProgressBar";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { StudyIcon } from "./StudyIcon";
import { AnswerFeedback } from "./AnswerFeedback";
import { DailyEnglishLesson } from "./DailyEnglishLesson";
import { EnglishLessonSections } from "./EnglishLessonSections";
import { DrillClient as EnglishDrill } from "@/app/drill/[slug]/DrillClient";
import type { Question as EnglishQuestion } from "@/lib/content";
import { DailyLesson } from "./DailyLesson";
import { DailyDrill } from "./DailyDrill";
import { LessonActivity } from "./LessonActivity";
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
import { DailyPath } from "./DailyPath";
import { dailyDate } from "@/lib/daily-date";
import { FormulaCards } from "./FormulaCards";
import type { FormulaDay } from "@/lib/formula-schedule";
export interface DailyState {
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
  availableMinutes?: number;
  retryQuestionId?: string;
  retryUnavailable?: true;
  includeScience?: boolean;
  formulas?: FormulaDay;
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
export function DailyStudy({
  runner = false,
  initialView,
}: {
  runner?: boolean;
  initialView?: "lesson" | "formulas";
}) {
  const router = useRouter();
  const [data, setData] = useState<DailyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [review, setReview] = useState<DailyQuestion | null>(null);
  const [started, setStarted] = useState(false);
  const [formulasLater, setFormulasLater] = useState(
    initialView !== "formulas",
  );
  const [revisitLesson, setRevisitLesson] = useState(false);
  const [history, setHistory] = useState(false);
  const [uncertainQuestions, setUncertainQuestions] = useState<string[]>([]);
  const [answeringQuestion, setAnsweringQuestion] = useState<string | null>(
    null,
  );
  const answerUncertainty = useRef<Record<string, boolean>>({});
  function chooseFormulaReview(later: boolean) {
    if (!data) return;
    setFormulasLater(later);
    setReview(null);
    setRevisitLesson(false);
    if (runner)
      router.replace(`/daily?view=${later ? "lesson" : "formulas"}`, {
        scroll: false,
      });
  }
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
      setFormulasLater(initialView !== "formulas");
      setError(null);
      setData((previous) => ({ ...previous, ...d }));
      if (
        runner &&
        d.saved &&
        (!d.plan.complete || d.formulas?.remaining.length)
      )
        setStarted(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const initialLoad = setTimeout(() => void load(), 0);
    return () => {
      clearTimeout(initialLoad);
    };
  }, [initialView]); // eslint-disable-line react-hooks/exhaustive-deps
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
          throw new Error(
            clock.error ?? "Couldn’t start today’s lesson. Retry.",
          );
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
  async function openDaily(view: "lesson" | "formulas", newSession = false) {
    if (!data || pending) return;
    chooseFormulaReview(view === "lesson");
    if (data.plan.complete && view === "lesson") {
      if (!runner) router.push("/daily?view=lesson");
      return;
    }
    const result = await action({ action: newSession ? "next" : "start" });
    if (result && !runner) router.push(`/daily?view=${view}`);
  }
  const step = data ? dailyStep(data.plan, data.answers, data.lessons) : null;
  const screenKey = `${started}:${formulasLater}:${revisitLesson}:${review ? "drill" : step?.kind}:${review?.id ?? (step && "question" in step ? step.question?.id : step && "unit" in step ? step.unit?.id : "")}`;
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
  const rewards = learningRewards(data.coverage?.completedSessions ?? 0);
  const formulaPending = (data.formulas?.remaining.length ?? 0) > 0;
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
  const block = step && "block" in step ? step.block : undefined;
  const q = step?.kind === "drill" ? step.question : undefined;
  const errorView = error && (
    <p
      role="alert"
      className="rounded-xl border border-border bg-bg-soft p-4 text-sm text-bad"
    >
      {error}
    </p>
  );
  if (!runner || (!started && !plan.complete))
    return (
      <DailyPath
        data={data}
        pending={pending}
        error={error}
        onContinue={() => void openDaily("lesson")}
        onFormulas={() => void openDaily("formulas")}
        onNewSession={() => void openDaily("lesson", true)}
      />
    );
  if (started && formulaPending && data.formulas && !review && !formulasLater)
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold">Daily formulas</h1>
          <p className="text-ink-soft">
            Optional recall practice. Your lesson progress stays saved.
          </p>
          <p className="text-sm text-ink-soft">
            {data.formulas.recalled}/{data.formulas.total} recalled on two days
            · Goal: {data.formulas.total}
            {testDate && (
              <>
                {" "}
                by{" "}
                {new Date(`${testDate}T12:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </>
            )}
          </p>
          <Button variant="ghost" onClick={() => chooseFormulaReview(true)}>
            {plan.complete ? "Review today’s lessons" : "Continue to lessons"}
          </Button>
          <p className="text-sm text-ink-soft">
            {data.formulas.remaining.length} cards remain. Your formula progress
            stays saved for later.
          </p>
        </header>
        <FormulaCards
          key={`${data.userId}:${data.formulas.date}`}
          ids={data.formulas.ids}
          remainingIds={data.formulas.remaining}
          onRate={async (cardId, rating) => {
            const response = await fetch("/api/formulas", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ownerId: data.userId,
                date: data.formulas!.date,
                cardId,
                rating,
              }),
            });
            const result = await response.json();
            if (!response.ok)
              throw new Error(
                result.error ?? "Your formula rating did not save. Retry.",
              );
            if (result.userId !== data.userId)
              throw new Error(
                "Your account changed. Reload before continuing.",
              );
            setData(
              (previous) =>
                previous && { ...previous, formulas: result.formulas },
            );
          }}
        />
        <Link
          href="/dashboard"
          className="inline-block text-sm text-brand underline"
        >
          Save and finish later
        </Link>
      </div>
    );
  if (plan.complete && !review)
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Daily mission complete</h1>
          {data.coverage && (
            <div className="daily-completion-reward">
              <p className="daily-mission-reward">
                <StudyIcon name="star" />
                Session reward: <strong>100 XP</strong> · Level {rewards.level}
              </p>
              <div
                className="daily-reward-progress"
                role="progressbar"
                aria-label={`Progress toward level ${rewards.level + 1}`}
                aria-valuemin={0}
                aria-valuemax={5}
                aria-valuenow={5 - rewards.sessionsToNextLevel}
              >
                <ProgressBar
                  percent={(5 - rewards.sessionsToNextLevel) * 20}
                  tone="good"
                />
              </div>
              <p className="text-sm text-ink-soft">
                {rewards.sessionsToNextLevel} Daily{" "}
                {rewards.sessionsToNextLevel === 1 ? "session" : "sessions"} to
                Level {rewards.level + 1}
              </p>
            </div>
          )}
          <p className="mt-3 text-ink-soft">
            {count} of {all.length} questions answered ·{" "}
            {all.filter((q) => answers[q.id] === q.answer).length} correct
          </p>
          {data.formulas && (
            <p className="mt-3 text-sm text-ink-soft">
              {data.formulas.ids.length - data.formulas.remaining.length}/
              {data.formulas.ids.length} formulas recalled today ·{" "}
              {data.formulas.recalled}/{data.formulas.total} recalled on two
              days
            </p>
          )}
          {formulaPending && (
            <Button className="mt-4" onClick={() => chooseFormulaReview(false)}>
              Review formulas · {data.formulas!.remaining.length} left
            </Button>
          )}
          <p className="mt-3 text-sm text-ink-soft">
            {weakCount
              ? `${weakCount} skills need another look. They return in upcoming practice.`
              : "No new weak skills flagged in this session. Keep checking your progress with fresh, timed practice."}{" "}
            Your next lesson is ready tomorrow.
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            <a
              href="https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep.html"
              target="_blank"
              rel="noreferrer"
              className="text-brand underline"
            >
              Try an official timed section
            </a>
            . Use a fresh form and its scoring key.
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
  async function retryMiss(
    question: DailyQuestion,
  ): Promise<"opened" | "unavailable" | "failed"> {
    const result = await action({ action: "retry", questionId: question.id });
    if (!result) return "failed";
    if (result.retryUnavailable) return "unavailable";
    const next = dailyStep(result.plan, result.answers, result.lessons);
    if (
      next.kind !== "drill" ||
      next.question.id !== result.retryQuestionId ||
      next.question.id === question.id
    ) {
      setError("Couldn’t open a fresh question. Retry before continuing.");
      return "failed";
    }
    nextQuestion();
    return "opened";
  }
  const LessonComponent =
    currentBlock?.subject === "english" ? DailyEnglishLesson : DailyLesson;
  const showLesson =
    currentUnit && (revisitLesson || (!review && step?.kind === "lesson"));
  return (
    <div className="daily-workbench space-y-6">
      <header className="daily-runner-header">
        <Link href="/dashboard">
          <StudyIcon name="arrow" />
          Today’s path
        </Link>
        <p>
          {testDate && (
            <>
              <StudyIcon name="calendar" />
              Test day ·{" "}
              {new Date(`${testDate}T12:00:00`).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              <span aria-hidden="true"> · </span>
            </>
          )}
          <span>~{data.minutes} min planned</span>
        </p>
        {formulaPending && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => chooseFormulaReview(false)}
          >
            Formulas · optional
          </Button>
        )}
      </header>
      <ol
        className="daily-subject-rail"
        aria-label="Daily subjects"
        data-count={plan.blocks.length}
      >
        {plan.blocks.map((item) => (
          <li
            key={item.subject}
            aria-current={
              item.subject === currentBlock?.subject ? "step" : undefined
            }
            data-done={lessons.includes(dailyReviewKey(item))}
          >
            <StudyIcon
              name={
                lessons.includes(dailyReviewKey(item)) ? "check" : item.subject
              }
            />
            {label(item.subject)}
            {lessons.includes(dailyReviewKey(item)) && (
              <span className="sr-only"> complete</span>
            )}
          </li>
        ))}
      </ol>
      {!showLesson && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            {label(currentBlock?.subject ?? "english")} ·{" "}
            {currentBlock?.reviewOnly ||
            current?.phase === "review" ||
            step?.kind === "review"
              ? "Review"
              : `Lesson ${currentUnit ? blockUnits(currentBlock!).findIndex((u) => u.id === currentUnit.id) + 1 : 1}/${currentBlock ? blockUnits(currentBlock).length : 2}`}
          </p>
        </div>
      )}
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
                          : `${answerPacing(data.answerTimes[item.id], item.subject).seconds}s${item.subject === "reading" ? " · learning time" : ` / target ${answerPacing(data.answerTimes[item.id], item.subject).target}s`}`}
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
                ? formulaPending
                  ? "Finish lessons"
                  : "Finish daily study"
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
      ) : review && current && answers[current.id] !== current.answer ? (
        <DailyMissRecovery
          key={current.id}
          question={current}
          chosen={answers[current.id]}
          pending={pending}
          onRetry={() => retryMiss(current)}
          onNext={nextQuestion}
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
        Go at your pace. Progress saves automatically; unfinished work carries
        forward.
      </p>
    </div>
  );
}

export function DailyMissRecovery({
  question,
  chosen,
  pending,
  onRetry,
  onNext,
}: {
  question: DailyQuestion;
  chosen: number;
  pending: boolean;
  onRetry: () => Promise<"opened" | "unavailable" | "failed">;
  onNext: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  return (
    <section
      className="lesson-player recovery-player"
      aria-label="Review a saved answer"
    >
      <h1 className="text-2xl font-semibold">Let’s work through this one.</h1>
      <p className="text-sm text-ink-soft">
        Your first answer is saved. This step is practice.
      </p>
      <LessonActivity
        activity={{
          prompt: question.questionText || question.stem,
          choices: question.choices,
          answer: question.answer,
          explanation: question.explanation,
          evidence: question.passage,
          evidenceText: question.stem,
          ...(question.subject === "math" ? { diagram: question.id } : {}),
        }}
        initialWrongChoice={chosen}
        onComplete={() => setReady(true)}
      />
      {unavailable && (
        <p role="status" className="text-sm text-ink-soft">
          No fresh question is available for this skill; it will return in
          review.
        </p>
      )}
      <Button
        disabled={!ready || pending}
        onClick={async () => {
          if (!ready || pending) return;
          if (unavailable) onNext();
          else if ((await onRetry()) === "unavailable") setUnavailable(true);
        }}
      >
        {pending
          ? "Finding a fresh question…"
          : unavailable
            ? "Continue to the next step"
            : "Try a fresh question"}
      </Button>
    </section>
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
          {answerPacing(elapsedMs, q.subject).seconds}s
          {q.subject === "reading"
            ? " · learning time"
            : ` · target ${answerPacing(elapsedMs, q.subject).target}s`}
        </p>
      )}
    </div>
  );
}
