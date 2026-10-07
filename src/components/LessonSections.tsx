"use client";
import { PassageView } from "./act/QuestionView";
import { useState } from "react";
import { LessonExample } from "./LessonExample";
import type { Lesson } from "@/lib/act/types";
import { Button } from "./ui/Button";
/** Keep every original rule and example; add prediction and retrieval practice. */
export function LessonSections({
  sections,
  idPrefix = "lesson-section",
  hideHeading = false,
}: {
  sections: Lesson["sections"];
  idPrefix?: string;
  hideHeading?: boolean;
}) {
  return (
    <div className="space-y-8">
      {sections.map((section, i) => (
        <LessonSection
          key={`${idPrefix}-${section.heading}`}
          section={section}
          hideHeading={hideHeading}
          id={`${idPrefix}-${i}`}
        />
      ))}
    </div>
  );
}
function LessonSection({
  section,
  id,
  hideHeading,
}: {
  section: Lesson["sections"][number];
  id: string;
  hideHeading: boolean;
}) {
  const [recalling, setRecalling] = useState(false);
  const [note, setNote] = useState("");
  return (
    <section id={id} className="scroll-mt-8 space-y-3">
      {!hideHeading && (
        <h2 className="text-lg font-semibold text-ink">{section.heading}</h2>
      )}
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
            Optional scratch notes stay on this screen. Your scored answers save
            in the quick check and drill.
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
          {section.evidence?.map((passage) => (
            <div
              key={passage.id}
              className="rounded-xl border border-border bg-bg-soft p-4"
            >
              <PassageView passage={passage} />
            </div>
          ))}
          {section.body.map((p, j) => (
            <p key={j} className="max-w-prose leading-relaxed text-ink-soft">
              {p}
            </p>
          ))}
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
              {section.tip}
            </p>
          )}
          <Button size="sm" variant="ghost" onClick={() => setRecalling(true)}>
            Try from memory
          </Button>
          {note && (
            <p className="rounded-lg border border-border p-3 text-sm leading-relaxed">
              <strong>Your approach · </strong>
              {note}
            </p>
          )}
        </>
      )}
    </section>
  );
}
