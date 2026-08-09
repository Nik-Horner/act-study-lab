/* Streak-based mastery rules, ported from the old js/progress.js. */
import type { Database } from "@/lib/supabase/database.types";

export type TopicProgressRow = Database["public"]["Tables"]["topic_progress"]["Row"];

export const MASTERY_STREAK = 8;
const MASTERY_MIN_ANSWERED = 8;

export type TopicStatus = "none" | "practicing" | "mastered";

export function topicStatus(row: TopicProgressRow | undefined): TopicStatus {
  if (!row || row.attempts === 0) return "none";
  if (row.best_streak >= MASTERY_STREAK && row.attempts >= MASTERY_MIN_ANSWERED) return "mastered";
  return "practicing";
}

/* 0..1 progress toward mastery, for the ProgressBar. */
export function masteryProgress(row: TopicProgressRow | undefined): number {
  if (!row) return 0;
  if (topicStatus(row) === "mastered") return 1;
  return Math.min(1, row.best_streak / MASTERY_STREAK);
}
