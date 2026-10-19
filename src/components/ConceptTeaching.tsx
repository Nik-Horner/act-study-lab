"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import type { Lesson } from "@/lib/act/types";
import type { AccountSubject } from "@/lib/account-settings";
import {
  teachingStages,
  isClauseRecognitionSection,
  EXPLORATION_SKILLS,
} from "@/lib/lesson-interaction";
import {
  ClauseRecognitionExploration,
  GuidedExploration,
} from "./GuidedExploration";
import { LessonArtifact } from "./LessonArtifact";
import { LessonExample } from "./LessonExample";
import { LessonActivity } from "./LessonActivity";
import { MathText } from "./MathText";
import { StudyIcon } from "./StudyIcon";
import { difficultyLabels } from "@/lib/daily-difficulty";
import { Button } from "./ui/Button";

const labels = { method: "Learn", example: "Explore", check: "Practice" };
const sceneTitles: Record<string, string> = {
  "math-modeling-linear-models": "Build the cost, one hour at a time.",
  "dependent-boundary": "Make the two parts work together.",
  "reading-inference-evidence-link": "Find the clue behind the feeling.",
  "science-experimental-design-confounds": "Change one cause at a time.",
};

/** The approved lesson canvas, shared by every course and Daily concept. */
export function ConceptTeaching({
  section,
  subject,
  topic,
  skillId,
  sourceIndex,
  position,
  total,
  title,
  difficulty,
  prerequisite = false,
  pending = false,
  previouslyChecked = false,
  onPrevious,
  onContinue,
  nextLabel,
  children,
}: {
  section: Lesson["sections"][number];
  subject: AccountSubject;
  topic: string;
  skillId?: string;
  sourceIndex: number;
  position: number;
  total: number;
  title: string;
  difficulty?: "easy" | "medium" | "hard";
  prerequisite?: boolean;
  pending?: boolean;
  previouslyChecked?: boolean;
  onPrevious?: () => void;
  onContinue: () => void;
  nextLabel: string;
  children?: ReactNode;
}) {
  const coachId = useId();
  const stages = teachingStages(section);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [checked, setChecked] = useState(previouslyChecked);
  const [idea, setIdea] = useState(0);
  const [interactive, setInteractive] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep server-rendered controls disabled until the client can handle input
    setInteractive(true);
  }, []);
  const stage = stages[step];
  const last = step === stages.length - 1;
  const blocked = stage === "check" && !checked;
  const method = section.body.filter((text) => text.trim());
  const compactRefresher =
    difficulty !== undefined &&
    difficulty !== "easy" &&
    !section.activity &&
    !section.evidence?.length &&
    !section.examples?.length &&
    !section.workedCases?.length;
  const clauseScene =
    !compactRefresher && isClauseRecognitionSection(topic, sourceIndex);
  const hasScene =
    clauseScene ||
    (!!section.activity && EXPLORATION_SKILLS.some((id) => id === skillId));
  const examples = [
    ...(section.examples ?? []),
    ...(section.workedCases ?? []),
  ];
  const ideaCount =
    stage === "method"
      ? compactRefresher
        ? 1
        : Math.max(1, method.length + (hasScene ? 1 : 0))
      : stage === "example"
        ? Math.max(1, examples.length)
        : 1;
  const moreIdeas = idea < ideaCount - 1;
  const example = stage === "example" ? examples[idea] : examples[0];
  const sceneTitle = clauseScene
    ? "Make a complete thought."
    : section.activity && skillId && sceneTitles[skillId]
      ? sceneTitles[skillId]
      : title.replace(/^\d+\.\s*/, "");
  const subtitle =
    skillId === "math-modeling-linear-models"
      ? "$3 to start. Add $2 for every hour."
      : section.heading.replace(/[.!?]$/, "") !==
          sceneTitle.replace(/[.!?]$/, "")
        ? section.heading
        : undefined;
  function move(next: number) {
    setStep(next);
    setIdea(0);
    setFurthest(Math.max(next, furthest));
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  return (
    <section
      className="lesson-player"
      data-subject={subject}
      data-difficulty={difficulty}
      aria-busy={!interactive}
    >
      <header className="lesson-player-heading">
        <h1>{prerequisite ? title : sceneTitle}</h1>
        <div>
          {(subtitle || prerequisite || compactRefresher) && (
            <p>
              {(prerequisite || compactRefresher) &&
                "Prerequisite refresher · "}
              {subtitle}
            </p>
          )}
          <span className="lesson-position">
            Concept {position + 1} of {total}
          </span>
          {difficulty && (
            <span className="lesson-difficulty">
              {difficultyLabels[difficulty]} difficulty
            </span>
          )}
        </div>
      </header>
      <fieldset
        className="lesson-player-stage"
        key={stage}
        disabled={!interactive || pending}
      >
        {stage === "check" && section.activity ? (
          <LessonActivity
            activity={section.activity}
            onComplete={() => setChecked(true)}
          />
        ) : compactRefresher ? (
          <aside
            className="lesson-coach"
            aria-label="Quick prerequisite refresh"
          >
            <h2>Quick rule refresh.</h2>
            <p className="lesson-coach-position">{section.heading}</p>
            <div className="lesson-coach-copy space-y-3">
              {method.map((text, index) => (
                <p key={index}>
                  <MathText>{text}</MathText>
                </p>
              ))}
              {section.tip && (
                <p>
                  <MathText>{section.tip}</MathText>
                </p>
              )}
            </div>
          </aside>
        ) : stage === "method" && hasScene && idea === 0 ? (
          clauseScene ? (
            <ClauseRecognitionExploration />
          ) : (
            <GuidedExploration skillId={skillId} />
          )
        ) : (
          <div className="lesson-scene">
            <a className="lesson-skip-source" href={`#${coachId}`}>
              Skip marking and read the explanation
            </a>
            <div className="lesson-canvas">
              <LessonArtifact
                section={section}
                subject={subject}
                topic={topic}
                skillId={skillId}
                sourceIndex={sourceIndex}
                example={example}
                exploring={stage === "example"}
              />
            </div>
            <aside
              className="lesson-coach"
              id={coachId}
              tabIndex={-1}
              aria-label={
                stage === "method" ? "Learn the method" : "Worked example"
              }
            >
              <h2>
                {stage === "method"
                  ? "One idea at a time."
                  : "Watch the idea work."}
              </h2>
              <p className="lesson-coach-position">
                {stage === "method" ? "Idea" : "Example"} {idea + 1} of{" "}
                {ideaCount}
              </p>
              {stage === "method" ? (
                <div className="lesson-coach-copy">
                  <MathText>
                    {method[idea - (hasScene ? 1 : 0)] ??
                      section.tip ??
                      "Study the evidence, then follow the worked example."}
                  </MathText>
                </div>
              ) : (
                example && (
                  <LessonExample
                    example={{ ...example, evidence: undefined }}
                    classify={false}
                    stepwise={subject === "math" || difficulty === "easy"}
                  />
                )
              )}
              {section.tip && (
                <div className="lesson-watch-for">
                  <StudyIcon name="book" size={20} />
                  <p>
                    <MathText>{section.tip}</MathText>
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}
        {last && children}
      </fieldset>
      {stage === "check" && (
        <details className="lesson-help">
          <summary>Review the method and worked example</summary>
          <div className="lesson-help-content">
            {section.body.map((text, index) => (
              <p key={index}>
                <MathText>{text}</MathText>
              </p>
            ))}
            {examples.map((item, index) => (
              <LessonExample
                key={index}
                example={item}
                classify={false}
                stepwise={subject === "math" || difficulty === "easy"}
              />
            ))}
          </div>
        </details>
      )}
      <footer className="lesson-player-footer">
        <nav className="teaching-sequence" aria-label="Learning sequence">
          {stages.map((item, index) => (
            <button
              key={item}
              type="button"
              aria-current={stage === item ? "step" : undefined}
              disabled={!interactive || index > furthest || pending}
              onClick={() => move(index)}
            >
              <span>{labels[item]}</span>
              {index < step || (item === "check" && checked) ? (
                <StudyIcon name="check" size={18} />
              ) : (
                <i aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>
        <div className="lesson-player-actions">
          <Button
            variant="ghost"
            disabled={
              !interactive ||
              pending ||
              (step === 0 && idea === 0 && !onPrevious)
            }
            onClick={() => {
              if (idea > 0) setIdea(idea - 1);
              else if (step > 0) move(step - 1);
              else onPrevious?.();
            }}
          >
            Back
          </Button>
          <Button
            disabled={!interactive || pending || blocked}
            onClick={() => {
              if (moreIdeas) {
                setIdea(idea + 1);
                return;
              }
              if (last) onContinue();
              else move(step + 1);
            }}
          >
            {pending
              ? "Saving…"
              : moreIdeas
                ? stage === "method"
                  ? "Next idea"
                  : "Next example"
                : last
                  ? nextLabel
                  : `Continue to ${labels[stages[step + 1]].toLowerCase()}`}
            <StudyIcon name="arrow" size={20} />
          </Button>
        </div>
      </footer>
      {blocked && (
        <p className="lesson-player-save-note" role="status">
          Try the question to continue. A miss opens a smaller, supported step.
        </p>
      )}
      {!blocked && (
        <p className="lesson-player-save-note">
          {stage === "check"
            ? "Guided work is unscored. Fresh independent questions come next."
            : "Take the time you need. Completed Daily concepts save to the account."}
        </p>
      )}
    </section>
  );
}
