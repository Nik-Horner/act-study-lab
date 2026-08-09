import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AnswerBody {
  topicSlug: string;
  questionId: string;
  correct: boolean;
}

function isAnswerBody(body: unknown): body is AnswerBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.topicSlug === "string" && typeof b.questionId === "string" && typeof b.correct === "boolean"
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  if (!isAnswerBody(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { topicSlug, questionId, correct } = body;

  const { data: existing } = await supabase
    .from("topic_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("topic_slug", topicSlug)
    .maybeSingle();

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
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  if (correct) {
    await supabase
      .from("question_misses")
      .delete()
      .eq("user_id", user.id)
      .eq("question_id", questionId);
  } else {
    await supabase
      .from("question_misses")
      .upsert(
        { user_id: user.id, question_id: questionId, topic_slug: topicSlug },
        { onConflict: "user_id,question_id" },
      );
  }

  return NextResponse.json(updated);
}
