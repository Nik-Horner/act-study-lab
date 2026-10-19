"use client";
import { DesmosPanel } from "./DesmosPanel";
import { QuestionPacing } from "../QuestionPacing";
import { TopicReference } from "../TopicReference";
import { SessionIntro } from "../SessionIntro";
import { StudyWorkspace } from "../StudyWorkspace";
import { PracticeRecovery } from "../PracticeRecovery";
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
  recordAnswer,
  type StudyState,
  type AnswerRecord,
  retryPending,
} from "@/lib/act/progress";
import { selectPracticeSet } from "@/lib/act/practice-queue";
import { practiceForMisses } from "@/lib/act/question-method";
import { getLearningSkill, getLearningSkills } from "@/lib/learning-skills";
import { SkillCatalog } from "../SkillCatalog";
import { SkillLesson } from "../SkillLesson";
import { seenPassages } from "@/lib/act/question-exposure";
import { Card } from "../ui/Card";
import { Button, ButtonLink } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { SubjectOverview } from "../SubjectOverview";
import { StudyPageHeader } from "../StudyPageHeader";
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
  const { state, ready, storageError, userId } = useProgress();
  const searchSubject = useSearchParams().get("subject");
  const subject = asSubject(subjectOverride ?? searchSubject ?? undefined);
  if (!ready) return <Loading />;
  if (!userId) return <AccountUnavailable error={storageError} />;
  const topics = getTopics(subject).map((topic) => {
    const stats = topicStats(state, topic.slug);
    return {
      ...topic,
      attempts: stats.practiced,
      accuracy: stats.accuracy,
      milestone: stats.mastered,
    };
  });
  return (
    <>
      <StorageNotice error={storageError} />
      <SubjectOverview
        subject={subject}
        topics={topics}
        skillCount={getLearningSkills(undefined, subject).length}
        questions={
          getQuestions().filter((question) => question.subject === subject)
            .length
        }
      />
    </>
  );
}
export function LessonView({
  slug,
  skillId,
  reference = false,
}: {
  slug: string;
  skillId?: string;
  reference?: boolean;
}) {
  const topic = getTopic(slug)!;
  const full = getLesson(slug);
  const skills = getLearningSkills(slug);
  const skill = skillId && getLearningSkill(slug, skillId);
  if (skill) return <SkillLesson skill={skill} full={full} />;
  if (skills.length && !reference)
    return (
      <div className="course-workspace" data-subject={topic.subject}>
        <StudyPageHeader
          title={full.title}
          subject={topic.subject}
          description="Choose a focused method. Each skill uses the same sequence: understand, worked example, guided check, and independent practice."
          back={{
            href: `/learn?subject=${topic.subject}`,
            label: `${SUBJECT_LABELS[topic.subject]} course`,
          }}
        />
        <SkillCatalog skills={skills} />
        <ButtonLink variant="ghost" href={`/learn/${slug}?reference=1`}>
          Read the complete topic reference
        </ButtonLink>
      </div>
    );
  const lesson = {
    ...full,
    sections: full.sections.filter((section) => !section.skillId),
  };
  return (
    <TopicReference subject={topic.subject} lesson={lesson}>
      <PracticeSet
        key={slug}
        initialQuestions={lesson.check}
        title="Lesson check"
      />
    </TopicReference>
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
    <StudyWorkspace
      subject={q.subject}
      mode="practice"
      title={title}
      current={index + 1}
      total={initialQuestions.length}
      tools={
        <>
          <Badge tone="neutral">{q.difficulty}</Badge>
          <span>
            {correct} correct · {sessionRecords.length} answered
          </span>
        </>
      }
    >
      <StorageNotice error={storageError} />
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
      {q.subject === "reading" && q.passage && (
        <p className="text-sm text-ink-soft">
          {seenPassages(
            state.answers
              .filter(
                (answer) =>
                  !sessionRecords.some((record) => record.id === answer.id),
              )
              .map((answer) => answer.questionId),
          ).has(q.passage.id)
            ? "Familiar passage · another question on a text you have practiced."
            : "New passage for your practice history."}
        </p>
      )}
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
      {revealed && chosen !== q.answer && (
        <PracticeRecovery
          key={`${q.id}-recovery`}
          topic={q.topic}
          questionId={q.id}
        />
      )}
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
    </StudyWorkspace>
  );
}
export function DrillView({ slug }: { slug: string }) {
  const skillId = useSearchParams().get("skill") ?? undefined;
  const subject = asSubject(
    useSearchParams().get("subject") ?? getTopic(slug)?.subject,
  );
  return (
    <DrillSession
      key={slug + subject + (skillId ?? "")}
      slug={slug}
      subject={subject}
      skillId={skillId}
    />
  );
}
function DrillSession({
  slug,
  subject,
  skillId,
}: {
  slug: string;
  subject: Subject;
  skillId?: string;
}) {
  const { state, ready, storageError, userId } = useProgress();
  const [queue, setQueue] = useState<Question[] | null>(null);
  const [setNumber, setSetNumber] = useState(0);
  if (!ready) return <Loading />;
  if (!userId) return <AccountUnavailable error={storageError} />;
  const topic = getTopic(slug);
  const skill = skillId && getLearningSkill(slug, skillId);
  if (topic && !skill && getLearningSkills(slug).length)
    return (
      <div className="mx-auto max-w-5xl space-y-7">
        <StudyPageHeader
          title={`${topic.title} practice`}
          subject={subject}
          description="Choose the method to practice. Each set links back to the same focused lesson and worked examples."
          back={{
            href: `/study/${subject}`,
            label: `${SUBJECT_LABELS[subject]} study`,
          }}
        />
        <SkillCatalog skills={getLearningSkills(slug)} drill />
      </div>
    );
  const titles: Record<string, string> = {
    mixed: "Mixed diagnostic",
    hard: "Hard questions",
    misses: "Mistake review",
    weak: "Weak topics",
  };
  const title = skill ? skill.title : (topic?.title ?? titles[slug]);
  function start() {
    const all = getAllQuestions();
    let qs = getQuestions(topic?.slug).filter((q) => q.subject === subject);
    if (skill) qs = qs.filter((q) => q.skillId === skill.id);
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
      <StudyPageHeader
        title={queue ? "Independent practice" : title}
        subject={subject}
        description="Independent questions with saved answers, evidence, and method review after each response."
        back={{
          href: `/study/${subject}`,
          label: `${SUBJECT_LABELS[subject]} study`,
        }}
      />
      {queue ? (
        <PracticeSet
          key={subject + slug + setNumber}
          initialQuestions={queue}
          title={title}
          onAnotherSet={start}
        />
      ) : (
        <SessionIntro
          subject={subject}
          title={
            slug === "misses"
              ? "Repair a missed method"
              : "Apply the method independently"
          }
          description={
            slug === "misses"
              ? "Review saved misses, check the reasoning, and use fresh matched questions where the bank allows."
              : skill
                ? "The example and guided check stay in the lesson. This set uses separate questions so the method has to transfer."
                : "Work across this subject with unseen questions first. Starting difficulty follows saved scores and independent practice."
          }
          questions={
            topic
              ? `Up to 12 · ${skill ? skill.questionIds.length : getQuestions(slug).length} available`
              : "Up to 12 focused questions"
          }
          timing="At your pace · feedback after each answer"
        >
          <Button onClick={start}>
            Start set <Arrow />
          </Button>
          {topic && (
            <ButtonLink
              href={`/learn/${topic.slug}${skill ? `?skill=${encodeURIComponent(skill.id)}` : ""}`}
              variant="ghost"
            >
              Review the lesson
            </ButtonLink>
          )}
        </SessionIntro>
      )}
    </div>
  );
}
