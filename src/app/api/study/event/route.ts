import { createClient } from "@/lib/supabase/server";
import { cloudInsert, validateCloudRecord } from "@/lib/act/cloud-records";
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in again before saving." },
      { status: 401 },
    );
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return Response.json({ error: "Invalid body." }, { status: 400 });
  if (body.ownerId !== user.id)
    return Response.json(
      { error: "The signed-in account changed. Reload before continuing." },
      { status: 409 },
    );
  const record = validateCloudRecord(body.record);
  if (!record)
    return Response.json(
      { error: "Invalid practice record." },
      { status: 400 },
    );
  const insert = cloudInsert(record, user.id);
  const previous = await supabase
    .from("exam_attempts")
    .select("exam_id, answers")
    .eq("id", insert.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (previous.error)
    return Response.json(
      { error: "Saved practice could not be checked." },
      { status: 503 },
    );
  if (previous.data) {
    const saved = validateCloudRecord(previous.data.answers);
    if (
      !saved ||
      saved.kind !== record.kind ||
      previous.data.exam_id !== insert.exam_id
    )
      return Response.json({ error: "Practice ID conflict." }, { status: 409 });
    if (saved.kind === "exam") return Response.json({ ok: true });
    if (
      record.kind !== "answer" ||
      saved.event.questionId !== record.event.questionId ||
      saved.event.chosen !== record.event.chosen
    )
      return Response.json(
        { error: "A saved answer cannot be replaced." },
        { status: 409 },
      );
    // Only mistake classification may change after an answer is saved.
    insert.answers = {
      ...saved,
      event: { ...saved.event, cause: record.event.cause },
    };
    const { error } = await supabase
      .from("exam_attempts")
      .update({ answers: insert.answers })
      .eq("id", insert.id)
      .eq("user_id", user.id);
    return error
      ? Response.json(
          { error: "Your mistake cause was not saved." },
          { status: 503 },
        )
      : Response.json({ ok: true });
  }
  const { error } = await supabase.from("exam_attempts").insert(insert);
  if (error?.code === "23505") {
    const replay = await supabase
      .from("exam_attempts")
      .select("exam_id, answers")
      .eq("id", insert.id)
      .eq("user_id", user.id)
      .maybeSingle();
    const saved = replay.data && validateCloudRecord(replay.data.answers);
    if (
      !replay.error &&
      saved &&
      saved.kind === record.kind &&
      replay.data?.exam_id === insert.exam_id &&
      (saved.kind === "exam" ||
        (record.kind === "answer" &&
          saved.event.questionId === record.event.questionId &&
          saved.event.chosen === record.event.chosen))
    )
      return Response.json({ ok: true });
    return Response.json(
      { error: "Practice ID conflict. Reload before continuing." },
      { status: 409 },
    );
  }
  return error
    ? Response.json(
        { error: "Your practice was not saved. Retry before leaving." },
        { status: 503 },
      )
    : Response.json({ ok: true });
}
