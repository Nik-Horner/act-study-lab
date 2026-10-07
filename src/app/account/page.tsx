import { readStudySettings } from "@/lib/account-settings";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/AccountForm";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // the proxy already gates this route to logged-in users
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-ink-faint">{user.email}</p>
      <AccountForm
        variant="settings"
        initial={{
          display_name: profile?.display_name ?? null,
          current_score: profile?.current_score ?? null,
          target_score: profile?.target_score ?? null,
          test_date: profile?.test_date ?? null,
          study_settings: readStudySettings(
            user.user_metadata,
            profile?.current_score ?? null,
          ),
        }}
      />
    </div>
  );
}
