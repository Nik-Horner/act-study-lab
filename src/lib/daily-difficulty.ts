import type { Question } from "./act/types";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const difficultyLabels = {
  easy: "Foundation",
  medium: "Core",
  hard: "Challenge",
};
export function startingDifficulty(
  score: number | null,
  goal: number,
): Question["difficulty"] {
  if (score === null || score < 24) return "easy";
  return score >= 28 && goal >= 33 ? "hard" : "medium";
}
export function difficultyPriority(
  value: Question["difficulty"],
  desired: Question["difficulty"],
) {
  const delta = DIFFICULTIES.indexOf(value) - DIFFICULTIES.indexOf(desired);
  return delta === 0 ? 0 : delta < 0 ? -delta : delta + 2;
}
