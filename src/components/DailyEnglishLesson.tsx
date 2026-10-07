"use client";
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
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-ink">{unit.title}</h1>
      <EnglishLessonSections
        sections={unit.lesson.sections}
        hideHeading={unit.lesson.sections.length === 1}
      />
      {unit.lesson.check.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Quick check</h2>
          <QuickCheck checks={unit.lesson.check as CheckQuestion[]} />
        </section>
      )}
      <Button
        disabled={pending}
        onClick={async () => {
          if (revisiting) {
            onBack();
            return;
          }
          for (let i = 0; i < unit.lesson.sections.length; i++) {
            const last = i === unit.lesson.sections.length - 1;
            if (!last && completed.includes(`${unit.id}:concept:${i}`))
              continue;
            if (!(await onAdvance(i, last))) return;
          }
        }}
      >
        {pending ? "Saving…" : revisiting ? "Back to drill" : "Start drill →"}
      </Button>
    </div>
  );
}
