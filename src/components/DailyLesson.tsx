"use client";
import { useState } from "react";
import Link from "next/link";
import type { DailyUnit } from "@/lib/daily-plan";
import { dailyConcepts } from "@/lib/daily-flow";
import { ConceptTeaching } from "./ConceptTeaching";

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
  const visible = dailyConcepts(unit);
  const first = visible.find(
    (i) => !completed.includes(`${unit.id}:concept:${i}`),
  );
  const [index, setIndex] = useState(
    revisiting ? visible[0] : (first ?? visible[visible.length - 1]),
  );
  const position = visible.indexOf(index);
  const last = position === visible.length - 1;
  return (
    <div className="space-y-5">
      <ConceptTeaching
        key={`${unit.id}-${index}`}
        title={unit.title}
        difficulty={unit.difficulty}
        section={unit.lesson.sections[index]}
        subject={
          unit.topic.startsWith("math-")
            ? "math"
            : unit.topic.startsWith("reading-")
              ? "reading"
              : "science"
        }
        topic={unit.topic}
        skillId={unit.skillId}
        sourceIndex={unit.sectionIndices?.[index] ?? index}
        position={position}
        total={visible.length}
        pending={pending}
        previouslyChecked={
          revisiting || completed.includes(`${unit.id}:concept:${index}`)
        }
        onPrevious={
          position > 0
            ? () => {
                setIndex(visible[position - 1]);
                window.scrollTo({ top: 0 });
              }
            : undefined
        }
        nextLabel={
          last
            ? revisiting
              ? "Back to drill"
              : "Practice independently"
            : "Next concept"
        }
        onContinue={async () => {
          if (revisiting) {
            if (last) onBack();
            else setIndex(visible[position + 1]);
          } else if (await onAdvance(index, last)) {
            if (!last) setIndex(visible[position + 1]);
          }
          window.scrollTo({ top: 0 });
        }}
      ></ConceptTeaching>
      <div className="lesson-reference-links">
        <Link
          href={`/learn/${unit.topic}${unit.skillId ? `?skill=${encodeURIComponent(unit.skillId)}` : "?reference=1"}`}
          target="_blank"
        >
          Open course lesson
        </Link>
        {unit.topic.startsWith("math-") && (
          <Link href={`/learn/math-formulas#${unit.topic}`} target="_blank">
            Formulas and methods
          </Link>
        )}
        {revisiting && !last && (
          <button className="min-h-11 text-brand underline" onClick={onBack}>
            Back to drill
          </button>
        )}
      </div>
    </div>
  );
}
