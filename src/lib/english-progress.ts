import type { Tables } from "./supabase/database.types";
import { validateEnglishDrillAnswer } from "./english-drill-answer";

export type EnglishAnswerRow = Pick<
  Tables<"exam_attempts">,
  "id" | "answers" | "completed_at"
>;

// Legacy totals stay intact; each new answer is one immutable, uniquely keyed row.
export function englishProgress(
  userId: string,
  baseline: Tables<"topic_progress">[],
  legacyMisses: Tables<"question_misses">[],
  answers: EnglishAnswerRow[],
) {
  const progress = new Map(baseline.map((row) => [row.topic_slug, { ...row }]));
  const misses = new Map(
    legacyMisses.map((row) => [row.question_id, { ...row }]),
  );
  const seen = new Set<string>();
  const ordered = [...answers].sort(
    (a, b) =>
      a.completed_at.localeCompare(b.completed_at) || a.id.localeCompare(b.id),
  );
  for (const row of ordered) {
    if (seen.has(row.id)) continue;
    const answer = validateEnglishDrillAnswer(row.answers);
    if (
      !answer ||
      answer.answerId !== row.id ||
      !Number.isFinite(Date.parse(row.completed_at))
    )
      throw new Error(
        "Your English answer history could not be read. Reload to retry.",
      );
    seen.add(row.id);
    const previous = progress.get(answer.topicSlug) ?? {
      user_id: userId,
      topic_slug: answer.topicSlug,
      attempts: 0,
      correct: 0,
      current_streak: 0,
      best_streak: 0,
      last_practiced_at: null,
    };
    previous.attempts += 1;
    previous.correct += Number(answer.correct);
    previous.current_streak = answer.correct ? previous.current_streak + 1 : 0;
    previous.best_streak = Math.max(
      previous.best_streak,
      previous.current_streak,
    );
    previous.last_practiced_at = row.completed_at;
    progress.set(answer.topicSlug, previous);
    if (answer.correct) misses.delete(answer.questionId);
    else
      misses.set(answer.questionId, {
        user_id: userId,
        question_id: answer.questionId,
        topic_slug: answer.topicSlug,
        missed_at: row.completed_at,
      });
  }
  return { progress: [...progress.values()], misses: [...misses.values()] };
}
