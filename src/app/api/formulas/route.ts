import { createClient } from "@/lib/supabase/server";
import { dailyDate } from "@/lib/daily-date";
import { formulaPacketId, loadFormulaDay } from "@/lib/formula-server";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    typeof body.cardId !== "string" ||
    !["again", "remembered"].includes(body.rating)
  )
    return Response.json(
      { error: "Choose a valid formula rating." },
      { status: 400 },
    );
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to save your formulas." },
      { status: 401 },
    );
  if (body.ownerId !== user.id)
    return Response.json(
      { error: "Your account changed. Reload before continuing." },
      { status: 409 },
    );
  const today = dailyDate();
  if (body.date !== today)
    return Response.json(
      { error: "A new study day started. Reload to continue." },
      { status: 409 },
    );
  const profile = await db
    .from("profiles")
    .select("test_date")
    .eq("id", user.id)
    .maybeSingle();
  if (profile.error)
    return Response.json(
      { error: "Your test date could not load. Retry." },
      { status: 503 },
    );
  if (!profile.data?.test_date)
    return Response.json(
      { error: "Set your test date in Account first." },
      { status: 409 },
    );
  try {
    const loaded = await loadFormulaDay(
      db,
      user.id,
      today,
      profile.data.test_date,
    );
    let day = loaded.day;
    if (!day.ids.includes(body.cardId))
      return Response.json(
        { error: "This formula is not in today’s review. Reload." },
        { status: 409 },
      );
    if (!loaded.saved) {
      const packet = await db.from("exam_attempts").insert({
        id: formulaPacketId(user.id, today),
        user_id: user.id,
        exam_id: "formula:daily",
        answers: { date: today, ids: day.ids },
        raw_correct: 0,
        raw_total: 0,
        scale_score: 0,
        duration_seconds: 0,
      });
      if (packet.error && packet.error.code !== "23505")
        throw new Error("Couldn’t start your formula review. Retry.");
      if (packet.error) {
        ({ day } = await loadFormulaDay(
          db,
          user.id,
          today,
          profile.data.test_date,
        ));
        if (!day.ids.includes(body.cardId))
          return Response.json(
            { error: "Your formula review changed in another tab. Reload." },
            { status: 409 },
          );
      }
    }
    if (body.rating === "again" && !day.remaining.includes(body.cardId))
      return Response.json(
        {
          error:
            "This formula was already finished in another tab. Reload to continue.",
        },
        { status: 409 },
      );
    const result = await db.from("plan_checks").upsert(
      {
        user_id: user.id,
        item_key: `formula:${body.cardId}:${body.rating === "remembered" ? "recall" : "miss"}:${today}`,
      },
      { onConflict: "user_id,item_key", ignoreDuplicates: true },
    );
    if (result.error)
      throw new Error(
        "Your formula rating did not save. Retry before continuing.",
      );
    const updated = await loadFormulaDay(
      db,
      user.id,
      today,
      profile.data.test_date,
    );
    return Response.json(
      { userId: user.id, formulas: updated.day },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Your formula review could not save. Retry.",
      },
      { status: 503 },
    );
  }
}
