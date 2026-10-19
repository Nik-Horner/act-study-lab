"use client";

import { useId, useState } from "react";
import { StudyIcon } from "./StudyIcon";
import { Button } from "./ui/Button";
import { MathText } from "./MathText";
import { LessonVisual } from "./LessonVisual";
import { explanationSteps } from "@/lib/answer-explanation";
import {
  chooseActivityAnswer,
  type ActivityState,
  type LessonActivityContent,
} from "@/lib/lesson-interaction";

export function LessonActivity({
  activity,
  onComplete,
  initialWrongChoice,
}: {
  activity: LessonActivityContent;
  onComplete?: () => void;
  initialWrongChoice?: number;
}) {
  const initialMiss =
    initialWrongChoice !== undefined &&
    Number.isInteger(initialWrongChoice) &&
    initialWrongChoice !== activity.answer &&
    initialWrongChoice >= 0 &&
    initialWrongChoice < activity.choices.length;
  const [state, setState] = useState<ActivityState>({
    phase: initialMiss ? "explain" : "try",
    choice: initialMiss ? initialWrongChoice! : null,
    recovering: initialMiss,
  });
  const [missedChoice, setMissedChoice] = useState<number | null>(
    initialMiss ? initialWrongChoice! : null,
  );
  const feedbackId = useId();
  const supported = state.phase === "step";
  const answered = state.choice !== null;
  const choices = activity.choices
    .map((text, index) => ({ text, index }))
    .filter(
      ({ index }) =>
        !supported || index === activity.answer || index === missedChoice,
    );
  const hasEvidence = !!(
    activity.evidence ||
    activity.evidenceText ||
    activity.diagram
  );
  const steps = explanationSteps(activity.explanation);

  function choose(index: number) {
    const next = chooseActivityAnswer(state, index, activity.answer);
    setState(next);
    if (next.phase === "explain") setMissedChoice(index);
    if (next.phase === "ready") onComplete?.();
  }

  return (
    <div className="lesson-workspace lesson-lab" data-phase={state.phase}>
      <div className="lesson-workspace-teaching lesson-lab-evidence">
        <LessonVisual activity={activity} />
        {state.recovering && (
          <section className="lesson-reasoning" aria-label="Worked reasoning">
            <h3>Follow the idea.</h3>
            <ol>
              {steps.map((step, index) => (
                <li key={index}>
                  <span className="lesson-step-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <MathText>{step}</MathText>
                </li>
              ))}
            </ol>
            <div className="lesson-reasoning-result">
              <span>That leads to</span>
              <strong>
                <MathText>{activity.choices[activity.answer]}</MathText>
              </strong>
            </div>
          </section>
        )}
      </div>
      <div className="lesson-workspace-practice lesson-lab-task">
        <h3 className="lesson-task-title">
          {state.phase === "explain" ? (
            "Let’s build it together."
          ) : supported ? (
            "First, a smaller step."
          ) : state.phase === "ready" ? (
            "Challenge cleared."
          ) : hasEvidence ? (
            <MathText>{activity.prompt}</MathText>
          ) : (
            "What do you think?"
          )}
        </h3>
        {(state.phase === "explain" || supported) && (
          <p className="lesson-task-intro">
            {supported
              ? "Use the worked reasoning. Which of these two answers follows?"
              : "Compare your choice with the worked steps, then try a smaller choice."}
          </p>
        )}
        {state.phase !== "ready" && state.phase !== "explain" && (
          <div
            role="group"
            aria-label={
              supported ? "Supported answer choices" : "Answer choices"
            }
            className="lesson-activity-choices"
          >
            {choices.map(({ text, index }, position) => (
              <button
                type="button"
                key={index}
                className="choice"
                aria-pressed={state.choice === index}
                aria-describedby={answered ? feedbackId : undefined}
                data-selected={state.choice === index}
                data-wrong={state.choice === index && index !== activity.answer}
                disabled={state.phase === "step" && state.choice === index}
                onClick={() => choose(index)}
              >
                <span className="lesson-choice-letter">
                  {String.fromCharCode(65 + position)}
                </span>
                <span>
                  <MathText>{text}</MathText>
                </span>
              </button>
            ))}
          </div>
        )}
        {state.phase === "explain" && (
          <div className="lesson-recovery">
            <p className="lesson-recovery-choice">
              <span>Your choice</span>
              <MathText>{activity.choices[state.choice!]}</MathText>
            </p>
            <Button
              onClick={() =>
                setState({ ...state, phase: "step", choice: null })
              }
            >
              Try the smaller step
            </Button>
          </div>
        )}
        {supported && answered && (
          <p id={feedbackId} role="status" className="lesson-feedback">
            Look at the last worked step. Choose the result it supports.
          </p>
        )}
        {state.phase === "ready" && (
          <div
            id={feedbackId}
            role="status"
            className="answer-feedback lesson-feedback lesson-feedback-success"
            data-correct="true"
          >
            <div className="answer-feedback-title">
              <StudyIcon
                name="check"
                className="answer-success-mark"
                size={22}
              />
              <strong>
                <MathText>{activity.choices[activity.answer]}</MathText>
              </strong>
            </div>
            {!state.recovering && (
              <p>
                <MathText>{activity.explanation}</MathText>
              </p>
            )}
            <p>
              {state.recovering
                ? "You rebuilt the answer. Continue to apply the method independently."
                : "Continue when you’re ready to use this idea."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
