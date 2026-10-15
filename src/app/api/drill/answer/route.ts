import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateEnglishDrillAnswer } from "@/lib/english-drill-answer";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const body = validateEnglishDrillAnswer(input);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { topicSlug, questionId, correct } = body;

  const { data: existing, error: readError } = await supabase
    .from("topic_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("topic_slug", topicSlug)
    .maybeSingle();
  if (readError)
    return NextResponse.json(
      { error: "Your progress could not be loaded. Reload before continuing." },
      { status: 503 },
    );

  // shortcut: counters and misses are separate writes; a transactional RPC is needed for safe replay and concurrent tabs.
  const attempts = (existing?.attempts ?? 0) + 1;
  const correctCount = (existing?.correct ?? 0) + (correct ? 1 : 0);
  const currentStreak = correct ? (existing?.current_streak ?? 0) + 1 : 0;
  const bestStreak = Math.max(existing?.best_streak ?? 0, currentStreak);

  const { data: updated, error } = await supabase
    .from("topic_progress")
    .upsert(
      {
        user_id: user.id,
        topic_slug: topicSlug,
        attempts,
        correct: correctCount,
        current_streak: currentStreak,
        best_streak: bestStreak,
        last_practiced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,topic_slug" },
    )
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json(
      {
        error:
          "Your answer save could not be confirmed. Reload to check progress before continuing.",
      },
      { status: 503 },
    );
  }

  const misses = correct
    ? await supabase
        .from("question_misses")
        .delete()
        .eq("user_id", user.id)
        .eq("question_id", questionId)
    : await supabase
        .from("question_misses")
        .upsert(
          { user_id: user.id, question_id: questionId, topic_slug: topicSlug },
          { onConflict: "user_id,question_id" },
        );
  if (misses.error)
    return NextResponse.json(
      {
        error:
          "Your topic progress saved, but the review list could not save. Reload before continuing.",
      },
      { status: 503 },
    );

  return NextResponse.json(updated);
}
