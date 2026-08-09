import { NextResponse } from "next/server";
import { getExam } from "@/lib/content";
import { estimateScale } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

interface SubmitAnswer {
  number: number;
  picked: number | null;
}

interface SubmitBody {
  examId: string;
  answers: SubmitAnswer[];
  durationSeconds: number;
}

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

  const body = (await request.json()) as SubmitBody;
  if (!body?.examId || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let exam;
  try {
    exam = getExam(body.examId);
  } catch {
    return NextResponse.json({ error: "Unknown exam" }, { status: 400 });
  }

  // Authoritative: compute correctness from the real content, never trust the client.
  const pickedByNumber = new Map<number, number | null>();
  body.answers.forEach((a) => pickedByNumber.set(a.number, a.picked));

  const stored: StoredAnswer[] = [];
  exam.passages.forEach((p) =>
    p.questions.forEach((q) => {
      const picked = pickedByNumber.has(q.number) ? (pickedByNumber.get(q.number) ?? null) : null;
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
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }

  return NextResponse.json({ attemptId: data.id });
}
