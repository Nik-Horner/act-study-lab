import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ENGLISH_PRACTICE_ID,
  validateEnglishDrillAnswer,
} from "@/lib/english-drill-answer";
import { loadEnglishProgress } from "@/lib/english-progress-server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input))
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  if (!("ownerId" in input) || input.ownerId !== user.id)
    return NextResponse.json(
      { error: "The signed-in account changed. Reload before continuing." },
      { status: 409 },
    );
  const body = validateEnglishDrillAnswer(input);
  if (!body)
    return NextResponse.json(
      { error: "Invalid answer. Reload before continuing." },
      { status: 400 },
    );
  const { error } = await supabase.from("exam_attempts").insert({
    id: body.answerId,
    user_id: user.id,
    exam_id: ENGLISH_PRACTICE_ID,
    answers: body,
    raw_correct: Number(body.correct),
    raw_total: 1,
    scale_score: 0,
  });
  if (error?.code === "23505") {
    const previous = await supabase
      .from("exam_attempts")
      .select("answers, exam_id")
      .eq("id", body.answerId)
      .eq("user_id", user.id)
      .maybeSingle();
    const saved =
      previous.data && validateEnglishDrillAnswer(previous.data.answers);
    if (previous.error)
      return NextResponse.json(
        { error: "Your saved answer could not be checked. Retry." },
        { status: 503 },
      );
    if (
      !saved ||
      previous.data?.exam_id !== ENGLISH_PRACTICE_ID ||
      saved.questionId !== body.questionId ||
      saved.topicSlug !== body.topicSlug ||
      saved.chosen !== body.chosen
    )
      return NextResponse.json(
        {
          error: "A saved answer cannot be replaced. Reload before continuing.",
        },
        { status: 409 },
      );
  } else if (error) {
    return NextResponse.json(
      { error: "Your answer has not saved. Retry before continuing." },
      { status: 503 },
    );
  }
  try {
    const { progress } = await loadEnglishProgress(supabase, user.id);
    return NextResponse.json(
      progress.find((row) => row.topic_slug === body.topicSlug),
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Your answer saved, but progress could not load. Retry to confirm it.",
      },
      { status: 503 },
    );
  }
}
