import { createClient } from "@/lib/supabase/server";
import { readStudySettings } from "@/lib/account-settings";
import {
  dailyDate,
  dailyId,
  selectDailyPlan,
  dailyComplete,
  type DailyPlan,
} from "@/lib/daily-plan";
import type { Json } from "@/lib/supabase/database.types";
async function load() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return {
      error: Response.json({ error: "Sign in to study." }, { status: 401 }),
    };
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError)
    return {
      error: Response.json(
        { error: "Your account could not load. Retry." },
        { status: 503 },
      ),
    };
  if (!profile?.target_score || !profile.test_date)
    return {
      error: Response.json(
        { error: "Set your test date and goal in Account first." },
        { status: 409 },
      ),
    };
  const today = dailyDate();
  const { data: plans, error } = await db
    .from("exam_attempts")
    .select("*")
    .eq("user_id", user.id)
    .eq("exam_id", "daily:plan")
    .order("completed_at", { ascending: false })
    .limit(1);
  if (error)
    return {
      error: Response.json(
        { error: "Your daily lesson could not load. Retry." },
        { status: 503 },
      ),
    };
  const last = plans?.[0]?.answers as unknown as DailyPlan | undefined;
  const settings = readStudySettings(user.user_metadata, profile.current_score);
  const plan = selectDailyPlan(last, user.id, today, settings);
  const saved = plan === last;
  const [
    { data: rows, error: answerError },
    { data: checks, error: checkError },
  ] = await Promise.all([
    db
      .from("exam_attempts")
      .select("answers")
      .eq("user_id", user.id)
      .contains("answers", { dailyPlanId: plan.id }),
    db
      .from("plan_checks")
      .select("*")
      .eq("user_id", user.id)
      .in("item_key", [
        `daily-clock:${today}`,
        ...plan.blocks.map((b) => `daily:${plan.id}:lesson:${b.subject}`),
      ]),
  ]);
  if (answerError || checkError)
    return {
      error: Response.json(
        { error: "Saved daily progress could not load. Retry." },
        { status: 503 },
      ),
    };
  const answers: Record<string, number> = {};
  for (const row of rows ?? []) {
    const record = row.answers as unknown as {
      event: { questionId: string; chosen: number };
    };
    answers[record.event.questionId] = record.event.chosen;
  }
  const lessons = (checks ?? [])
    .filter((c) => c.item_key.startsWith(`daily:${plan.id}:lesson:`))
    .map((c) => c.item_key.split(":").at(-1)!);
  const clock = checks?.find(
    (c) => c.item_key === `daily-clock:${today}`,
  )?.checked_at;
  return {
    db,
    user,
    plan,
    saved,
    today,
    answers,
    lessons,
    deadline: clock ? Date.parse(clock) + settings.minutesPerDay * 60000 : null,
    settings,
  };
}
export async function GET() {
  const ctx = await load();
  if (ctx.error) return ctx.error;
  return Response.json(
    {
      plan: ctx.plan,
      saved: ctx.saved,
      answers: ctx.answers,
      lessons: ctx.lessons,
      deadline: ctx.deadline,
      today: ctx.today,
      minutes: ctx.settings.minutesPerDay,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  const receivedAt = Date.now();
  const ctx = await load();
  if (ctx.error) return ctx.error;
  const { db, user, plan, today } = ctx;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return Response.json({ error: "Invalid request." }, { status: 400 });
  if (body.planId !== plan.id)
    return Response.json(
      { error: "Your daily lesson changed. Reload to continue." },
      { status: 409 },
    );
  if (body.action === "start") {
    if (!ctx.saved) {
      const { error } = await db.from("exam_attempts").insert({
        id: plan.id,
        user_id: user.id,
        exam_id: "daily:plan",
        answers: plan as unknown as Json,
        raw_correct: 0,
        raw_total: 0,
        scale_score: 0,
        duration_seconds: 0,
      });
      if (error && error.code !== "23505")
        return Response.json(
          { error: "Couldn’t start your lesson. Retry." },
          { status: 503 },
        );
    }
    const { error } = await db
      .from("plan_checks")
      .upsert(
        { user_id: user.id, item_key: `daily-clock:${today}` },
        { onConflict: "user_id,item_key", ignoreDuplicates: true },
      );
    if (error)
      return Response.json(
        { error: "Couldn’t start your study timer. Retry." },
        { status: 503 },
      );
    return GET();
  }
  if (!ctx.saved)
    return Response.json(
      { error: "Start your daily lesson first." },
      { status: 409 },
    );
  if (ctx.deadline === null || receivedAt > ctx.deadline)
    return Response.json(
      { error: "Today’s study time is complete. Continue tomorrow." },
      { status: 409 },
    );
  if (body.action === "lesson") {
    if (!plan.blocks.some((b) => b.subject === body.subject))
      return Response.json({ error: "Unknown subject." }, { status: 400 });
    const { error } = await db.from("plan_checks").upsert(
      {
        user_id: user.id,
        item_key: `daily:${plan.id}:lesson:${body.subject}`,
      },
      { onConflict: "user_id,item_key", ignoreDuplicates: true },
    );
    if (error)
      return Response.json(
        { error: "Couldn’t save your lesson. Retry." },
        { status: 503 },
      );
    ctx.lessons.push(body.subject);
  } else if (body.action === "answer") {
    const q = plan.blocks
      .flatMap((b) => b.questions)
      .find((q) => q.id === body.questionId);
    if (
      !q ||
      !Number.isInteger(body.chosen) ||
      body.chosen < 0 ||
      body.chosen > 3
    )
      return Response.json(
        { error: "Choose a valid answer." },
        { status: 400 },
      );
    const id = dailyId(`${user.id}:${plan.id}:${q.id}`);
    if (ctx.answers[q.id] !== undefined && ctx.answers[q.id] !== body.chosen)
      return Response.json(
        { error: "This answer is already saved. Reload to review it." },
        { status: 409 },
      );
    const event = {
      id,
      questionId: q.id,
      chosen: body.chosen,
      elapsedMs: Math.min(86400000, Math.max(0, Number(body.elapsedMs) || 0)),
      confidence: "medium",
      cause: null,
      at: new Date().toISOString(),
      mode: "drill",
    };
    const { error } = await db.from("exam_attempts").insert({
      id,
      user_id: user.id,
      exam_id:
        q.subject === "english" ? "daily:english" : `practice:${q.subject}`,
      answers: { kind: "answer", event, dailyPlanId: plan.id } as Json,
      raw_correct: body.chosen === q.answer ? 1 : 0,
      raw_total: 1,
      scale_score: 0,
      duration_seconds: Math.round(event.elapsedMs / 1000),
    });
    if (error && error.code !== "23505")
      return Response.json(
        { error: "Couldn’t save your answer. Retry before continuing." },
        { status: 503 },
      );
    if (error?.code === "23505") {
      const { data: existing, error: readError } = await db
        .from("exam_attempts")
        .select("answers")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (
        readError ||
        (existing?.answers as unknown as { event: { chosen: number } })?.event
          .chosen !== body.chosen
      )
        return Response.json(
          {
            error: "This answer was saved in another tab. Reload to review it.",
          },
          { status: 409 },
        );
    }
    ctx.answers[q.id] = body.chosen;
  } else return Response.json({ error: "Unknown action." }, { status: 400 });
  if (dailyComplete(plan, ctx.answers, ctx.lessons)) {
    const { error } = await db
      .from("exam_attempts")
      .update({
        answers: {
          ...plan,
          complete: true,
          completedDate: today,
        } as unknown as Json,
      })
      .eq("id", plan.id)
      .eq("user_id", user.id);
    if (error)
      return Response.json(
        { error: "Your answers saved, but completion could not save. Retry." },
        { status: 503 },
      );
  }
  return GET();
}
