"use client";
import { DesmosPanel } from "./DesmosPanel";
import { QuestionPacing } from "../QuestionPacing";
import { LessonSections } from "../LessonSections";
import { MathText } from "../MathText";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  getTopics,
  getTopic,
  getLesson,
  getAllQuestions,
  getQuestions,
  getQuestion,
  asSubject,
  SUBJECT_LABELS,
} from "@/lib/act/content";
import type { Subject, Question } from "@/lib/act/types";
import {
  useProgress,
  getTopicStats,
  subjectBaseline,
  masteryRequirements,
  recordAnswer,
  setPlanTaskComplete,
  type StudyState,
  type AnswerRecord,
  retryPending,
} from "@/lib/act/progress";
import { buildStudyPlan, localDate } from "@/lib/act/plan";
import { daysUntil } from "@/lib/format";
import { practiceStage, selectPracticeSet } from "@/lib/act/practice-queue";
import { practiceForMisses } from "@/lib/act/question-method";
import { Card } from "../ui/Card";
import { Button, ButtonLink } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { SubjectNav } from "../SubjectNav";
import { QuestionView } from "./QuestionView";
import { useQuestionNavigation } from "./useQuestionNavigation";
function Loading() {
  return (
    <div role="status" className="space-y-4">
      <span className="sr-only">Loading saved progress</span>
      {[1, 2, 3].map((n) => (
        <div
          className="h-24 rounded-xl bg-bg-raised motion-safe:animate-pulse"
          key={n}
        />
      ))}
    </div>
  );
}
function StorageNotice({ error }: { error: string | null }) {
  return error ? (
    <p
      role="alert"
      className="mb-5 rounded-xl bg-warn-soft p-4 text-sm text-ink"
    >
      {error}{" "}
      <button className="ml-2 underline" onClick={() => void retryPending()}>
        Retry saving
      </button>
    </p>
  ) : null;
}
function AccountUnavailable({ error }: { error: string | null }) {
  return (
    <Card className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-semibold">
        Your account progress is unavailable
      </h1>
      <p role="alert" className="mt-3 text-sm text-ink-soft">
        {error ?? "Sign in to load your saved practice before continuing."}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={() => void retryPending()}>Try again</Button>
        <ButtonLink href="/account" variant="ghost">
          Account settings
        </ButtonLink>
        <ButtonLink href="/login" variant="ghost">
          Sign in
        </ButtonLink>
      </div>
    </Card>
  );
}
function Arrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={`shrink-0 ${back ? "rotate-180" : ""}`}
    >
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}
function topicStats(state: StudyState, slug: string) {
  return getTopicStats(
    slug,
    getAllQuestions(),
    state.answers,
    state.profile.targetScore,
  );
}
export function Dashboard({ subjectOverride }: { subjectOverride?: Subject }) {
  const { state, ready, update, storageError, userId } = useProgress();
  const searchSubject = useSearchParams().get("subject");
  const subject = asSubject(subjectOverride ?? searchSubject ?? undefined);
  const [currentDate, setCurrentDate] = useState(() => localDate(new Date()));
  useEffect(() => {
    const refreshDate = () => setCurrentDate(localDate(new Date()));
    const interval = window.setInterval(refreshDate, 30_000);
    window.addEventListener("focus", refreshDate);
    document.addEventListener("visibilitychange", refreshDate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshDate);
      document.removeEventListener("visibilitychange", refreshDate);
    };
  }, []);
  if (!ready) return <Loading />;
  if (!userId) return <AccountUnavailable error={storageError} />;
  const topics = getTopics(subject),
    stats = topics.map((t) => topicStats(state, t.slug)),
    mastered = stats.filter((s) => s.mastered).length;
  const misses = stats.flatMap((s) => s.unresolvedIds).length;
  const { days: plan, deferred } = buildStudyPlan(
    state.profile.testDate,
    state.profile.minutesPerDay,
    {
      startDate: state.planStartDate,
      completedTaskIds: state.planChecks,
      completionDates: state.planCheckDates,
    },
    new Date(`${currentDate}T12:00:00`),
    subject === "reading" ? "reading" : "math-science",
  );
  const today = plan.find((d) => d.isToday);
  function markTask(id: string, complete: boolean) {
    const date = localDate(new Date());
    setCurrentDate(date);
    update((current) => setPlanTaskComplete(current, id, complete, date));
  }
  const baseline = subjectBaseline(state.profile, subject);
  const testDate = new Date(
    state.profile.testDate + "T12:00:00",
  ).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <StorageNotice error={storageError} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SubjectNav subject={subject} />
        <Link
          href="/account"
          className="text-sm text-ink-soft transition-colors hover:text-brand"
        >
          {state.profile.minutesPerDay} min/day · Edit plan
        </Link>
        {subject === "math" && (
          <Link
            href="/learn/math-formulas"
            className="text-sm text-brand underline"
          >
            Formulas and methods
          </Link>
        )}
      </div>
      <Card className="flex flex-wrap items-center justify-between gap-6 p-6 sm:p-7">
        <div className="max-w-lg">
          <h1 className="text-2xl font-bold tracking-tight">
            {subject === "math"
              ? `Close the gap${baseline === null ? "" : ` from ${baseline}`} to ${state.profile.targetScore ?? 36}.`
              : `Build the ${SUBJECT_LABELS[subject]} score you came for.`}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {subject === "math"
              ? "Target the hard questions, protect your pacing, and catch avoidable mistakes."
              : subject === "reading"
                ? "Read for structure, prove each answer, and keep your passage pacing steady."
                : "Read the data precisely, test the evidence, and practice deciding under time pressure."}
          </p>
        </div>
        <dl className="grid w-full grid-cols-3 gap-5 border-t border-border pt-5 study-data sm:w-auto sm:min-w-64 sm:border-t-0 sm:pt-0">
          <div>
            <dt className="text-xs text-ink-soft">Days to {testDate}</dt>
            <dd className="mt-1 text-3xl font-bold text-brand">
              {daysUntil(state.profile.testDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Previous score</dt>
            <dd className="mt-1 text-3xl font-bold text-ink-soft">
              {baseline ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Target score</dt>
            <dd className="mt-1 text-3xl font-bold">
              {state.profile.targetScore ?? 36}
            </dd>
          </div>
        </dl>
      </Card>
      <Card className="flex flex-wrap items-center gap-5 p-5 sm:p-6">
        <div className="min-w-32">
          <p className="text-xl font-bold study-data">
            {mastered}/{topics.length}
          </p>
          <p className="text-xs text-ink-soft">Topics mastered in practice</p>
        </div>
        <ProgressBar
          percent={(mastered / topics.length) * 100}
          tone="good"
          className="min-w-28 flex-1"
        />
        <div className="flex w-full flex-wrap gap-2 lg:w-auto">
          <ButtonLink
            size="sm"
            href={`/drill/${subject === "math" ? "hard" : "mixed"}?subject=${subject}`}
          >
            {subject === "math"
              ? "Start a hard Math set"
              : `Start a ${SUBJECT_LABELS[subject]} diagnostic`}
          </ButtonLink>
          <ButtonLink
            size="sm"
            href={`/drill/misses?subject=${subject}`}
            variant="ghost"
          >
            Review misses{misses > 0 ? ` (${misses})` : ""}
          </ButtonLink>
          <ButtonLink
            size="sm"
            href={`/drill/weak?subject=${subject}`}
            variant="ghost"
          >
            Drill weak topics
          </ButtonLink>
          <ButtonLink size="sm" href="/exam" variant="ghost">
            Timed sections
          </ButtonLink>
        </div>
      </Card>
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="section-label">
            {today ? `Today · ${today.label}` : "Your next step"}
          </h2>
          {today && (
            <span className="text-xs text-ink-soft">
              {
                today.items.filter((i) => state.planChecks.includes(i.id))
                  .length
              }
              /{today.items.length} complete
            </span>
          )}
        </div>
        {today && (
          <p className="mb-3 text-sm text-ink-soft">
            Unfinished work carries forward within your daily limit of{" "}
            {state.profile.minutesPerDay} minutes. Mark tasks complete when you
            finish them.
          </p>
        )}
        {today ? (
          <Card className="divide-y divide-border px-5 sm:px-6">
            {today.items.map((item) => {
              const checked = state.planChecks.includes(item.id);
              return (
                <div key={item.id} className="flex items-center gap-3 py-2">
                  <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-bg-raised">
                    <input
                      id={item.id}
                      type="checkbox"
                      checked={checked}
                      aria-label={`Mark complete: ${item.title}`}
                      className="h-4 w-4 shrink-0"
                      onChange={(event) =>
                        markTask(item.id, event.target.checked)
                      }
                    />
                  </label>
                  <Link
                    href={item.href}
                    className={`group flex min-w-0 flex-1 items-center justify-between gap-3 text-sm ${checked ? "text-ink-soft" : "text-ink"}`}
                  >
                    <span
                      className={
                        checked ? "line-through" : "group-hover:text-brand"
                      }
                    >
                      {item.title}
                      {item.id.slice(0, 10) < today.date && (
                        <span className="mt-1 block text-xs text-ink-soft">
                          Carried forward from{" "}
                          {new Date(
                            `${item.id.slice(0, 10)}T12:00:00`,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-ink-soft">
                      <span className="study-data text-xs">
                        {item.minutes} min
                      </span>
                      <Arrow />
                    </span>
                  </Link>
                </div>
              );
            })}
            {today.items.length === 0 && (
              <p className="py-5 text-sm text-ink-soft">
                Today’s work is complete. Your next session is in the full plan
                below.
              </p>
            )}
          </Card>
        ) : (
          <Card className="p-6 text-sm text-ink-soft">
            <p>
              {daysUntil(state.profile.testDate) === 0
                ? "Test day: use the familiar tools, read axes and units, and leave time to check flagged questions."
                : "Open a mixed set to identify what needs work, then review every miss."}
            </p>
          </Card>
        )}
      </section>
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="section-label">{SUBJECT_LABELS[subject]} topics</h2>
          <span className="text-xs text-ink-soft">
            {subject === "reading" ? "24" : "32"} practice questions per topic
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t, i) => {
            const s = stats[i];
            return (
              <Link
                key={t.slug}
                href={`/learn/${t.slug}`}
                className="group rounded-2xl"
              >
                <Card className="flex h-full flex-col p-4 transition-colors group-hover:border-brand">
                  <h3 className="text-sm font-semibold">
                    {t.num}. {t.title}
                  </h3>
                  <p className="mt-1 min-h-9 text-xs leading-relaxed text-ink-soft">
                    {t.blurb}
                  </p>
                  <ProgressBar
                    percent={Math.min(100, (s.unique / 6) * 100)}
                    tone={s.mastered ? "good" : "brand"}
                    className="mt-4"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      tone={
                        s.mastered ? "good" : s.unique > 0 ? "brand" : "neutral"
                      }
                    >
                      {s.mastered
                        ? "Mastered"
                        : s.unique > 0
                          ? "Practicing"
                          : "Not started"}
                    </Badge>
                    <span className="text-xs text-ink-soft study-data">
                      {s.accuracy === null ? (
                        <Arrow />
                      ) : (
                        `${Math.round(s.accuracy * 100)}% accuracy`
                      )}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
        <details className="mt-4 text-xs leading-relaxed text-ink-soft">
          <summary className="w-fit cursor-pointer hover:text-ink">
            How practice mastery works
          </summary>
          <p className="mt-2 max-w-2xl">
            For your target of {state.profile.targetScore ?? 36}: at least{" "}
            {masteryRequirements(state.profile.targetScore ?? 36).questions}{" "}
            independent questions,{" "}
            {Math.round(
              masteryRequirements(state.profile.targetScore ?? 36).accuracy *
                100,
            )}
            % accuracy, and{" "}
            {masteryRequirements(state.profile.targetScore ?? 36).hard} hard
            questions correct at section pace. Worked examples, quick checks,
            and corrected repeats do not supply fresh evidence. Use two
            different official timed forms to check your score goal.
          </p>
        </details>
      </section>
      <details className="rounded-2xl border border-border bg-bg-soft shadow-[var(--shadow-card)]">
        <summary className="cursor-pointer px-5 py-4 font-semibold sm:px-6">
          {subject === "reading" ? "Reading" : "Math + Science"} plan to{" "}
          {testDate}
          <span className="ml-3 text-xs font-normal text-ink-soft">
            {plan.length} study days
          </span>
        </summary>
        <div className="divide-y divide-border border-t border-border">
          {plan.map((day) => (
            <div
              className={`flex flex-wrap gap-3 px-5 py-4 sm:px-6 ${day.isToday ? "bg-brand-soft" : ""}`}
              key={day.date}
            >
              <div className="w-full shrink-0 sm:w-28">
                <h3 className="text-sm font-semibold">
                  {day.label}
                  {day.isToday ? " · Today" : ""}
                </h3>
                <p className="mt-1 text-xs text-ink-soft">
                  {day.items.reduce((n, i) => n + i.minutes, 0)} min
                </p>
              </div>
              <div className="flex-1 space-y-2">
                {day.items.map((item) => (
                  <Link
                    href={item.href}
                    className="block text-sm text-ink-soft hover:text-brand hover:underline"
                    key={item.id}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
              <span className="text-xs text-ink-soft">
                {
                  day.items.filter((i) => state.planChecks.includes(i.id))
                    .length
                }
                /{day.items.length} done
              </span>
            </div>
          ))}
        </div>
      </details>
      {deferred.length > 0 && (
        <details className="rounded-2xl border border-border bg-bg-soft shadow-[var(--shadow-card)]">
          <summary className="cursor-pointer px-5 py-4 font-semibold sm:px-6">
            Remaining work beyond available time
            <span className="ml-3 text-xs font-normal text-ink-soft">
              {
                deferred.filter((item) => !state.planChecks.includes(item.id))
                  .length
              }{" "}
              unfinished tasks
            </span>
          </summary>
          <div className="border-t border-border px-5 py-4 sm:px-6">
            <p className="mb-3 text-sm leading-relaxed text-ink-soft">
              These tasks cannot currently fit before {testDate} at{" "}
              {state.profile.minutesPerDay} minutes per day. Your test date
              stays fixed and the day before stays light. They remain here if
              you choose to do extra work.
            </p>
            <div className="divide-y divide-border">
              {deferred.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2">
                  <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-bg-raised">
                    <input
                      type="checkbox"
                      checked={state.planChecks.includes(item.id)}
                      aria-label={`Mark complete: ${item.title}`}
                      className="h-4 w-4"
                      onChange={(event) =>
                        markTask(item.id, event.target.checked)
                      }
                    />
                  </label>
                  <Link
                    href={item.href}
                    className={`min-w-0 flex-1 text-sm hover:text-brand ${state.planChecks.includes(item.id) ? "text-ink-soft line-through" : "text-ink"}`}
                  >
                    {item.title}
                  </Link>
                  <span className="shrink-0 text-xs text-ink-soft study-data">
                    {item.minutes} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
export function LessonView({ slug }: { slug: string }) {
  const topic = getTopic(slug)!,
    lesson = getLesson(slug);
  const contents = (
    <>
      {lesson.sections.map((s, i) => (
        <a
          href={`#lesson-section-${i}`}
          key={i}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm leading-snug text-ink-soft hover:bg-bg-raised hover:text-ink"
        >
          <span className="study-data text-xs text-ink-faint">{i + 1}</span>
          <span>{s.heading.replace(/^\d+\.\s*/, "")}</span>
        </a>
      ))}
      <a
        href="#lesson-check"
        className="mt-2 flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        Quick check · 3 questions
      </a>
    </>
  );
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link href={`/study/${topic.subject}`} className="back-link">
        <Arrow back />
        Back to {SUBJECT_LABELS[topic.subject]}
      </Link>
      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="brand">{topic.category}</Badge>
          <Badge>{SUBJECT_LABELS[topic.subject]}</Badge>
        </div>
        <p className="prose-study mt-3 text-ink-soft">
          <MathText>{lesson.intro}</MathText>
        </p>
      </header>
      {(topic.subject === "math" || topic.subject === "science") && (
        <DesmosPanel subject={topic.subject} />
      )}
      {topic.subject === "math" && (
        <Link
          href={`/learn/math-formulas#${topic.slug}`}
          className="inline-block min-h-11 text-sm text-brand underline"
        >
          Formulas, conditions, and worked methods for this topic
        </Link>
      )}
      <details className="rounded-xl border border-border bg-bg-soft px-4 py-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold">
          In this lesson
        </summary>
        <nav aria-label="Lesson contents" className="mt-3">
          {contents}
        </nav>
      </details>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <article className="min-w-0 space-y-10">
          <LessonSections sections={lesson.sections} />
        </article>
        <aside className="hidden lg:block">
          <div className="sticky top-8 border-l border-border pl-5">
            <h2 className="mb-3 px-3 text-sm font-semibold">In this lesson</h2>
            <nav aria-label="Lesson contents">{contents}</nav>
            <ButtonLink
              href={`/drill/${slug}`}
              className="mt-5 w-full"
              size="sm"
            >
              Drill this topic
            </ButtonLink>
          </div>
        </aside>
      </div>
      <section
        id="lesson-check"
        className="scroll-mt-8 border-t border-border pt-8"
      >
        <h2 className="mb-2 text-xl font-semibold">Quick check</h2>
        <p className="mb-5 text-sm text-ink-soft">
          Apply the lesson, then read the reasoning behind each answer.
        </p>
        <PracticeSet
          key={slug}
          initialQuestions={lesson.check}
          title="Lesson check"
        />
      </section>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-semibold">Ready to drill?</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Practice {topic.title} with {getQuestions(slug).length} questions
            and immediate explanations.
          </p>
        </div>
        <ButtonLink href={`/drill/${slug}`}>
          Drill this topic
          <Arrow />
        </ButtonLink>
      </Card>
    </div>
  );
}
function PracticeSet({
  initialQuestions,
  title,
  onAnotherSet,
}: {
  initialQuestions: Question[];
  title: string;
  onAnotherSet?: () => void;
}) {
  const { state, ready, update, storageError, userId } = useProgress();
  const [index, setIndex] = useState(0),
    [chosen, setChosen] = useState<number | null>(null),
    [revealed, setRevealed] = useState(false),
    [confidence, setConfidence] =
      useState<AnswerRecord["confidence"]>("medium"),
    [correct, setCorrect] = useState(0),
    [done, setDone] = useState(false);
  const [sessionRecords, setSessionRecords] = useState<AnswerRecord[]>([]);
  const navigation = useQuestionNavigation(
    initialQuestions[index],
    ready && !done,
  );
  const timer = useRef<number | null>(null),
    [lastRecordId, setLastRecordId] = useState<string | null>(null);
  useEffect(() => {
    if (ready) timer.current = Date.now();
  }, [ready, index]);
  if (!ready) return <Loading />;
  if (!userId) return <AccountUnavailable error={storageError} />;
  if (!initialQuestions.length)
    return (
      <Card className="p-6">
        <h2 className="font-semibold">Nothing to review yet.</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Finish a drill or timed section to build your mistake log.
        </p>
        <ButtonLink className="mt-4" href="/dashboard">
          Choose a topic
        </ButtonLink>
      </Card>
    );
  if (done)
    return (
      <Card className="p-6">
        <StorageNotice error={storageError} />
        <h2 className="text-xl font-semibold">
          Set complete: {correct}/{initialQuestions.length}
        </h2>
        <p className="mt-3 text-ink-soft">
          Review the method behind each miss, then apply it to a fresh problem.
          Correcting a remembered answer checks retention, not fresh evidence.
        </p>
        <p className="mt-3 text-sm">
          Average answer time:{" "}
          {Math.round(
            sessionRecords.reduce((n, r) => n + r.elapsedMs, 0) /
              Math.max(1, sessionRecords.length) /
              1000,
          )}{" "}
          seconds ·{" "}
          {
            sessionRecords.filter(
              (r) =>
                r.confidence === "high" &&
                r.chosen !== getQuestion(r.questionId)?.answer,
            ).length
          }{" "}
          high-confidence misses
        </p>
        <div className="mt-5 divide-y divide-border">
          {[...new Set(initialQuestions.map((q) => q.topic))].map((slug) => {
            const records = sessionRecords.filter(
                (r) => getQuestion(r.questionId)?.topic === slug,
              ),
              right = records.filter(
                (r) => r.chosen === getQuestion(r.questionId)?.answer,
              ).length;
            return (
              <div
                key={slug}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <Link className="underline" href={`/learn/${slug}`}>
                  {getTopic(slug)?.title}
                </Link>
                <span>
                  {right}/{records.length}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {onAnotherSet && (
            <Button onClick={onAnotherSet}>Another focused set</Button>
          )}
          <ButtonLink href={`/study/${initialQuestions[0].subject}`}>
            Back to study
          </ButtonLink>
          <ButtonLink
            href={`/drill/misses?subject=${initialQuestions[0].subject}`}
            variant="ghost"
          >
            Review misses
          </ButtonLink>
        </div>
      </Card>
    );
  const q = initialQuestions[index];
  function submit(choice: number | null = chosen) {
    if (revealed) return;
    const id = crypto.randomUUID();
    const record: AnswerRecord = {
      id,
      questionId: q.id,
      chosen: choice,
      elapsedMs: timer.current === null ? 0 : Date.now() - timer.current,
      confidence,
      cause: null,
      at: new Date().toISOString(),
      mode: "drill",
    };
    update(recordAnswer(state, record));
    setLastRecordId(id);
    setSessionRecords((records) => [...records, record]);
    setRevealed(true);
    if (choice === q.answer) setCorrect((n) => n + 1);
  }
  return (
    <Card
      className={`p-5 sm:p-7 ${initialQuestions[index].passage ? "" : "mx-auto max-w-3xl"}`}
    >
      <StorageNotice error={storageError} />
      <div className="mb-5 border-b border-border pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            {title} · Question {index + 1}/{initialQuestions.length}
          </p>
          <Badge tone="neutral">{q.difficulty}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink-soft">
          <span>{getTopic(q.topic)?.title}</span>
          <span className="study-data">
            {correct} correct · {sessionRecords.length} reviewed
          </span>
        </div>
        <ProgressBar
          percent={(sessionRecords.length / initialQuestions.length) * 100}
          className="mt-4"
        />
      </div>
      {(q.subject === "math" || q.subject === "science") && (
        <div className="mb-5">
          <DesmosPanel subject={q.subject} />
        </div>
      )}
      <QuestionPacing
        key={q.id}
        subject={q.subject}
        savedTime={revealed ? sessionRecords.at(-1)?.elapsedMs : undefined}
      />
      <QuestionView
        {...navigation}
        q={q}
        chosen={chosen}
        onChoose={(i) => {
          if (timer.current === null) timer.current = Date.now();
          setChosen(i);
          if (i !== null) submit(i);
        }}
        revealed={revealed}
      />
      {!revealed ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <label className="text-sm">
            Confidence
            <select
              className="ml-3 rounded-lg border border-border bg-bg p-2"
              value={confidence}
              onChange={(e) =>
                setConfidence(e.target.value as AnswerRecord["confidence"])
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <Button onClick={() => submit(null)}>
            Skip and show explanation
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          {chosen !== q.answer && (
            <label className="block text-sm">
              What caused the miss?
              <select
                aria-label="Mistake cause"
                className="ml-3 max-w-full rounded-lg border border-border bg-bg-soft p-2"
                value={
                  state.answers.find((a) => a.id === lastRecordId)?.cause ?? ""
                }
                onChange={(e) =>
                  update({
                    ...state,
                    answers: state.answers.map((a) =>
                      a.id === lastRecordId
                        ? {
                            ...a,
                            cause: (e.target.value ||
                              null) as AnswerRecord["cause"],
                          }
                        : a,
                    ),
                  })
                }
              >
                <option value="">Choose a cause</option>
                <option value="content">Concept or data reading</option>
                <option value="careless">Careless error</option>
                <option value="timing">Ran out of time</option>
                <option value="guess">Guess</option>
              </select>
            </label>
          )}
          <Button
            onClick={() => {
              if (index === initialQuestions.length - 1) {
                setDone(true);
                return;
              }
              setIndex(index + 1);
              setChosen(null);
              setRevealed(false);
              setConfidence("medium");
              setLastRecordId(null);
              timer.current = Date.now();
            }}
          >
            {" "}
            {index === initialQuestions.length - 1
              ? "Finish set"
              : "Next question"}
          </Button>
        </div>
      )}
    </Card>
  );
}
export function DrillView({ slug }: { slug: string }) {
  const subject = asSubject(
    useSearchParams().get("subject") ?? getTopic(slug)?.subject,
  );
  return <DrillSession key={slug + subject} slug={slug} subject={subject} />;
}
function DrillSession({ slug, subject }: { slug: string; subject: Subject }) {
  const { state, ready, storageError, userId } = useProgress();
  const [queue, setQueue] = useState<Question[] | null>(null);
  const [setNumber, setSetNumber] = useState(0);
  if (!ready) return <Loading />;
  if (!userId) return <AccountUnavailable error={storageError} />;
  const topic = getTopic(slug);
  const titles: Record<string, string> = {
    mixed: "Mixed diagnostic",
    hard: "Hard questions",
    misses: "Mistake review",
    weak: "Weak topics",
  };
  const title = topic?.title ?? titles[slug];
  function start() {
    const all = getAllQuestions();
    let qs = getQuestions(topic?.slug).filter((q) => q.subject === subject);
    if (slug === "misses") {
      const ids = new Set(
        getTopics(subject).flatMap(
          (t) => topicStats(state, t.slug).unresolvedIds,
        ),
      );
      qs = practiceForMisses(qs, all, ids);
    } else if (slug === "hard") {
      qs = qs.filter((q) => q.difficulty === "hard");
    } else if (slug === "weak") {
      const ranking = getTopics(subject)
        .map((t) => ({ slug: t.slug, s: topicStats(state, t.slug) }))
        .sort((a, b) => (a.s.accuracy ?? 0) - (b.s.accuracy ?? 0));
      const weak = new Set(ranking.slice(0, 3).map((t) => t.slug));
      qs = qs.filter((q) => weak.has(q.topic));
    }
    setQueue(selectPracticeSet(qs, state, subject));
    setSetNumber((n) => n + 1);
  }
  return (
    <div
      className={`mx-auto space-y-6 ${subject !== "math" && queue ? "max-w-6xl" : "max-w-5xl"}`}
    >
      <Link href={`/study/${subject}`} className="back-link">
        <Arrow back />
        Back to {SUBJECT_LABELS[subject]}
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {SUBJECT_LABELS[subject]} · Original practice · Progress saved to your
          account
        </p>
      </header>
      {queue ? (
        <PracticeSet
          key={subject + slug + setNumber}
          initialQuestions={queue}
          title={title}
          onAnotherSet={start}
        />
      ) : (
        <Card className="max-w-3xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold">
            {slug === "misses"
              ? "Turn each miss into a corrected habit."
              : "Work one question at a time."}
          </h2>
          <p className="prose-study mt-2 text-sm text-ink-soft">
            {slug === "misses"
              ? "Review missed drill questions and solve fresh questions on skills missed in timed sections or older lessons. Original section answers remain in your results."
              : `${practiceStage(
                  getQuestions(topic?.slug).filter(
                    (q) => q.subject === subject,
                  ),
                  state,
                  subject,
                )} practice for your target of ${state.profile.targetScore ?? 36}. New questions come first; difficulty adjusts to your baseline and recent independent work.`}
          </p>
          <div className="my-6 grid gap-4 border-y border-border py-5 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold">
                {topic
                  ? `12-question sets · ${getQuestions(slug).length} available`
                  : slug === "misses"
                    ? "Your missed questions"
                    : "12 focused questions"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                {topic ? topic.title : title}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">Immediate explanations</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Review the evidence after each answer
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">Confidence & timing</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Find the habits behind your misses
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={start}>
              Start set
              <Arrow />
            </Button>
            {topic && (
              <ButtonLink href={`/learn/${topic.slug}`} variant="ghost">
                Review the lesson
              </ButtonLink>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
