import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PlanCheckBody {
  itemKey?: string;
  checked?: boolean;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as PlanCheckBody;
  const { itemKey, checked } = body;

  if (typeof itemKey !== "string" || !itemKey || typeof checked !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (checked) {
    const { error } = await supabase.from("plan_checks").upsert({ user_id: user.id, item_key: itemKey });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("plan_checks")
      .delete()
      .eq("user_id", user.id)
      .eq("item_key", itemKey);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
