import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authReturnPath } from "@/lib/auth-redirect";

// Supabase email-confirmation and magic-link redirects land here with a `code`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = authReturnPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-error`);
}
