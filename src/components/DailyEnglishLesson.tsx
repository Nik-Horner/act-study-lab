"use client";
import { useState } from "react";
import { EnglishLessonSections } from "./EnglishLessonSections";
import { QuickCheck } from "@/app/learn/[topic]/QuickCheck";
import { Button } from "./ui/Button";
import type { DailyUnit } from "@/lib/daily-plan";
import type { CheckQuestion } from "@/lib/content";
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
  const first = unit.lesson.sections.findIndex(
    (_, i) => !completed.includes(`${unit.id}:concept:${i}`),
  );
  const [index, setIndex] = useState(
    revisiting ? 0 : first < 0 ? unit.lesson.sections.length - 1 : first,
  );
  const last = index === unit.lesson.sections.length - 1;
  return (
    <div className="space-y-6">
      <header className="lesson-heading">
        <h1 className="text-2xl font-semibold sm:text-3xl">{unit.title}</h1>
        <span className="text-sm text-ink-soft">
          Part {index + 1} of {unit.lesson.sections.length}
        </span>
      </header>
      <div
        className="lesson-progress"
        aria-label={`Part ${index + 1} of ${unit.lesson.sections.length}`}
      >
        {unit.lesson.sections.map((_, i) => (
          <span key={i} data-current={i === index} data-done={i < index} />
        ))}
      </div>
      <div className="english-lesson-workbench">
        <EnglishLessonSections
          sections={[unit.lesson.sections[index]]}
          hideHeading={unit.lesson.sections.length === 1}
        />
      </div>
      {last && unit.lesson.check.length > 0 && (
        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-xl font-semibold">Quick check</h2>
          <QuickCheck checks={unit.lesson.check as CheckQuestion[]} />
        </section>
      )}
      <div className="lesson-actions">
        <Button
          variant="ghost"
          disabled={index === 0 || pending}
          onClick={() => {
            setIndex(index - 1);
            window.scrollTo({ top: 0 });
          }}
        >
          Previous part
        </Button>
        <Button
          disabled={pending}
          onClick={async () => {
            if (revisiting) {
              if (last) onBack();
              else setIndex(index + 1);
            } else if (await onAdvance(index, last)) {
              if (!last) setIndex(index + 1);
            }
            window.scrollTo({ top: 0 });
          }}
        >
          {pending
            ? "Saving…"
            : last
              ? revisiting
                ? "Back to drill"
                : "Start drill"
              : "Next part"}
        </Button>
      </div>
    </div>
  );
}
