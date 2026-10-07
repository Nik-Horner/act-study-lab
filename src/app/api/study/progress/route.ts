import { createClient } from "@/lib/supabase/server";
import { hydrateCloudState, PRACTICE_EXAM_IDS } from "@/lib/act/cloud-records";
import type { Tables } from "@/lib/supabase/database.types";
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Sign in to load your saved progress." },
      { status: 401 },
    );
  let timeZone =
    new URL(request.url).searchParams.get("timeZone") ?? "America/Chicago";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    timeZone = "America/Chicago";
  }
  const [profile, checks] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("plan_checks").select("*").eq("user_id", user.id),
  ]);
  if (profile.error || checks.error)
    return Response.json(
      { error: "Your account progress could not be loaded. Please retry." },
      { status: 503 },
    );
  if (!profile.data?.test_date || !profile.data.target_score)
    return Response.json(
      {
        error:
          "Set your target and test date in Account settings before starting.",
      },
      { status: 409 },
    );
  const rows: Tables<"exam_attempts">[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("user_id", user.id)
      .in("exam_id", PRACTICE_EXAM_IDS)
      .order("completed_at")
      .order("id")
      .range(offset, offset + 499);
    if (page.error)
      return Response.json(
        { error: "Your practice history could not be loaded. Please retry." },
        { status: 503 },
      );
    rows.push(...(page.data ?? []));
    if (!page.data || page.data.length < 500) break;
    if (offset >= 99500)
      return Response.json(
        {
          error:
            "This practice history is too large to load safely. Contact support.",
        },
        { status: 413 },
      );
  }
  return Response.json(
    {
      userId: user.id,
      state: hydrateCloudState(rows, profile.data, checks.data ?? [], timeZone),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
