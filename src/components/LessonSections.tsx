"use client";
import { PassageView } from "./act/QuestionView";
import { useState } from "react";
import { LessonExample } from "./LessonExample";
import type { Lesson } from "@/lib/act/types";
import { Button } from "./ui/Button";
import { LessonActivity } from "./LessonActivity";
import { MathText } from "./MathText";
/** Teach the complete method before its practice activity. */
export function LessonSections({
  sections,
  idPrefix = "lesson-section",
  hideHeading = false,
  onPracticeComplete,
  showActivity = true,
}: {
  sections: Lesson["sections"];
  idPrefix?: string;
  hideHeading?: boolean;
  onPracticeComplete?: () => void;
  showActivity?: boolean;
}) {
  return (
    <div className="space-y-8">
      {sections.map((section, i) => (
        <LessonSection
          key={`${idPrefix}-${section.heading}`}
          section={section}
          hideHeading={hideHeading}
          id={`${idPrefix}-${i}`}
          onPracticeComplete={onPracticeComplete}
          showActivity={showActivity}
        />
      ))}
    </div>
  );
}
function LessonSection({
  section,
  id,
  hideHeading,
  onPracticeComplete,
  showActivity,
}: {
  section: Lesson["sections"][number];
  id: string;
  hideHeading: boolean;
  onPracticeComplete?: () => void;
  showActivity: boolean;
}) {
  const [recalling, setRecalling] = useState(false);
  const [note, setNote] = useState("");
  return (
    <section id={id} className="scroll-mt-8 space-y-3">
      {!hideHeading && (
        <h2 className="text-lg font-semibold text-ink">{section.heading}</h2>
      )}
      <div className="lesson-original space-y-4">
        {recalling ? (
          <div className="rounded-xl border border-brand-soft bg-bg-soft p-5">
            <label htmlFor={`${id}-recall`} className="block font-semibold">
              Explain the rule in your own words
            </label>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              For “{section.heading},” what would you check first, and what
              mistake would you avoid? Say it aloud or jot down your approach,
              then compare with the lesson.
            </p>
            <textarea
              id={`${id}-recall`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="My approach…"
              className="mt-4 w-full rounded-lg border border-border bg-bg p-3 text-sm"
            />
            <p className="mt-2 text-xs text-ink-soft">
              Optional scratch notes stay on this screen. Your scored answers
              save in the quick check and drill.
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-4"
              onClick={() => setRecalling(false)}
            >
              Compare with the lesson
            </Button>
          </div>
        ) : (
          <>
            {!!section.evidence?.length && (
              <div className="space-y-3">
                {section.body.map((p, j) => (
                  <p key={j} className="leading-relaxed text-ink">
                    <MathText>{p}</MathText>
                  </p>
                ))}
              </div>
            )}
            <div
              className="lesson-method-grid"
              data-evidence={!!section.evidence?.length}
            >
              <div className="lesson-method-text">
                {section.evidence?.length
                  ? section.evidence.map((passage) => (
                      <PassageView key={passage.id} passage={passage} />
                    ))
                  : section.body.map((p, j) => (
                      <p key={j} className="leading-relaxed text-ink">
                        <MathText>{p}</MathText>
                      </p>
                    ))}
              </div>
              <div className="lesson-method-examples">
                {section.examples?.map((ex, j) => (
                  <LessonExample
                    key={j}
                    example={ex}
                    classify={
                      /^(Clauses and phrases|Sentence fragments)$/.test(
                        section.heading,
                      ) && !!section.examples?.some((item) => !item.good)
                    }
                  />
                ))}
                {section.tip && (
                  <p className="rounded-xl border border-brand-soft bg-brand-soft px-4 py-3 text-sm leading-relaxed text-brand-dark">
                    <strong>Tip · </strong>
                    <MathText>{section.tip}</MathText>
                  </p>
                )}
              </div>
            </div>
            {showActivity && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRecalling(true)}
              >
                Try from memory
              </Button>
            )}
            {note && (
              <p className="rounded-lg border border-border p-3 text-sm leading-relaxed">
                <strong>Your approach · </strong>
                {note}
              </p>
            )}
          </>
        )}
      </div>
      {showActivity && section.activity && (
        <div className="pt-5">
          <h3 className="mb-4 text-lg font-semibold">Apply the method</h3>
          <LessonActivity
            activity={section.activity}
            onComplete={onPracticeComplete}
          />
        </div>
      )}
    </section>
  );
}
