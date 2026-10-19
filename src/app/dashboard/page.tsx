import { createClient } from "@/lib/supabase/server";
import { readStudySettings, hasSavedStudyTime } from "@/lib/account-settings";
import { AccountForm } from "@/components/AccountForm";
import { DailyStudy } from "@/components/DailyStudy";
export default async function DashboardPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Your account could not load. Retry.");
  if (!profile?.test_date || !profile.target_score)
    return (
      <AccountForm
        key={user.id}
        variant="onboarding"
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
          study_time_set: hasSavedStudyTime(user.user_metadata),
        }}
      />
    );
  return <DailyStudy />;
}
