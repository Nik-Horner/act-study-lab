import { createClient } from "@/lib/supabase/server";
import { readStudySettings } from "@/lib/account-settings";
import {
  dailyDate,
  makeDailyPlan,
  dailyCoverage,
  dailyId,
  selectDailyPlan,
  dailyComplete,
  restoreDailyTeaching,
  refreshDailyContent,
  type DailyPlan,
} from "@/lib/daily-plan";
import {
  dailyStep,
  blockUnits,
  dailyFocus,
  dailyReviewKey,
  readingConceptProgress,
  dailyConcepts,
} from "@/lib/daily-flow";
import type { Json } from "@/lib/supabase/database.types";
import {
  ENGLISH_PRACTICE_ID,
  validateEnglishDrillAnswer,
} from "@/lib/english-drill-answer";
async function load(fullHistory = false) {
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
  const readPlans = (limit: number) =>
    db
      .from("exam_attempts")
      .select("*")
      .eq("user_id", user.id)
      .eq("exam_id", "daily:plan")
      .order("completed_at", { ascending: false })
      .limit(limit);
  let { data: plans, error } = await readPlans(1);
  const newest = plans?.[0]?.answers as unknown as DailyPlan | undefined;
  // Current plans snapshot prior coverage; only legacy plans need bootstrap history.
  if (!error && newest && !Array.isArray(newest.course?.coveredUnits)) {
    ({ data: plans, error } = await readPlans(100));
  }
  if (error)
    return {
      error: Response.json(
        { error: "Your daily lesson could not load. Retry." },
        { status: 503 },
      ),
    };
  let last = plans?.[0]?.answers as unknown as DailyPlan | undefined;
  const seen = new Set(last?.previouslyAnsweredQuestions ?? []);
  const priorSeen = new Set(last?.previouslyAnsweredQuestions ?? []);
  const previousAnswers: Record<string, number> = {};
  const previousTimes: Record<string, number> = {};
  const previousUncertain: Record<string, boolean> = {};
  for (let offset = 0; ; offset += 500) {
    let query = db
      .from("exam_attempts")
      .select("answers")
      .eq("user_id", user.id)
      .in("exam_id", [
        ENGLISH_PRACTICE_ID,
        "daily:english",
        "practice:math",
        "practice:reading",
        "practice:science",
      ])
      .order("completed_at")
      .order("id");
    // Existing plans already snapshot prior answers; only load the full history for a new plan.
    if (
      !fullHistory &&
      last?.previouslyAnsweredQuestions &&
      (!last.complete || last.date === today)
    )
      query = query.contains("answers", { dailyPlanId: last.id });
    const page = await query.range(offset, offset + 499);
    if (page.error)
      return {
        error: Response.json(
          { error: "Your answer history could not load. Retry." },
          { status: 503 },
        ),
      };
    for (const row of page.data ?? []) {
      const english = validateEnglishDrillAnswer(row.answers);
      if (english) {
        seen.add(english.questionId);
        priorSeen.add(english.questionId);
        continue;
      }
      const record = row.answers as unknown as {
        kind?: string;
        dailyPlanId?: string;
        event?: {
          questionId?: string;
          chosen?: number;
          elapsedMs?: number;
          confidence?: string;
        };
      };
      const event = record?.event;
      if (
        record?.kind !== "answer" ||
        typeof event?.questionId !== "string" ||
        !Number.isInteger(event.chosen) ||
        event.chosen! < 0 ||
        event.chosen! > 3
      )
        continue;
      seen.add(event.questionId);
      if (record.dailyPlanId !== last?.id) {
        priorSeen.add(event.questionId);
        continue;
      }
      previousAnswers[event.questionId] = event.chosen!;
      if (
        typeof event.elapsedMs === "number" &&
        Number.isFinite(event.elapsedMs) &&
        event.elapsedMs >= 0
      )
        previousTimes[event.questionId] = event.elapsedMs;
      previousUncertain[event.questionId] = event.confidence === "low";
    }
    if (!page.data || page.data.length < 500) break;
    if (offset >= 99500)
      return {
        error: Response.json(
          {
            error:
              "This answer history is too large to load safely. Contact support.",
          },
          { status: 413 },
        ),
      };
  }
  if (last && !last.previouslyAnsweredQuestions)
    last = { ...last, previouslyAnsweredQuestions: [...priorSeen] };
  if (last?.complete)
    last = {
      ...last,
      nextFocus: dailyFocus(
        last,
        previousAnswers,
        previousTimes,
        previousUncertain,
      ),
    };
  const settings = readStudySettings(user.user_metadata, profile.current_score);
  const course = {
    testDate: profile.test_date,
    targetScore: profile.target_score,
    seenQuestions: [...seen],
    coveredUnits: [
      ...new Set(
        (plans ?? []).flatMap((row) => {
          const previous = row.answers as unknown as DailyPlan;
          return [
            ...(previous.course?.coveredUnits ?? []),
            ...(previous.complete
              ? previous.blocks
                  .flatMap(blockUnits)
                  .map((unit) => unit.courseId ?? unit.id)
              : []),
          ];
        }),
      ),
    ],
  };
  const selected = selectDailyPlan(
    last,
    user.id,
    today,
    settings,
    false,
    course,
  );
  const saved = selected === last;
  let plan = selected;
  const { data: checks, error: checkError } = await db
    .from("plan_checks")
    .select("*")
    .eq("user_id", user.id)
    .or(`item_key.eq.daily-clock:${today},item_key.like.daily:${plan.id}:%`);
  if (checkError)
    return {
      error: Response.json(
        { error: "Saved daily progress could not load. Retry." },
        { status: 503 },
      ),
    };
  const answers = saved ? previousAnswers : {};
  const answerTimes = saved ? previousTimes : {};
  const uncertainAnswers = saved ? previousUncertain : {};
  plan = refreshDailyContent(
    restoreDailyTeaching(plan, answers, settings),
    answers,
  );
  const lessons = readingConceptProgress(
    plan,
    (checks ?? []).flatMap((c) => {
      const prefix = `daily:${plan.id}:step:`;
      if (c.item_key.startsWith(prefix))
        return [c.item_key.slice(prefix.length)];
      const block = plan.blocks.find(
        (b) => c.item_key === `daily:${plan.id}:lesson:v2:${b.subject}`,
      );
      return block ? [blockUnits(block)[0].id] : [];
    }),
  );
  // Recover a completed session if the final completion write was interrupted.
  if (!plan.complete && dailyComplete(plan, answers, lessons)) {
    const finishedAt = (checks ?? [])
      .filter((c) => c.item_key.startsWith(`daily:${plan.id}:step:`))
      .map((c) => c.checked_at)
      .sort()
      .at(-1);
    const { error: completionError } = await db
      .from("exam_attempts")
      .update({
        answers: {
          ...plan,
          complete: true,
          completedDate: finishedAt
            ? dailyDate(new Date(finishedAt))
            : plan.date,
          nextFocus: dailyFocus(plan, answers, answerTimes, uncertainAnswers),
        } as unknown as Json,
      })
      .eq("id", plan.id)
      .eq("user_id", user.id);
    if (completionError)
      return {
        error: Response.json(
          { error: "Your completed lesson could not refresh. Retry." },
          { status: 503 },
        ),
      };
    return load();
  }
  // Upgrade today's course while keeping answer records, lesson checkpoints, and clock.
  if (
    saved &&
    !plan.complete &&
    (!plan.plannerVersion || !plan.course) &&
    plan.date === today
  ) {
    const completed = plan.blocks
      .flatMap(blockUnits)
      .filter(
        (unit) =>
          lessons.includes(unit.id) &&
          unit.questions.every(
            (question) => answers[question.id] !== undefined,
          ),
      );
    const updatedCourse = {
      ...course,
      coveredUnits: [
        ...new Set([
          ...course.coveredUnits,
          ...completed.map((unit) => unit.courseId ?? unit.id),
        ]),
      ],
    };
    const upgraded = { ...plan, course: updatedCourse, plannerVersion: 2 };
    const { error: refreshError } = await db
      .from("exam_attempts")
      .update({ answers: upgraded as unknown as Json })
      .eq("id", plan.id)
      .eq("user_id", user.id);
    if (refreshError)
      return {
        error: Response.json(
          { error: "Today's course plan could not refresh. Retry." },
          { status: 503 },
        ),
      };
    return load();
  }
  if (plan.complete)
    for (const block of plan.blocks)
      lessons.push(
        ...blockUnits(block).map((u) => u.id),
        dailyReviewKey(block),
      );
  if (
    saved &&
    !plan.complete &&
    plan.course &&
    (last?.plannerVersion ?? 0) < 2
  ) {
    const { error: migrationError } = await db
      .from("exam_attempts")
      .update({ answers: plan as unknown as Json })
      .eq("id", plan.id)
      .eq("user_id", user.id);
    if (migrationError)
      return {
        error: Response.json(
          { error: "Your focused daily lesson could not refresh. Retry." },
          { status: 503 },
        ),
      };
    return load();
  }
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
    uncertainAnswers,
    lessons,
    deadline: clock ? Date.parse(clock) + settings.minutesPerDay * 60000 : null,
    settings,
    course,
  };
}
function dailyResponse(
  ctx: Awaited<ReturnType<typeof load>>,
  includeCoverage = false,
) {
  if (ctx.error) return ctx.error;
  return Response.json(
    {
      userId: ctx.user.id,
      plan: ctx.plan,
      saved: ctx.saved,
      answers: ctx.answers,
      answerTimes: ctx.answerTimes,
      uncertainAnswers: ctx.uncertainAnswers,
      lessons: ctx.lessons,
      deadline: ctx.deadline,
      today: ctx.today,
      minutes: ctx.settings.minutesPerDay,
      includeScience: ctx.settings.includeScience !== false,
      goal: {
        targetScore: ctx.course.targetScore,
        testDate: ctx.course.testDate,
      },
      ...(includeCoverage && {
        coverage: dailyCoverage(
          ctx.plan,
          ctx.settings,
          ctx.course,
          ctx.today,
          ctx.saved,
        ),
      }),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function GET() {
  return dailyResponse(await load(), true);
}
export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return Response.json({ error: "Invalid request." }, { status: 400 });
  const ctx = await load(body.action === "next");
  if (ctx.error) return ctx.error;
  const { db, user, today } = ctx;
  let plan = ctx.plan;
  if (body.planId !== plan.id)
    return Response.json(
      { error: "Your daily lesson changed. Reload to continue." },
      { status: 409 },
    );
  if (body.action === "next") {
    if (plan.date >= today || plan.complete)
      return Response.json(
        { error: "Today’s lesson is already selected." },
        { status: 409 },
      );
    const coveredUnits = [
      ...new Set([
        ...ctx.course.coveredUnits,
        ...plan.blocks
          .flatMap(blockUnits)
          .filter(
            (unit) =>
              ctx.lessons.includes(unit.id) &&
              unit.questions.every(
                (question) => ctx.answers[question.id] !== undefined,
              ),
          )
          .map((unit) => unit.courseId ?? unit.id),
      ]),
    ];
    plan = selectDailyPlan(
      {
        ...plan,
        nextFocus: dailyFocus(
          plan,
          ctx.answers,
          ctx.answerTimes,
          ctx.uncertainAnswers,
        ),
      },
      user.id,
      today,
      ctx.settings,
      true,
      {
        ...ctx.course,
        coveredUnits,
        deferUnits: plan.blocks
          .flatMap(blockUnits)
          .map((unit) => unit.courseId ?? unit.id)
          .filter((id) => !coveredUnits.includes(id)),
      },
    );
  }
  if (body.action === "start" || body.action === "next") {
    if (!ctx.saved || body.action === "next") {
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
  const step = dailyStep(plan, ctx.answers, ctx.lessons);
  if (
    body.action === "concept" ||
    body.action === "lesson" ||
    body.action === "review"
  ) {
    const reviewBlock = plan.blocks.find(
      (block) => block.subject === body.subject,
    );
    const key =
      body.action === "review"
        ? reviewBlock
          ? dailyReviewKey(reviewBlock)
          : null
        : body.action === "concept"
          ? `${body.unitId}:concept:${body.index}`
          : body.unitId;
    const expected =
      step.kind === "lesson"
        ? body.action === "concept"
          ? `${step.unit.id}:concept:${body.index}`
          : step.unit.id
        : step.kind === "review"
          ? dailyReviewKey(step.block)
          : null;
    if (!key || (key !== expected && !ctx.lessons.includes(key)))
      return Response.json(
        {
          error:
            "Finish the current lesson, drill, and review before moving on.",
        },
        { status: 409 },
      );
    const keys = [key];
    if (body.action === "concept") {
      const unit = plan.blocks
        .flatMap(blockUnits)
        .find((u) => u.id === body.unitId);
      const concepts = unit ? dailyConcepts(unit) : [];
      const position = concepts.indexOf(body.index);
      if (
        !unit ||
        !Number.isInteger(body.index) ||
        position < 0 ||
        concepts
          .slice(0, position)
          .some((i) => !ctx.lessons.includes(`${unit.id}:concept:${i}`))
      )
        return Response.json(
          { error: "Continue through the lesson in order." },
          { status: 409 },
        );
      if (position === concepts.length - 1) keys.push(unit.id);
    }
    if (body.action === "lesson" && !ctx.lessons.includes(key)) {
      const unit = plan.blocks.flatMap(blockUnits).find((u) => u.id === key);
      if (
        !unit ||
        dailyConcepts(unit).some(
          (i) => !ctx.lessons.includes(`${unit.id}:concept:${i}`),
        )
      )
        return Response.json(
          { error: "Finish the lesson concepts before its quick check." },
          { status: 409 },
        );
    }
    const { error } = await db.from("plan_checks").upsert(
      keys.map((key) => ({
        user_id: user.id,
        item_key: `daily:${plan.id}:step:${key}`,
      })),
      { onConflict: "user_id,item_key", ignoreDuplicates: true },
    );
    if (error)
      return Response.json(
        { error: "Couldn’t save your progress. Retry." },
        { status: 503 },
      );
    ctx.lessons.push(...keys);
  } else if (body.action === "answer") {
    const q = plan.blocks
      .flatMap((b) => [...b.questions, ...(b.historicalQuestions ?? [])])
      .find((q) => q.id === body.questionId);
    if (
      !q ||
      !Number.isInteger(body.chosen) ||
      body.chosen < 0 ||
      body.chosen > 3 ||
      (body.uncertain !== undefined && typeof body.uncertain !== "boolean")
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
    let event = {
      id,
      questionId: q.id,
      chosen: body.chosen,
      elapsedMs: Math.min(86400000, Math.max(0, Number(body.elapsedMs) || 0)),
      confidence: body.uncertain ? "low" : "medium",
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
      event = (existing!.answers as unknown as { event: typeof event }).event;
    }
    ctx.answers[q.id] = body.chosen;
    ctx.answerTimes[q.id] = event.elapsedMs;
    ctx.uncertainAnswers[q.id] = event.confidence === "low";
  } else return Response.json({ error: "Unknown action." }, { status: 400 });
  ctx.lessons = readingConceptProgress(plan, ctx.lessons);
  if (dailyComplete(plan, ctx.answers, ctx.lessons)) {
    const { error } = await db
      .from("exam_attempts")
      .update({
        answers: {
          ...plan,
          complete: true,
          completedDate: today,
          nextFocus: dailyFocus(
            plan,
            ctx.answers,
            ctx.answerTimes,
            ctx.uncertainAnswers,
          ),
        } as unknown as Json,
      })
      .eq("id", plan.id)
      .eq("user_id", user.id);
    if (error)
      return Response.json(
        { error: "Your answers saved, but completion could not save. Retry." },
        { status: 503 },
      );
    return GET();
  }
  return dailyResponse(ctx);
}
