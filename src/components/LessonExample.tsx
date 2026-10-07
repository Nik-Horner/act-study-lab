"use client";
import { useState } from "react";
import { renderStem } from "@/lib/format";
import type { Lesson } from "@/lib/act/types";
import { Button } from "./ui/Button";
/** Reveal the reasoning only after the learner has made a prediction. */
export function LessonExample({
  example,
  classify,
}: {
  example: NonNullable<Lesson["sections"][number]["examples"]>[number];
  classify: boolean;
}) {
  const [prediction, setPrediction] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);
  const marker = example.text.indexOf("\n\nSupported answer:");
  const prompt = marker >= 0 ? example.text.slice(0, marker) : example.text;
  const solution = marker >= 0 ? example.text.slice(marker + 2) : null;
  const show = revealed || prediction !== null;
  return (
    <div
      className={`rounded-xl border px-4 py-4 text-sm ${show ? (example.good ? "border-good bg-good-soft" : "border-bad bg-bad-soft") : "border-border bg-bg-soft"}`}
    >
      <p className="mb-3 font-semibold">
        {classify
          ? "Can this stand alone as a complete sentence?"
          : solution
            ? "Try the worked example"
            : example.label}
      </p>
      <div
        className="whitespace-pre-line leading-relaxed text-ink"
        dangerouslySetInnerHTML={{ __html: renderStem(prompt) }}
      />
      {!show && classify && (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="sm" variant="ghost" onClick={() => setPrediction(true)}>
            Complete sentence
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPrediction(false)}
          >
            Fragment
          </Button>
        </div>
      )}
      {!show && solution && (
        <div className="mt-4 space-y-3">
          <p className="text-ink-soft">
            Find the answer and the specific evidence that supports it before
            revealing the reasoning.
          </p>
          <Button size="sm" variant="ghost" onClick={() => setRevealed(true)}>
            Reveal answer and reasoning
          </Button>
        </div>
      )}
      {show && classify && (
        <p role="status" className="mt-3 font-semibold">
          {prediction === example.good ? "Correct." : "Look again."}{" "}
          {example.label}
        </p>
      )}
      {show && solution && (
        <div
          className="mt-4 whitespace-pre-line leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderStem(solution) }}
        />
      )}
    </div>
  );
}
