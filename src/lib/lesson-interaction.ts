import type { Lesson } from "./act/types";

export type LessonActivityContent = NonNullable<
  Lesson["sections"][number]["activity"]
>;
export type ActivityState = {
  phase: "try" | "explain" | "step" | "ready";
  choice: number | null;
  recovering: boolean;
};

export type TeachingStage = "method" | "example" | "check";

/** Never invent an example or gate a section on a task it does not contain. */
export function teachingStages(
  section: Lesson["sections"][number],
): TeachingStage[] {
  return [
    "method",
    ...(section.examples?.length || section.workedCases?.length
      ? ["example" as const]
      : []),
    ...(section.activity ? ["check" as const] : []),
  ];
}

/** Practice recovery never edits the original scored answer. */
export function chooseActivityAnswer(
  state: ActivityState,
  choice: number,
  answer: number,
): ActivityState {
  if (state.phase === "ready" || state.phase === "explain") return state;
  const correct = choice === answer;
  return {
    phase: correct ? "ready" : state.phase === "step" ? "step" : "explain",
    choice,
    recovering: state.recovering || !correct,
  };
}

export const EXPLORATION_SKILLS = [
  "math-modeling-linear-models",
  "dependent-boundary",
  "reading-inference-evidence-link",
  "science-experimental-design-confounds",
] as const;

export function isClauseRecognitionSection(topic: string, sourceIndex: number) {
  return topic === "sentence-structure" && sourceIndex === 0;
}

export function bikeRentalCost(hours: number) {
  return 3 + 2 * hours;
}

export const explorationContent = {
  sentence: {
    first: "Although the trail was muddy",
    second: "the hikers reached the lookout",
    answer: ",",
  },
  reading: {
    sentences: [
      "Mina had practiced the piano piece every afternoon for a month.",
      "At the recital, she paused outside the stage door and rubbed her damp palms on her skirt.",
      "Then she took a slow breath and walked toward the piano.",
    ],
    clue: 1,
    inference: "She feels nervous before performing.",
  },
  science: {
    columns: [
      "Group",
      "Fertilizer (g)",
      "Water per day (mL)",
      "Mean growth (cm)",
    ],
    rows: [
      ["A", 0, 50, 4],
      ["B", 5, 100, 9],
      ["C", 5, 50, 7],
    ],
    pair: ["A", "C"],
  },
};
