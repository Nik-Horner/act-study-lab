import type { Difficulty } from "./content";

export function englishDrillLevel(
  currentScore: number | null,
  targetScore: number | null,
) {
  if (currentScore !== null && currentScore < 24) return "foundation";
  if (
    currentScore !== null &&
    currentScore >= 28 &&
    targetScore !== null &&
    targetScore >= 33
  )
    return "challenge";
  return "balanced";
}

/** Fresh questions take priority even when a reviewed question better fits the goal. */
export function englishDrillOrder(
  questions: readonly { id: string; difficulty: Difficulty }[],
  answeredQuestionIds: readonly string[] = [],
  currentScore: number | null = null,
  targetScore: number | null = null,
): number[] {
  const seen = new Set(answeredQuestionIds);
  const level = englishDrillLevel(currentScore, targetScore);
  const difficulties: Difficulty[] =
    level === "challenge"
      ? ["hard", "medium", "easy"]
      : ["easy", "medium", "hard"];
  return [false, true].flatMap((review) => {
    const buckets = difficulties.map((difficulty) =>
      questions.flatMap((q, i) =>
        seen.has(q.id) === review && q.difficulty === difficulty ? [i] : [],
      ),
    );
    if (level !== "balanced") return buckets.flat();
    const order: number[] = [];
    for (
      let i = 0;
      i < Math.max(...buckets.map((bucket) => bucket.length));
      i++
    )
      for (const bucket of buckets)
        if (i < bucket.length) order.push(bucket[i]);
    return order;
  });
}
