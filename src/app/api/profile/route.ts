import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ProfilePatchBody {
  display_name?: string | null;
  target_score?: number | null;
  test_date?: string | null;
}

function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T00:00:00").getTime());
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as ProfilePatchBody;
  const update: ProfilePatchBody = {};

  if ("display_name" in body) {
    if (body.display_name !== null && typeof body.display_name !== "string") {
      return NextResponse.json({ error: "display_name must be a string or null" }, { status: 400 });
    }
    update.display_name = body.display_name;
  }

  if ("target_score" in body) {
    const v = body.target_score;
    if (v === undefined || (v !== null && (!Number.isInteger(v) || v < 1 || v > 36))) {
      return NextResponse.json({ error: "target_score must be an integer 1-36" }, { status: 400 });
    }
    update.target_score = v;
  }

  if ("test_date" in body) {
    const v = body.test_date;
    if (v !== null && (typeof v !== "string" || !isValidDateStr(v))) {
      return NextResponse.json({ error: "test_date must be a valid YYYY-MM-DD date" }, { status: 400 });
    }
    update.test_date = v;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
