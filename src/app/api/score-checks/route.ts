import { createClient } from "@/lib/supabase/server";
import {
  SCORE_CHECK_EXAM_ID,
  readScoreCheck,
  scoreCheckId,
  validateScoreCheck,
  type ScoreCheck,
} from "@/lib/score-checks";

async function history(
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
      return Response.json(
        { error: "Your score checks could not load. Retry." },
        { status: 503 },
      );
    for (const row of data ?? []) {
      const check = readScoreCheck(row.answers);
      if (check) checks.push(check);
    }
    if (!data || data.length < 500)
      return Response.json(
        { checks },
        { headers: { "Cache-Control": "private, no-store" } },
      );
  }
  return Response.json(
    { error: "Your score history is too large to load. Contact support." },
    { status: 413 },
  );
}

export async function GET() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to load your score checks." },
      { status: 401 },
    );
  return history(db, user.id);
}

export async function POST(request: Request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to save your score check." },
      { status: 401 },
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const input = validateScoreCheck(body);
  if (!input)
    return Response.json(
      {
        error:
          "Enter a section, whole-number score from 1–36, form name (100 characters or fewer), past or current date, and all three practice confirmations.",
      },
      { status: 400 },
    );
  const check: ScoreCheck = {
    ...input,
    id: await scoreCheckId(user.id, input.subject, input.formName),
    recordedAt: new Date().toISOString(),
  };
  const { error } = await db.from("exam_attempts").upsert({
    id: check.id,
    user_id: user.id,
    exam_id: SCORE_CHECK_EXAM_ID,
    answers: { ...check },
    completed_at: check.recordedAt,
    raw_correct: 0,
    raw_total: 0,
    scale_score: 0,
    duration_seconds: null,
  });
  if (error)
    return Response.json(
      { error: "Your score check was not saved. Retry before leaving." },
      { status: 503 },
    );
  return history(db, user.id);
}
