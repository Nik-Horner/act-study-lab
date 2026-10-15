"use client";

import { useEffect, useRef, useState } from "react";
import cards from "@/content/math-formula-cards.json";
import { reviewFormula, startFormulaReview } from "@/lib/formula-review";
import { MathText } from "@/components/MathText";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function FormulaCards({
  ids,
  remainingIds,
  onRate,
}: {
  ids?: string[];
  remainingIds?: string[];
  onRate?: (id: string, rating: "again" | "remembered") => Promise<void>;
}) {
  const deck = ids
    ? ids.map((id) => cards.find((card) => card.id === id)!)
    : cards;
  const [review, setReview] = useState(() => ({
    ...startFormulaReview(deck.length),
    remaining: deck.flatMap((card, index) =>
      !remainingIds || remainingIds.includes(card.id) ? [index] : [],
    ),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const answer = useRef<HTMLDivElement>(null);
  const card = deck[review.remaining[0]];
  const recalled = deck.length - review.remaining.length;

  useEffect(() => {
    (review.revealed ? answer.current : heading.current)?.focus();
  }, [review]);

  async function next(action: "again" | "remembered") {
    if (saving || !card) return;
    setSaving(true);
    setError(null);
    try {
      await onRate?.(card.id, action);
      setReview((state) => reviewFormula(state, action));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Couldn’t save. Retry your rating.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Formula flashcards" className="space-y-5">
      <div className="space-y-3">
        <p role="status" className="text-sm tabular-nums text-ink-soft">
          {recalled} of {deck.length} recalled {onRate ? "today" : "this round"}
        </p>
        <ProgressBar
          percent={deck.length ? (recalled / deck.length) * 100 : 100}
        />
      </div>
      <Card className="space-y-6 p-6 sm:p-10">
        <h2 ref={heading} tabIndex={-1} className="text-2xl font-semibold">
          {card ? card.title : "Round complete"}
        </h2>
        {card ? (
          <>
            <p className="text-sm text-ink-soft">{card.category}</p>
            <div
              className="flex min-h-40 items-center justify-center border-y border-border py-6"
              id="formula-answer"
              ref={answer}
              tabIndex={-1}
            >
              {review.revealed ? (
                <div className="min-w-0 w-full space-y-5 text-center">
                  <div className="overflow-x-auto py-2 text-xl sm:text-2xl">
                    <MathText>{`\\[${card.formula}\\]`}</MathText>
                  </div>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    <MathText>{card.note}</MathText>
                  </p>
                </div>
              ) : (
                <p className="text-center text-ink-soft">
                  What is the formula?
                </p>
              )}
            </div>
            {review.revealed ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="ghost"
                  disabled={saving}
                  onClick={() => void next("again")}
                >
                  Review again
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => void next("remembered")}
                >
                  {saving ? "Saving…" : "I recalled it"}
                </Button>
              </div>
            ) : (
              <Button
                aria-controls="formula-answer"
                aria-expanded={false}
                onClick={() => {
                  setReview((state) => reviewFormula(state, "reveal"));
                }}
              >
                Reveal formula
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="text-ink-soft">
              {onRate
                ? "Today’s formula review is saved."
                : "You recalled every formula. Try another round to keep them fresh."}
            </p>
            {!onRate && (
              <Button
                onClick={() => setReview(startFormulaReview(deck.length))}
              >
                Practice again
              </Button>
            )}
          </>
        )}
      </Card>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error} Choose your rating again to retry.
        </p>
      )}
      <p className="text-sm text-ink-soft">
        {onRate
          ? "Progress saves to your account. Recall a formula on two different days to count it toward your goal."
          : "“Review again” brings the card back. A new visit starts a fresh round."}
      </p>
    </section>
  );
}
