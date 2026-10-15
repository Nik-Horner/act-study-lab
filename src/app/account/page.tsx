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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error)
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Account unavailable</h1>
        <p role="alert">
          Your settings couldn’t load. Reload before making changes.
        </p>
        <a
          href="/account"
          className="inline-flex min-h-11 items-center text-brand underline"
        >
          Reload account
        </a>
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-ink-faint">{user.email}</p>
      <AccountForm
        key={user.id}
        variant="settings"
        initial={{
          ownerId: user.id,
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
