import { createClient } from "@/lib/supabase/server";
import { readStudySettings } from "@/lib/account-settings";
import {
  dailyDate,
  dailyId,
  selectDailyPlan,
  dailyComplete,
  restoreDailyTeaching,
  refreshDailyContent,
  type DailyPlan,
} from "@/lib/daily-plan";
import { dailyStep, blockUnits, dailyFocus } from "@/lib/daily-flow";
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
  const selected = selectDailyPlan(last, user.id, today, settings);
  const saved = selected === last;
  let plan = selected;
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
      .or(`item_key.eq.daily-clock:${today},item_key.like.daily:${plan.id}:%`),
  ]);
  if (answerError || checkError)
    return {
      error: Response.json(
        { error: "Saved daily progress could not load. Retry." },
        { status: 503 },
      ),
    };
  const answers: Record<string, number> = {};
  const answerTimes: Record<string, number> = {};
  for (const row of rows ?? []) {
    const record = row.answers as unknown as {
      event: { questionId: string; chosen: number; elapsedMs?: number };
    };
    answers[record.event.questionId] = record.event.chosen;
    if (typeof record.event.elapsedMs === "number")
      answerTimes[record.event.questionId] = record.event.elapsedMs;
  }
  plan = refreshDailyContent(
    restoreDailyTeaching(plan, answers, settings),
    answers,
  );
  const lessons = (checks ?? []).flatMap((c) => {
    const prefix = `daily:${plan.id}:step:`;
    if (c.item_key.startsWith(prefix)) return [c.item_key.slice(prefix.length)];
    const block = plan.blocks.find(
      (b) => c.item_key === `daily:${plan.id}:lesson:v2:${b.subject}`,
    );
    return block ? [blockUnits(block)[0].id] : [];
  });
  if (plan.complete)
    for (const block of plan.blocks)
      lessons.push(
        ...blockUnits(block).map((u) => u.id),
        `review:${block.subject}`,
      );
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
    answerTimes,
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
      answerTimes: ctx.answerTimes,
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
  const step = dailyStep(plan, ctx.answers, ctx.lessons);
  if (
    body.action === "concept" ||
    body.action === "lesson" ||
    body.action === "review"
  ) {
    const key =
      body.action === "review"
        ? `review:${body.subject}`
        : body.action === "concept"
          ? `${body.unitId}:concept:${body.index}`
          : body.unitId;
    const expected =
      step.kind === "lesson"
        ? body.action === "concept"
          ? `${step.unit.id}:concept:${body.index}`
          : step.unit.id
        : step.kind === "review"
          ? `review:${step.block.subject}`
          : null;
    if (!key || (key !== expected && !ctx.lessons.includes(key)))
      return Response.json(
        {
          error:
            "Finish the current lesson, drill, and review before moving on.",
        },
        { status: 409 },
      );
    if (body.action === "concept") {
      const unit = plan.blocks
        .flatMap(blockUnits)
        .find((u) => u.id === body.unitId);
      if (
        !unit ||
        !Number.isInteger(body.index) ||
        body.index < 0 ||
        body.index >= unit.lesson.sections.length ||
        unit.lesson.sections
          .slice(0, body.index)
          .some((_, i) => !ctx.lessons.includes(`${unit.id}:concept:${i}`))
      )
        return Response.json(
          { error: "Continue through the lesson in order." },
          { status: 409 },
        );
    }
    if (body.action === "lesson" && !ctx.lessons.includes(key)) {
      const unit = plan.blocks.flatMap(blockUnits).find((u) => u.id === key);
      if (
        !unit ||
        unit.lesson.sections.some(
          (_, i) => !ctx.lessons.includes(`${unit.id}:concept:${i}`),
        )
      )
        return Response.json(
          { error: "Finish the lesson concepts before its quick check." },
          { status: 409 },
        );
    }
    const { error } = await db
      .from("plan_checks")
      .upsert(
        { user_id: user.id, item_key: `daily:${plan.id}:step:${key}` },
        { onConflict: "user_id,item_key", ignoreDuplicates: true },
      );
    if (error)
      return Response.json(
        { error: "Couldn’t save your progress. Retry." },
        { status: 503 },
      );
    ctx.lessons.push(key);
  } else if (body.action === "answer") {
    const q = plan.blocks
      .flatMap((b) => [...b.questions, ...(b.historicalQuestions ?? [])])
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
    if (
      ctx.answers[q.id] === undefined &&
      (step.kind !== "drill" || step.question.id !== q.id)
    )
      return Response.json(
        { error: "Read the lesson and finish its drill in order." },
        { status: 409 },
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
          nextFocus: dailyFocus(plan, ctx.answers),
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
