"use client";

import { useState } from "react";
import { renderStem, LETTERS } from "@/lib/format";
import type { CheckQuestion } from "@/lib/content";
import { Card } from "@/components/ui/Card";

/* Purely client-side reading-comprehension check for a lesson.
   Not persisted to the DB — matches the old app's behavior. */
export function QuickCheck({ checks }: { checks: CheckQuestion[] }) {
  if (checks.length === 0) return null;

  return (
    <div className="space-y-4">
      {checks.map((q, i) => (
        <CheckCard key={q.id ?? i} q={q} />
      ))}
    </div>
  );
}

function CheckCard({ q }: { q: CheckQuestion }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === q.answer;

  return (
    <Card className="p-5">
      {q.stem && (
        <div
          className="mb-2 text-ink"
          dangerouslySetInnerHTML={{ __html: renderStem(q.stem) }}
        />
      )}
      <p className="mb-3 text-sm text-ink-soft">{q.questionText}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {q.choices.map((choice, i) => {
          const isCorrect = i === q.answer;
          const isPicked = i === picked;
          let tone = "border-border bg-bg-raised hover:bg-border";
          if (answered && isCorrect) tone = "border-good bg-good-soft text-good";
          else if (answered && isPicked) tone = "border-bad bg-bad-soft text-bad";
          else if (answered) tone = "border-border bg-bg-raised opacity-60";

          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setPicked(i)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${tone}`}
            >
              <span className="font-semibold">{LETTERS[i]}</span>
              <span>{choice}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <p className={`mt-3 text-sm ${correct ? "text-good" : "text-bad"}`}>
          {correct ? "Correct — " : "Not quite — "}
          {q.explanation}
        </p>
      )}
    </Card>
  );
}
