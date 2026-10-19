"use client";
import Link from "next/link";
import type { DailyState } from "./DailyStudy";
import {
  blockUnits,
  dailyConcepts,
  dailyReviewKey,
  dailyStep,
} from "@/lib/daily-flow";
import { Button } from "./ui/Button";
import { StudyIcon } from "./StudyIcon";
import { LessonVisual } from "./LessonVisual";
import {
  ClauseRecognitionExploration,
  GuidedExploration,
} from "./GuidedExploration";
import {
  EXPLORATION_SKILLS,
  isClauseRecognitionSection,
} from "@/lib/lesson-interaction";
import { LessonArtifact } from "./LessonArtifact";
import { learningRewards } from "@/lib/learning-rewards";
import { ScoreChecks } from "./ScoreChecks";

const label = (value: string) => value[0].toUpperCase() + value.slice(1);
const title = (value: string) => value.replace(/^\d+\.\s*/, "");
const explorationLabels: Partial<
  Record<string, { path: string; heading: string; detail: string }>
> = {
  "math-modeling-linear-models": {
    path: "Starting cost + each hour",
    heading: "Make the graph move.",
    detail: "$3 to start. $2 for every hour.",
  },
  "dependent-boundary": {
    path: "Connect two ideas",
    heading: "Make the two parts work together.",
    detail: "Attach the unfinished thought to a complete clause.",
  },
  "reading-inference-evidence-link": {
    path: "Find the evidence",
    heading: "Find the clue behind the feeling.",
    detail: "Use the words on the page to support one small inference.",
  },
  "science-experimental-design-confounds": {
    path: "Change one thing",
    heading: "Change one cause at a time.",
    detail: "Compare groups that differ in just the variable you want to test.",
  },
};
const dateLabel = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export function DailyPath({
  data,
  pending,
  error,
  onContinue,
  onFormulas,
  onNewSession,
}: {
  data: DailyState;
  pending: boolean;
  error: string | null;
  onContinue: () => void;
  onFormulas: () => void;
  onNewSession: () => void;
}) {
  const { plan, answers, lessons, formulas, coverage } = data;
  const rewards = coverage ? learningRewards(coverage.completedSessions) : null;
  const step = dailyStep(plan, answers, lessons);
  const block = "block" in step ? step.block : undefined;
  const unit = "unit" in step ? step.unit : undefined;
  const conceptIndices = unit ? dailyConcepts(unit) : [];
  const conceptIndex =
    conceptIndices.find(
      (index) => !lessons.includes(`${unit!.id}:concept:${index}`),
    ) ?? conceptIndices[0];
  const section = unit?.lesson.sections[conceptIndex];
  const previewLabel = unit?.skillId
    ? explorationLabels[unit.skillId]
    : undefined;
  const formulaPending = (formulas?.remaining.length ?? 0) > 0;
  const finished = plan.complete;
  const carryover = plan.date < data.today && !plan.complete;
  const targetScore = data.goal?.targetScore ?? plan.course?.targetScore;
  const testDate = data.goal?.testDate ?? plan.course?.testDate;
  const completeSubjects = plan.blocks.filter(
    (item) => plan.complete || lessons.includes(dailyReviewKey(item)),
  ).length;
  const answered = plan.blocks
    .flatMap((item) => [...item.questions, ...(item.historicalQuestions ?? [])])
    .filter((question) => answers[question.id] !== undefined).length;
  const actionLabel = pending
    ? "Opening your lesson…"
    : finished
      ? "Review saved answers"
      : carryover
        ? "Resume saved session"
        : data.saved
          ? "Continue lesson"
          : "Start lesson";

  return (
    <div className="daily-home">
      <header className="daily-heading">
        <div>
          <h1>Your next move.</h1>
          <p>A little progress, every day.</p>
        </div>
        {coverage && rewards && (
          <p
            className="daily-earned"
            title="100 XP per completed Daily session. Earlier sessions count."
          >
            <span className="daily-xp">
              <StudyIcon name="star" />
              {rewards.xp.toLocaleString("en-US")} XP
            </span>
            <strong>Level {rewards.level}</strong>
          </p>
        )}
      </header>

      <div className="daily-plan-bar">
        <span>
          <StudyIcon name="calendar" />
          {testDate
            ? `Test day · ${dateLabel(testDate)}`
            : "Set your test date"}
        </span>
        <span>
          <StudyIcon name="clock" />
          {data.availableMinutes ?? data.minutes} min/day
        </span>
        <Link href="/account">Edit plan</Link>
      </div>

      {data.saved &&
        !plan.complete &&
        ((data.availableMinutes ?? data.minutes) !== plan.minutes ||
          (data.includeScience === false &&
            plan.blocks.some((item) => item.subject === "science"))) && (
          <p className="daily-plan-change-note">
            Your saved session keeps its original lessons. New time and subject
            settings apply to your next session.
          </p>
        )}

      {error && (
        <p role="alert" className="daily-error">
          {error}
        </p>
      )}

      <div className="daily-path-layout">
        <section
          className="daily-path-section"
          aria-labelledby="daily-path-title"
        >
          <h2 id="daily-path-title">
            {carryover ? "Your saved path" : "Today’s path"}
          </h2>
          <p className="daily-path-caption">
            {completeSubjects} of {plan.blocks.length} subjects complete
            {carryover && ` · started ${dateLabel(plan.date)}`}
          </p>
          <ol className="daily-path-list">
            {plan.blocks.map((item) => {
              const done =
                plan.complete || lessons.includes(dailyReviewKey(item));
              const current = !done && item.subject === block?.subject;
              const units = blockUnits(item);
              const nextUnit = current && unit ? unit : units[0];
              return (
                <li
                  key={item.subject}
                  className="daily-path-stop"
                  data-subject={item.subject}
                  data-state={done ? "done" : current ? "current" : "next"}
                  aria-current={current ? "step" : undefined}
                >
                  <span className="daily-path-mark">
                    <StudyIcon name={done ? "check" : item.subject} size={32} />
                  </span>
                  <div className="daily-path-copy">
                    <p className="daily-path-subject">{label(item.subject)}</p>
                    <h3>
                      {(nextUnit.skillId &&
                        explorationLabels[nextUnit.skillId]?.path) ||
                        title(nextUnit.title)}
                    </h3>
                    <p>
                      {done
                        ? "Done"
                        : `~${Math.ceil(item.estimatedMinutes ?? item.minutes)} min${units.length > 1 ? ` · ${units.length} lessons` : ""}${current ? " · Up next" : ""}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {formulas && (
            <div className="daily-formula-stop" data-done={!formulaPending}>
              <StudyIcon name={formulaPending ? "formula" : "check"} />
              <div>
                <h3>Math formula recall · optional</h3>
                <p>
                  {formulas.ids.length - formulas.remaining.length}/
                  {formulas.ids.length} recalled today
                  {formulaPending
                    ? ` · ~${formulas.minutes} min extra`
                    : " · Done"}
                </p>
              </div>
              {formulaPending && (
                <button type="button" onClick={onFormulas} disabled={pending}>
                  Review<span className="sr-only"> formulas</span>
                </button>
              )}
            </div>
          )}
          {plan.blocks.length < (data.includeScience === false ? 3 : 4) && (
            <p className="daily-path-caption">
              Your other subjects return in upcoming sessions.{" "}
              <Link href="/learn">Explore the course</Link>
            </p>
          )}
        </section>

        <section
          className="daily-next-card"
          data-subject={block?.subject ?? "math"}
          aria-labelledby="daily-next-title"
        >
          <p className="daily-next-label">
            {plan.complete
              ? "Today’s progress"
              : `${label(block?.subject ?? "english")} · ${step.kind === "drill" ? "Practice" : step.kind === "review" ? "Recap" : data.saved ? "Continue lesson" : "Your next lesson"}`}
          </p>
          <h2 id="daily-next-title">
            {finished
              ? "A good day of learning."
              : unit
                ? (previewLabel?.heading ?? title(unit.title))
                : `${label(block?.subject ?? "daily")} recap`}
          </h2>
          {(previewLabel ||
            finished ||
            !section ||
            !unit ||
            title(section.heading) !== title(unit.title)) && (
            <p className="daily-next-description">
              {finished
                ? `${answered} saved answers. Your next path arrives tomorrow.`
                : previewLabel
                  ? previewLabel.detail
                  : section
                    ? section.heading
                    : "See what clicked, review the tricky parts, then keep moving."}
            </p>
          )}
          <div className="daily-next-preview">
            {finished ? (
              <div className="daily-complete-preview">
                <StudyIcon name="check" size={64} />
                <p>Today’s path is complete.</p>
              </div>
            ) : unit &&
              isClauseRecognitionSection(
                unit.topic,
                unit.sectionIndices?.[conceptIndex] ?? conceptIndex,
              ) ? (
              <ClauseRecognitionExploration key={unit.id} compact />
            ) : unit?.skillId &&
              EXPLORATION_SKILLS.some((skillId) => skillId === unit.skillId) ? (
              <GuidedExploration key={unit.id} skillId={unit.skillId} compact />
            ) : section?.activity ? (
              <LessonVisual
                key={`${unit!.id}:${conceptIndex}`}
                activity={section.activity}
              />
            ) : section && unit ? (
              <LessonArtifact
                section={section}
                subject={block!.subject}
                topic={unit.topic}
                skillId={unit.skillId}
                sourceIndex={
                  unit.sectionIndices?.[conceptIndex] ?? conceptIndex
                }
              />
            ) : (
              <div className="daily-method-preview">
                <StudyIcon name={block?.subject ?? "book"} size={48} />
                <p>Review your saved answers and the reasoning behind them.</p>
              </div>
            )}
          </div>
          <Button
            onClick={onContinue}
            disabled={pending}
            className="daily-next-action"
          >
            {actionLabel}
            <StudyIcon name="arrow" />
          </Button>
          <p className="daily-saved-note">
            {data.saved
              ? "Your place is saved."
              : "Go at your pace. Your progress saves as you learn."}
          </p>
        </section>
      </div>

      <div className="daily-progress-note">
        <StudyIcon name="check" />
        <p>
          Completed lessons stay complete.
          {coverage
            ? ` ${coverage.completedSessions} sessions completed · ${coverage.covered}/${coverage.total} focused skills covered.`
            : ""}
        </p>
        <Link href="/progress">See progress</Link>
      </div>

      <div className="daily-history-actions">
        {carryover && (
          <details>
            <summary>Choose new lessons instead</summary>
            <p>
              Your saved answers stay in history. Unfinished lessons return
              later.
            </p>
            <Button variant="ghost" onClick={onNewSession} disabled={pending}>
              Start today’s lesson
            </Button>
          </details>
        )}
        {coverage && (
          <p className="daily-coverage-note">
            {coverage.onTrack && coverage.finishDate
              ? `First pass planned by ${dateLabel(coverage.finishDate)}. Time estimates are a guide.`
              : coverage.requiredMinutes
                ? `About ${coverage.requiredMinutes} min/day would fit the first pass before ${dateLabel(coverage.testDate)}.`
                : `All remaining lessons may not fit before ${dateLabel(coverage.testDate)}. Your plan prioritizes focused practice.`}
          </p>
        )}
        {formulas && (
          <p className="daily-coverage-note">
            {formulas.recalled}/{formulas.total} formulas recalled on two days.
            {formulas.daysLeft < 2 && formulas.recalled < formulas.total
              ? " Keep reviewing; fewer than two study days remain."
              : " Keep recalling them across days."}
          </p>
        )}
        {targetScore && (
          <ScoreChecks
            ownerId={data.userId}
            targetScore={targetScore}
            today={data.today}
            includeScience={data.includeScience !== false}
          />
        )}
      </div>
    </div>
  );
}
