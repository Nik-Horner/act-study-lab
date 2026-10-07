"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { QuestionView } from "./act/QuestionView";
import { Calculator } from "./act/Calculator";
import { renderStem } from "@/lib/format";
import type { DailyPlan, DailyQuestion } from "@/lib/daily-plan";
import type { Question } from "@/lib/act/types";
interface DailyState {
  plan: DailyPlan;
  saved: boolean;
  answers: Record<string, number>;
  lessons: string[];
  deadline: number | null;
  today: string;
  error?: string;
  minutes: number;
}
const label = (s: string) => s[0].toUpperCase() + s.slice(1);
export function DailyStudy({ runner = false }: { runner?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<DailyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const [review, setReview] = useState<DailyQuestion | null>(null);
  const [now, setNow] = useState(Date.now);
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState(false);
  const questionStart = useRef(0);
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
      setData(d);
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
  async function action(body: Record<string, unknown>) {
    if (!data || pending) return;
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: data.plan.id, ...body }),
      });
      const d = await r.json();
      if (!r.ok)
        throw new Error(d.error ?? "Couldn’t save. Retry before leaving.");
      setData(d);
      if (body.action === "start") {
        setStarted(true);
        questionStart.current = Date.now();
      }
      return d as DailyState;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setPending(false);
    }
  }
  if (!data)
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8">
          <h1 className="text-xl font-semibold">Your daily lesson</h1>
          <p role="status" className="mt-3 text-ink-soft">
            {error ?? "Preparing your four-subject session…"}
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
  const all = plan.blocks.flatMap((b) => b.questions);
  const count = Object.keys(answers).length;
  const remaining =
    data.deadline === null
      ? data.minutes * 60
      : Math.max(0, Math.ceil((data.deadline - now) / 1000));
  const expired = data.deadline !== null && remaining === 0;
  const block = plan.blocks.find(
    (b) =>
      !lessons.includes(b.subject) ||
      b.questions.some((q) => answers[q.id] === undefined),
  );
  const q = block?.questions.find((q) => answers[q.id] === undefined);
  const time = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const errorView = error && (
    <p
      role="alert"
      className="rounded-xl border border-border bg-bg-soft p-4 text-sm text-bad"
    >
      {error}
    </p>
  );
  if (!runner)
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Your daily study, handled.</h1>
          <p className="mt-3 leading-relaxed text-ink-soft">
            One guided session through English, Reading, Math, and Science. We
            choose the categories and keep everything inside your {data.minutes}
            -minute study time.
          </p>
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
            ) : expired ? (
              <>
                <p className="font-semibold">Today’s study time is complete.</p>
                <p className="mt-2 text-sm text-ink-soft">
                  Your {count} saved {count === 1 ? "answer" : "answers"} and
                  unfinished work will be ready tomorrow.
                </p>
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
                  <p className="mt-1 text-sm text-ink-soft">{b.title}</p>
                </div>
                <span className="shrink-0 text-sm text-ink-soft">
                  {b.questions.every((q) => answers[q.id] !== undefined) &&
                  lessons.includes(b.subject)
                    ? "Done"
                    : `~${b.minutes} min`}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-ink-soft">
            Question pacing is an estimate. The session clock caps your total
            time; unfinished work carries forward.
          </p>
        </Card>
        {errorView}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm">
          <Link href="/account" className="text-ink-soft underline">
            Change study time or scores
          </Link>
          <Link href="/practice" className="text-ink-soft underline">
            Extra practice
          </Link>
        </div>
      </div>
    );
  if (plan.complete || expired)
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">
            {plan.complete ? "Daily lesson complete" : "Study time complete"}
          </h1>
          <p className="mt-3 text-ink-soft">
            {count} of {all.length} questions answered ·{" "}
            {all.filter((q) => answers[q.id] === q.answer).length} correct
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            {plan.complete
              ? "You covered all four subjects. Your next lesson will be ready tomorrow."
              : "Everything you answered is saved. We’ll continue the unfinished categories tomorrow, inside your daily budget."}
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
                <p className="mb-3 font-semibold">
                  {label(q.subject)} · {q.questionText}
                </p>
                <p className="text-sm text-ink-soft">
                  {answers[q.id] === q.answer ? "Correct" : "Missed"} · Correct
                  answer: {q.choices[q.answer]}
                </p>
                <p className="mt-3 text-sm leading-relaxed">{q.explanation}</p>
              </Card>
            ))}
        {errorView}
      </div>
    );
  if (!started)
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8">
          <h1 className="text-2xl font-semibold">
            Ready for your daily lesson?
          </h1>
          <p className="mt-3 leading-relaxed text-ink-soft">
            We’ll guide you through all four subjects, one category at a time.
            Your account saves every answer.{" "}
            {data.deadline === null
              ? `The ${data.minutes}-minute clock starts when you begin.`
              : `Your study clock has ${time} remaining; it continues across reloads and devices.`}
          </p>
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
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          {label(review?.subject ?? block?.subject ?? "english")} ·{" "}
          {
            plan.blocks.find(
              (b) => b.subject === (review?.subject ?? block?.subject),
            )?.title
          }{" "}
          ·{" "}
          {plan.blocks.findIndex(
            (b) => b.subject === (review?.subject ?? block?.subject),
          ) + 1}{" "}
          of 4 subjects
        </p>
        <p className="tabular-nums text-sm text-ink-soft">
          {time} remaining · {count}/{all.length} answered
        </p>
      </div>
      {errorView}
      {review ? (
        <>
          <DailyQuestionView
            q={review}
            chosen={answers[review.id]}
            onChoose={() => {}}
            revealed
          />
          <Button
            disabled={pending}
            onClick={() => {
              setReview(null);
              setChosen(null);
              questionStart.current = Date.now();
            }}
          >
            Continue
          </Button>
        </>
      ) : block && !lessons.includes(block.subject) ? (
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">{block.title}</h1>
          <p className="mt-4 leading-relaxed text-ink-soft">
            {block.lesson.intro}
          </p>
          {block.lesson.sections.map((section) => (
            <section key={section.heading} className="mt-6 space-y-4">
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              {section.body.map((p, i) => (
                <p key={i} className="max-w-prose leading-relaxed">
                  {p}
                </p>
              ))}
              {section.examples?.map((ex, i) => (
                <div
                  className="rounded-xl border border-border bg-bg p-4"
                  key={i}
                >
                  <p>{ex.text}</p>
                  <p className="mt-2 text-sm text-ink-soft">{ex.label}</p>
                </div>
              ))}
              {section.tip && (
                <p className="text-sm font-medium">{section.tip}</p>
              )}
            </section>
          ))}
          <Button
            className="mt-7"
            disabled={pending}
            onClick={async () => {
              if (await action({ action: "lesson", subject: block.subject }))
                questionStart.current = Date.now();
            }}
          >
            {pending ? "Saving…" : "Practice this category"}
          </Button>
          <Link
            href={`/learn/${block.topic}`}
            className="ml-4 text-sm text-ink-soft underline"
          >
            Full lesson
          </Link>
        </Card>
      ) : current ? (
        <>
          <DailyQuestionView q={current} chosen={chosen} onChoose={setChosen} />
          {current.subject === "math" && <Calculator />}
          <Button
            disabled={chosen === null || pending}
            onClick={async () => {
              const result = await action({
                action: "answer",
                questionId: current.id,
                chosen,
                elapsedMs: Date.now() - questionStart.current,
              });
              if (result) setReview(current);
            }}
          >
            {pending ? "Saving answer…" : "Check answer"}
          </Button>
        </>
      ) : (
        <p>Saving your completed lesson…</p>
      )}
      <p className="text-xs text-ink-soft">
        Each answer saves before you move on. Your clock keeps running if you
        leave; unfinished work carries forward to tomorrow.
      </p>
    </div>
  );
}
function DailyQuestionView({
  q,
  chosen,
  onChoose,
  revealed = false,
}: {
  q: DailyQuestion;
  chosen: number | null;
  onChoose: (n: number | null) => void;
  revealed?: boolean;
}) {
  if (q.subject !== "english")
    return (
      <QuestionView
        q={q as Question}
        chosen={chosen}
        onChoose={onChoose}
        revealed={revealed}
      />
    );
  return (
    <Card className="p-6">
      <p
        className="leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderStem(q.stem) }}
      />
      <h2 className="mt-5 text-lg font-semibold">{q.questionText}</h2>
      <div className="mt-5 space-y-3">
        {q.choices.map((choice, i) => (
          <button
            key={i}
            disabled={revealed}
            aria-pressed={chosen === i}
            onClick={() => onChoose(i)}
            className={`min-h-12 w-full rounded-xl border px-4 py-3 text-left ${chosen === i ? "border-brand bg-brand-soft" : "border-border bg-bg"}`}
          >
            {String.fromCharCode(65 + i)}. {choice}
          </button>
        ))}
      </div>
      {revealed && (
        <div className="mt-6">
          <p className="font-semibold">
            {chosen === q.answer ? "Correct" : "Review this answer"}
          </p>
          <p className="mt-2 text-sm">Correct answer: {q.choices[q.answer]}</p>
          <p className="mt-3 leading-relaxed text-ink-soft">{q.explanation}</p>
        </div>
      )}
    </Card>
  );
}
