import {
  validateStudySettings,
  type StudySettings,
} from "@/lib/account-settings";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ProfilePatchBody {
  display_name?: string | null;
  current_score?: number | null;
  target_score?: number | null;
  test_date?: string | null;
  study_settings?: StudySettings;
}

function isValidDateStr(s: string): boolean {
  const date = new Date(s + "T12:00:00Z");
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === s
  );
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: ProfilePatchBody;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    body = value;
  } catch {
    return NextResponse.json(
      { error: "Send valid account settings." },
      { status: 400 },
    );
  }
  const update: Omit<ProfilePatchBody, "study_settings"> = {};
  const settings =
    "study_settings" in body
      ? validateStudySettings(body.study_settings)
      : undefined;
  if (settings === null)
    return NextResponse.json(
      {
        error:
          "Section scores must be blank or whole numbers from 1 to 36, and study time must be 60, 75, or 90 minutes.",
      },
      { status: 400 },
    );
  if (
    settings &&
    "current_score" in body &&
    body.current_score !== settings.scores.english
  )
    return NextResponse.json(
      { error: "English score values must agree." },
      { status: 400 },
    );

  if ("display_name" in body) {
    if (body.display_name !== null && typeof body.display_name !== "string") {
      return NextResponse.json(
        { error: "display_name must be a string or null" },
        { status: 400 },
      );
    }
    update.display_name = body.display_name;
  }

  if ("current_score" in body) {
    const v = body.current_score;
    if (
      v !== null &&
      v !== undefined &&
      (!Number.isInteger(v) || v < 1 || v > 36)
    ) {
      return NextResponse.json(
        { error: "current_score must be an integer 1-36" },
        { status: 400 },
      );
    }
    update.current_score = v ?? null;
  }

  if ("target_score" in body) {
    const v = body.target_score;
    if (
      v === undefined ||
      (v !== null && (!Number.isInteger(v) || v < 1 || v > 36))
    ) {
      return NextResponse.json(
        { error: "target_score must be an integer 1-36" },
        { status: 400 },
      );
    }
    update.target_score = v;
  }

  if ("test_date" in body) {
    const v = body.test_date;
    if (v !== null && (typeof v !== "string" || !isValidDateStr(v))) {
      return NextResponse.json(
        { error: "test_date must be a valid YYYY-MM-DD date" },
        { status: 400 },
      );
    }
    update.test_date = v;
  }

  if (settings) update.current_score = settings.scores.english;
  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (settings) {
    const { error: settingsError } = await supabase.auth.updateUser({
      data: { act_study_settings: settings },
    });
    if (settingsError)
      return NextResponse.json(
        {
          error:
            "Your goal and test date saved, but section scores and study time could not finish saving. Please retry.",
        },
        { status: 503 },
      );
  }
  return NextResponse.json(data);
}
