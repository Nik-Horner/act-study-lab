import type { createClient } from "./supabase/server";
import { ENGLISH_PRACTICE_ID } from "./english-drill-answer";
import { englishProgress, type EnglishAnswerRow } from "./english-progress";

export async function loadEnglishProgress(
  db: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const [baseline, misses] = await Promise.all([
    db.from("topic_progress").select("*").eq("user_id", userId),
    db.from("question_misses").select("*").eq("user_id", userId),
  ]);
  if (baseline.error || misses.error)
    throw new Error("Your English progress could not load. Reload to retry.");
  const answers: EnglishAnswerRow[] = [];
  const dailyAnswers: EnglishAnswerRow[] = [];
  for (const examId of [ENGLISH_PRACTICE_ID, "daily:english"]) {
    for (let offset = 0; ; offset += 500) {
      const page = await db
        .from("exam_attempts")
        .select("id, answers, completed_at")
        .eq("user_id", userId)
        .eq("exam_id", examId)
        .order("completed_at")
        .order("id")
        .range(offset, offset + 499);
      if (page.error)
        throw new Error(
          "Your English answer history could not load. Reload to retry.",
        );
      (examId === ENGLISH_PRACTICE_ID ? answers : dailyAnswers).push(
        ...(page.data ?? []),
      );
      if (!page.data || page.data.length < 500) break;
      if (offset >= 99500)
        throw new Error(
          "Your English history is too large to load. Contact support.",
        );
    }
  }
  return englishProgress(
    userId,
    baseline.data ?? [],
    misses.data ?? [],
    answers,
    dailyAnswers,
  );
}
