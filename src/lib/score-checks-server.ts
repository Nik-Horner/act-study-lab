import type { createClient } from "./supabase/server";
import {
  SCORE_CHECK_EXAM_ID,
  readScoreCheck,
  type ScoreCheck,
} from "./score-checks";

export async function loadScoreChecks(
  db: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const checks: ScoreCheck[] = [];
  for (let offset = 0; offset < 10_000; offset += 500) {
    const { data, error } = await db
      .from("exam_attempts")
      .select("answers")
      .eq("user_id", userId)
      .eq("exam_id", SCORE_CHECK_EXAM_ID)
      .order("completed_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error)
      return {
        error: Response.json(
          { error: "Your score checks could not load. Retry." },
          { status: 503 },
        ),
      };
    for (const row of data ?? []) {
      const check = readScoreCheck(row.answers);
      if (check) checks.push(check);
    }
    if (!data || data.length < 500) return { checks };
  }
  return {
    error: Response.json(
      { error: "Your score history is too large to load. Contact support." },
      { status: 413 },
    ),
  };
}
