"use client";
import { useId, useState } from "react";
import type { Lesson } from "@/lib/act/types";
import { PassageView } from "./act/QuestionView";
import { MathDiagram } from "./act/MathDiagram";
import { Button } from "./ui/Button";
import { MathText } from "./MathText";

type Activity = NonNullable<Lesson["sections"][number]["activity"]>;
export function LessonActivity({
  activity,
  onComplete,
}: {
  activity: Activity;
  onComplete?: () => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const feedbackId = useId();
  const correct = choice === activity.answer;
  return (
    <div className="lesson-lab">
      {(activity.evidence || activity.evidenceText || activity.diagram) && (
        <div className="lesson-lab-evidence">
          {activity.evidence && <PassageView passage={activity.evidence} />}
          {activity.evidenceText && (
            <blockquote className="text-xl leading-relaxed text-ink">
              <MathText>{activity.evidenceText}</MathText>
            </blockquote>
          )}
          {activity.diagram === "unit-circle" ? (
            <UnitCircle />
          ) : (
            activity.diagram && <MathDiagram id={activity.diagram} />
          )}
        </div>
      )}
      <div className="lesson-lab-task">
        <h3 className="text-xl font-semibold leading-snug sm:text-2xl">
          <MathText>{activity.prompt}</MathText>
        </h3>
        <div
          role="group"
          aria-label="Answer choices"
          className="mt-6 space-y-3"
        >
          {activity.choices.map((text, i) => (
            <button
              key={text}
              className="choice"
              aria-pressed={choice === i}
              aria-describedby={choice !== null ? feedbackId : undefined}
              data-selected={choice === i}
              data-correct={choice !== null && i === activity.answer}
              data-wrong={choice === i && !correct}
              disabled={choice !== null}
              onClick={() => {
                setChoice(i);
                onComplete?.();
              }}
            >
              <span className="lesson-choice-letter">
                {String.fromCharCode(65 + i)}
              </span>
              <span>
                <MathText>{text}</MathText>
                {choice !== null && i === activity.answer && (
                  <strong className="block text-sm">Correct answer</strong>
                )}
                {choice === i && !correct && (
                  <span className="block text-sm">Your answer</span>
                )}
              </span>
            </button>
          ))}
        </div>
        {choice !== null && (
          <div
            id={feedbackId}
            role="status"
            className="mt-6 border-t border-border pt-5"
          >
            <h4
              className={`text-lg font-semibold ${correct ? "text-good" : "text-bad"}`}
            >
              {correct ? "You’ve got the idea" : "Here’s the missing step"}
            </h4>
            <p className="mt-3 text-base leading-relaxed">
              <MathText>{activity.explanation}</MathText>
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4"
              onClick={() => setChoice(null)}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
function UnitCircle() {
  const [angle, setAngle] = useState(150);
  const radians = (angle * Math.PI) / 180;
  const x = 150 + 100 * Math.cos(radians),
    y = 140 - 100 * Math.sin(radians);
  return (
    <div>
      <svg
        viewBox="0 0 300 280"
        className="w-full"
        role="img"
        aria-label={`Unit circle at ${angle} degrees. Cosine, the horizontal coordinate, is ${Math.cos(radians) > 0 ? "positive" : "negative"}. Sine, the vertical coordinate, is ${Math.sin(radians) > 0 ? "positive" : "negative"}.`}
      >
        <circle
          cx="150"
          cy="140"
          r="100"
          fill="none"
          stroke="var(--color-ink-soft)"
          strokeWidth="2"
        />
        <path
          d="M20 140H280M150 10V270"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d={`M150 140L${x} ${y}L${x} 140Z`}
          fill="var(--color-brand-soft)"
          stroke="var(--color-brand)"
          strokeWidth="2"
        />
        <circle cx={x} cy={y} r="6" fill="var(--color-brand)" />
        <text x="267" y="161" fontSize="14" fill="currentColor">
          cos θ
        </text>
        <text x="160" y="20" fontSize="14" fill="currentColor">
          sin θ
        </text>
        <text x="160" y="130" fontSize="16" fill="currentColor">
          {angle}°
        </text>
      </svg>
      <div
        className="flex flex-wrap justify-center gap-2"
        role="group"
        aria-label="Explore unit-circle quadrants"
      >
        {[30, 150, 210, 330].map((value) => (
          <Button
            key={value}
            size="sm"
            variant="ghost"
            aria-pressed={angle === value}
            onClick={() => setAngle(value)}
          >
            {value}°
          </Button>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Move the angle. Watch the signs of the horizontal and vertical
        coordinates.
      </p>
    </div>
  );
}
