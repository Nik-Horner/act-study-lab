import { loadScoreChecks } from "@/lib/score-checks-server";
import { createClient } from "@/lib/supabase/server";
import {
  SCORE_CHECK_EXAM_ID,
  scoreCheckId,
  validateScoreCheck,
  type ScoreCheck,
} from "@/lib/score-checks";

async function history(
  db: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const result = await loadScoreChecks(db, userId);
  return (
    result.error ??
    Response.json(
      { checks: result.checks },
      { headers: { "Cache-Control": "private, no-store" } },
    )
  );
}

export async function GET(request: Request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to load your score checks." },
      { status: 401 },
    );
  if (new URL(request.url).searchParams.get("ownerId") !== user.id)
    return Response.json(
      { error: "The signed-in account changed. Reload before continuing." },
      { status: 409 },
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
  if (!body || typeof body !== "object" || Array.isArray(body))
    return Response.json({ error: "Invalid score check." }, { status: 400 });
  if (!("ownerId" in body) || body.ownerId !== user.id)
    return Response.json(
      { error: "The signed-in account changed. Reload before continuing." },
      { status: 409 },
    );
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
