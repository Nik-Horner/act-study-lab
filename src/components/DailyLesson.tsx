"use client";
import { useState } from "react";
import Link from "next/link";
import type { DailyUnit } from "@/lib/daily-plan";
import { LessonSections } from "./LessonSections";
import { Button } from "./ui/Button";
export function DailyLesson({
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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{unit.title}</h1>
        <span className="text-sm text-ink-soft">
          Concept {index + 1}/{unit.lesson.sections.length}
        </span>
      </header>
      <LessonSections
        key={index}
        sections={[unit.lesson.sections[index]]}
        hideHeading={unit.lesson.sections[index].heading === unit.title}
        idPrefix={`daily-${unit.id}-${index}`}
      />
      <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
        <Button
          variant="ghost"
          disabled={index === 0 || pending}
          onClick={() => {
            setIndex(index - 1);
            window.scrollTo({ top: 0 });
          }}
        >
          Back
        </Button>
        <Button
          disabled={pending}
          onClick={async () => {
            if (revisiting) {
              if (last) onBack();
              else {
                setIndex(index + 1);
                window.scrollTo({ top: 0 });
              }
            } else if (await onAdvance(index, last)) {
              if (!last) setIndex(index + 1);
              window.scrollTo({ top: 0 });
            }
          }}
        >
          {pending
            ? "Saving…"
            : last
              ? revisiting
                ? "Back to drill"
                : "Start drill"
              : "Next concept"}
        </Button>
      </div>
      <Link
        href={`/learn/${unit.topic}`}
        target="_blank"
        className="inline-block min-h-11 text-sm text-brand underline"
      >
        Full topic lesson
      </Link>
      {revisiting && !last && (
        <button
          className="min-h-11 text-sm text-brand underline"
          onClick={onBack}
        >
          Back to drill
        </button>
      )}
    </div>
  );
}
