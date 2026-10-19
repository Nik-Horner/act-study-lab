import { createClient } from "@/lib/supabase/server";
import {
  CAMPAIGN_RECORD,
  campaignCatalog,
  campaignMission,
  campaignMove,
  campaignRecordId,
  campaignSnapshot,
  newCampaignState,
  readCampaignState,
} from "@/lib/campaign";
import type { CampaignAction } from "@/lib/campaign-types";
import type { Json } from "@/lib/supabase/database.types";

export async function GET(request: Request) {
  const db = await createClient(),
    {
      data: { user },
    } = await db.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in before loading your campaign." },
      { status: 401 },
    );
  const query = new URL(request.url).searchParams;
  if (query.get("ownerId") !== user.id)
    return Response.json(
      { error: "The signed-in account changed. Reload before continuing." },
      { status: 409 },
    );
  const missionId = query.get("mission");
  if (missionId) {
    if (!campaignMission(missionId))
      return Response.json({ error: "Unknown mission." }, { status: 404 });
    const { data, error } = await db
      .from("exam_attempts")
      .select("answers")
      .eq("user_id", user.id)
      .eq("exam_id", CAMPAIGN_RECORD)
      .eq("id", await campaignRecordId(user.id, missionId))
      .maybeSingle();
    if (error)
      return Response.json(
        { error: "Your mission could not load. Retry." },
        { status: 503 },
      );
    const state = data ? readCampaignState(data.answers) : null;
    if (data && (!state || state.missionId !== missionId))
      return Response.json(
        {
          error:
            "Your saved mission needs attention. No progress was replaced.",
        },
        { status: 409 },
      );
    return Response.json(campaignSnapshot(missionId, state));
  }
  const { data, error } = await db
    .from("exam_attempts")
    .select("id,answers")
    .eq("user_id", user.id)
    .eq("exam_id", CAMPAIGN_RECORD)
    .limit(campaignCatalog().length);
  if (error)
    return Response.json(
      { error: "Campaign progress could not load. Retry." },
      { status: 503 },
    );
  const states = [];
  for (const row of data ?? []) {
    const state = readCampaignState(row.answers);
    if (!state || row.id !== (await campaignRecordId(user.id, state.missionId)))
      return Response.json(
        {
          error:
            "A campaign record could not be read. Saved progress is unchanged.",
        },
        { status: 409 },
      );
    const snapshot = campaignSnapshot(state.missionId, state);
    states.push({
      missionId: state.missionId,
      cursor: state.cursor,
      completed: !!state.completedAt,
      correct: snapshot.correct,
      stars: snapshot.stars,
    });
  }
  return Response.json({ states });
}

export async function POST(request: Request) {
  const db = await createClient(),
    {
      data: { user },
    } = await db.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in before saving your move." },
      { status: 401 },
    );
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return Response.json({ error: "Invalid move." }, { status: 400 });
  if (body.ownerId !== user.id)
    return Response.json(
      { error: "The signed-in account changed. Reload before continuing." },
      { status: 409 },
    );
  if (
    !campaignMission(body.missionId) ||
    !["start", "answer", "next"].includes(body.action)
  )
    return Response.json(
      { error: "Unknown mission or move." },
      { status: 400 },
    );
  const id = await campaignRecordId(user.id, body.missionId);
  const load = () =>
    db
      .from("exam_attempts")
      .select("answers")
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("exam_id", CAMPAIGN_RECORD)
      .maybeSingle();
  const previous = await load();
  if (previous.error)
    return Response.json(
      { error: "Your saved move could not be checked. Retry." },
      { status: 503 },
    );
  if (!previous.data) {
    if (body.action !== "start")
      return Response.json(
        { error: "Start the mission before answering." },
        { status: 409 },
      );
    const state = newCampaignState(body.missionId),
      snapshot = campaignSnapshot(body.missionId, state);
    const saved = await db
      .from("exam_attempts")
      .insert({
        id,
        user_id: user.id,
        exam_id: CAMPAIGN_RECORD,
        answers: state as unknown as Json,
        raw_correct: 0,
        raw_total: snapshot.questions.length,
        scale_score: 0,
      });
    if (saved.error?.code === "23505") {
      const replay = await load(),
        existing = replay.data && readCampaignState(replay.data.answers);
      if (replay.error || !existing || existing.missionId !== body.missionId)
        return Response.json(
          { error: "Your mission could not be confirmed. Retry." },
          { status: 503 },
        );
      return Response.json(campaignSnapshot(body.missionId, existing));
    }
    return saved.error
      ? Response.json(
          { error: "Mission not saved. Retry before continuing." },
          { status: 503 },
        )
      : Response.json(snapshot);
  }
  const state = readCampaignState(previous.data.answers);
  if (!state || state.missionId !== body.missionId)
    return Response.json(
      {
        error:
          "Your saved mission could not be read. It has not been overwritten.",
      },
      { status: 409 },
    );
  // A response lost in transit may be retried, without changing the original choice.
  if (
    state.revision === body.revision + 1 &&
    ((body.action === "answer" &&
      state.answers[state.cursor]?.choice === body.choice) ||
      (body.action === "next" &&
        state.cursor > 0 &&
        !state.answers[state.cursor]))
  )
    return Response.json(campaignSnapshot(body.missionId, state));
  const next = campaignMove(state, body as CampaignAction);
  if (!next)
    return Response.json(
      {
        error:
          "This move is invalid or another tab moved ahead. Reload the saved mission.",
      },
      { status: 409 },
    );
  if (next === state)
    return Response.json(campaignSnapshot(body.missionId, state));
  const snapshot = campaignSnapshot(body.missionId, next);
  const saved = await db
    .from("exam_attempts")
    .update({
      answers: next as unknown as Json,
      raw_correct: snapshot.correct,
      completed_at: next.completedAt ?? next.startedAt,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("exam_id", CAMPAIGN_RECORD)
    .eq("answers->>revision", String(state.revision))
    .select("id");
  if (saved.error)
    return Response.json(
      { error: "Your move has not been confirmed. Retry before leaving." },
      { status: 503 },
    );
  if (!saved.data?.length)
    return Response.json(
      {
        error:
          "Another tab saved a move first. Reload the mission to continue.",
      },
      { status: 409 },
    );
  return Response.json(snapshot);
}
