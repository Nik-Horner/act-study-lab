import { NextResponse } from "next/server";
import { getExam } from "@/lib/content";
import { estimateScale } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { validateEnglishExamSubmission } from "@/lib/english-exam-session";

interface StoredAnswer {
  number: number;
  topic: string;
  picked: number | null;
  correct: boolean;
  answer: number;
  explanation: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    typeof (raw as { examId?: unknown }).examId !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
  // shortcut: an already-open legacy exam has no retry ID; accept it until that client reloads.
  if (!("attemptId" in raw) && !("ownerId" in raw))
    raw = { ...raw, attemptId: crypto.randomUUID(), ownerId: user.id };

  let exam;
  try {
    exam = getExam((raw as { examId: string }).examId);
  } catch {
    return NextResponse.json({ error: "Unknown exam" }, { status: 400 });
  }
  const body = validateEnglishExamSubmission(raw, exam);
  if (!body)
    return NextResponse.json(
      { error: "Invalid exam answers or timing" },
      { status: 400 },
    );
  if (body.ownerId !== user.id)
    return NextResponse.json(
      {
        error:
          "The signed-in account changed. Sign back into the original account before submitting.",
      },
      { status: 409 },
    );
  const previous = await supabase
    .from("exam_attempts")
    .select("id,exam_id")
    .eq("id", body.attemptId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (previous.error)
    return NextResponse.json(
      { error: "Your saved exam could not be checked. Retry." },
      { status: 503 },
    );
  if (previous.data)
    return previous.data.exam_id === exam.id
      ? NextResponse.json({ attemptId: previous.data.id })
      : NextResponse.json(
          { error: "This attempt ID belongs to another exam." },
          { status: 409 },
        );

  // Authoritative: compute correctness from the real content, never trust the client.
  const pickedByNumber = new Map<number, number | null>();
  body.answers.forEach((a) => pickedByNumber.set(a.number, a.picked));

  const stored: StoredAnswer[] = [];
  exam.passages.forEach((p) =>
    p.questions.forEach((q) => {
      const picked = pickedByNumber.has(q.number)
        ? (pickedByNumber.get(q.number) ?? null)
        : null;
      stored.push({
        number: q.number,
        topic: q.topic,
        picked,
        correct: picked === q.answer,
        answer: q.answer,
        explanation: q.explanation,
      });
    }),
  );
  stored.sort((a, b) => a.number - b.number);

  const rawTotal = stored.length;
  const rawCorrect = stored.filter((s) => s.correct).length;
  const scaleScore = estimateScale(rawCorrect, rawTotal);

  const { data, error } = await supabase
    .from("exam_attempts")
    .insert({
      id: body.attemptId,
      user_id: user.id,
      exam_id: exam.id,
      answers: stored as unknown as Json,
      raw_correct: rawCorrect,
      raw_total: rawTotal,
      scale_score: scaleScore,
      duration_seconds: body.durationSeconds,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      const replay = await supabase
        .from("exam_attempts")
        .select("id,exam_id")
        .eq("id", body.attemptId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!replay.error && replay.data?.exam_id === exam.id)
        return NextResponse.json({ attemptId: replay.data.id });
      return NextResponse.json(
        {
          error: "This attempt ID could not be reused. Reload before retrying.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to save attempt" },
      { status: 500 },
    );
  }

  return NextResponse.json({ attemptId: data.id });
}
