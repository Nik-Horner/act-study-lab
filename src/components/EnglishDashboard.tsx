import { readStudySettings, hasSavedStudyTime } from "@/lib/account-settings";
import { createClient } from "@/lib/supabase/server";
import { getTopics, getQuestions } from "@/lib/content";
import { topicStatus } from "@/lib/mastery";
import { AccountForm } from "./AccountForm";
import { EnglishProgressError } from "./EnglishProgressError";
import { loadEnglishProgress } from "@/lib/english-progress-server";
import { getLearningSkills } from "@/lib/learning-skills";
import { SubjectOverview } from "./SubjectOverview";

export default async function EnglishDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // the proxy already gates this route to logged-in users
  }

  let loaded;
  try {
    const [profile, progress] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      loadEnglishProgress(supabase, user.id),
    ]);
    if (profile.error) throw new Error("Progress unavailable");
    loaded = {
      profile: profile.data,
      progressRows: progress.progress,
    };
  } catch {
    return <EnglishProgressError href="/study/english" />;
  }
  const { profile, progressRows } = loaded;

  if (!profile || profile.target_score === null || profile.test_date === null) {
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
  }

  const topics = getTopics().map((topic) => {
    const row = progressRows.find((record) => record.topic_slug === topic.slug);
    return {
      ...topic,
      attempts: row?.attempts ?? 0,
      accuracy: row?.attempts ? row.correct / row.attempts : null,
      milestone: topicStatus(row) === "mastered",
    };
  });
  return (
    <SubjectOverview
      subject="english"
      topics={topics}
      skillCount={getLearningSkills(undefined, "english").length}
      questions={getTopics().reduce(
        (total, topic) => total + getQuestions(topic.slug).length,
        0,
      )}
    />
  );
}
