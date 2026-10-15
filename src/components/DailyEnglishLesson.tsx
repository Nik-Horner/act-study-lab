"use client";
import { useState } from "react";
import { EnglishLessonSections } from "./EnglishLessonSections";
import { QuickCheck } from "@/app/learn/[topic]/QuickCheck";
import { Button } from "./ui/Button";
import type { DailyUnit } from "@/lib/daily-plan";
import type { CheckQuestion } from "@/lib/content";
import { LessonActivity } from "./LessonActivity";
import { dailyConcepts } from "@/lib/daily-flow";
import { reportingCategoryName } from "@/lib/learning-skills";
export function DailyEnglishLesson({
  unit,
  completed,
  revisiting,
  pending,
  onAdvance,
  onBack,
}: {
  unit: DailyUnit;
  completed: string[];
  revisiting: boolean;
  pending: boolean;
  onAdvance: (index: number, last: boolean) => Promise<boolean>;
  onBack: () => void;
}) {
  const visible = dailyConcepts(unit);
  const first = visible.find(
    (i) => !completed.includes(`${unit.id}:concept:${i}`),
  );
  const [index, setIndex] = useState(
    revisiting ? visible[0] : (first ?? visible[visible.length - 1]),
  );
  const position = visible.indexOf(index);
  const last = position === visible.length - 1;
  const [phase, setPhase] = useState<"learn" | "practice">("learn");
  const [checkedIndex, setCheckedIndex] = useState(-1);
  const section = unit.lesson.sections[index];
  const needsTry =
    !!section.activity &&
    !revisiting &&
    checkedIndex !== index &&
    !completed.includes(`${unit.id}:concept:${index}`);
  return (
    <div className="space-y-6">
      <header className="lesson-heading">
        <h1 className="text-2xl font-semibold sm:text-3xl">{unit.title}</h1>
        {unit.reportingCategory && (
          <p className="mt-2 text-sm text-ink-soft">
            {reportingCategoryName(unit.reportingCategory)}
          </p>
        )}
        <span className="text-sm text-ink-soft">
          Part {position + 1} of {visible.length}
        </span>
      </header>
      <div
        className="lesson-progress"
        aria-label={`Part ${position + 1} of ${visible.length}`}
      >
        {visible.map((i, p) => (
          <span key={i} data-current={i === index} data-done={p < position} />
        ))}
      </div>
      {section.activity && (
        <div
          className="lesson-phase-nav"
          role="group"
          aria-label="Concept steps"
        >
          <button
            type="button"
            aria-pressed={phase === "learn"}
            onClick={() => setPhase("learn")}
          >
            Learn
          </button>
          <button
            type="button"
            aria-pressed={phase === "practice"}
            onClick={() => setPhase("practice")}
          >
            Try it
          </button>
        </div>
      )}
      <div className="english-lesson-workbench" hidden={phase !== "learn"}>
        <EnglishLessonSections
          sections={[unit.lesson.sections[index]]}
          hideHeading={visible.length === 1}
        />
      </div>
      {section.activity && (
        <div hidden={phase !== "practice"}>
          <LessonActivity
            key={`${unit.id}-${index}`}
            activity={section.activity}
            onComplete={() => setCheckedIndex(index)}
          />
        </div>
      )}
      {last && unit.lesson.check.length > 0 && (
        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-xl font-semibold">Quick check</h2>
          <QuickCheck checks={unit.lesson.check as CheckQuestion[]} />
        </section>
      )}
      <div className="lesson-actions">
        <Button
          variant="ghost"
          disabled={(position === 0 && phase === "learn") || pending}
          onClick={() => {
            if (phase === "practice") setPhase("learn");
            else setIndex(visible[position - 1]);
            window.scrollTo({ top: 0 });
          }}
        >
          {phase === "practice" ? "Review method" : "Previous part"}
        </Button>
        <Button
          disabled={pending || (phase === "practice" && needsTry)}
          onClick={async () => {
            if (phase === "learn" && section.activity) {
              setPhase("practice");
              window.scrollTo({ top: 0 });
              return;
            }
            if (revisiting) {
              if (last) onBack();
              else {
                setIndex(visible[position + 1]);
                setPhase("learn");
              }
            } else if (await onAdvance(index, last)) {
              if (!last) {
                setIndex(visible[position + 1]);
                setPhase("learn");
              }
            }
            window.scrollTo({ top: 0 });
          }}
        >
          {pending
            ? "Saving…"
            : phase === "learn" && section.activity
              ? "Try it"
              : last
                ? revisiting
                  ? "Back to drill"
                  : "Start drill"
                : "Next part"}
        </Button>
      </div>
      {phase === "practice" && needsTry && (
        <p className="text-sm text-ink-soft">Choose an answer to continue.</p>
      )}
    </div>
  );
}
