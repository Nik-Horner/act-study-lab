"use client";
import { useState } from "react";
import { MathText } from "./MathText";
import type { Lesson } from "@/lib/act/types";
import { Button } from "./ui/Button";
/** Worked reasoning is teaching; the separate activity supplies the new task. */
export function LessonExample({
  example,
  classify,
}: {
  example: NonNullable<Lesson["sections"][number]["examples"]>[number];
  classify: boolean;
}) {
  const [prediction, setPrediction] = useState<boolean | null>(null);
  const marker = example.text.indexOf("\n\nSupported answer:");
  const prompt = marker >= 0 ? example.text.slice(0, marker) : example.text;
  const solution = marker >= 0 ? example.text.slice(marker + 2) : null;
  const show = !!solution || prediction !== null;
  const correct = prediction === example.good;
  const tone = classify && prediction !== null ? correct : example.good;
  return (
    <div
      className={`rounded-xl border px-4 py-4 text-base ${show ? (tone ? "border-good bg-good-soft" : "border-bad bg-bad-soft") : "border-border bg-bg-soft"}`}
    >
      <p className="mb-3 font-semibold">
        {classify
          ? "Can this stand alone as a complete sentence?"
          : solution
            ? "Worked example"
            : example.label}
      </p>
      <div className="whitespace-pre-line leading-relaxed text-ink">
        <MathText>{prompt}</MathText>
      </div>
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
      {show && classify && (
        <div role="status" className="mt-3 space-y-2">
          <p className="font-semibold">
            {correct ? "Correct" : "Not quite"} — this is{" "}
            {example.good ? "a complete sentence" : "a fragment"}.
          </p>
          <p className="leading-relaxed">
            <MathText>{example.label}</MathText>
          </p>
        </div>
      )}
      {show && solution && (
        <div className="mt-4 whitespace-pre-line leading-relaxed">
          <MathText>{solution}</MathText>
        </div>
      )}
    </div>
  );
}
