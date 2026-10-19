import { getTopic as getActTopic } from "@/lib/act/content";
import { DrillView } from "@/components/act/StudyClient";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getTopic,
  getTopics,
  getQuestions,
  type Question,
} from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { DrillClient, type PoolItem } from "./DrillClient";
import { loadEnglishProgress } from "@/lib/english-progress-server";
import { EnglishProgressError } from "@/components/EnglishProgressError";
import { getLearningSkill, getLearningSkills } from "@/lib/learning-skills";
import { StudyPageHeader } from "@/components/StudyPageHeader";
import { SkillCatalog } from "@/components/SkillCatalog";
import { englishDailyQuestions } from "@/lib/english-daily-content";

export default async function DrillPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ subject?: string; skill?: string }>;
}) {
  const { slug } = await params;
  const { subject, skill: skillId } = await searchParams;
  const skill = skillId && getLearningSkill(slug, skillId);
  if (skillId && !skill) notFound();
  if (
    getActTopic(slug) ||
    (["math", "science", "reading"].includes(subject ?? "") &&
      ["mixed", "hard", "weak", "misses"].includes(slug))
  )
    return (
      <Suspense>
        <DrillView slug={slug} />
      </Suspense>
    );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const topic = getTopic(slug);
  if (!topic && slug !== "weak" && slug !== "misses") notFound();
  if (!user) return null;
  if (topic && !skill && getLearningSkills(slug).length)
    return (
      <div className="mx-auto max-w-5xl space-y-7">
        <StudyPageHeader
          title={`${topic.title} practice`}
          subject="english"
          description="Choose a focused method. Practice questions are separate from its lesson examples and guided check."
          back={{ href: "/study/english", label: "English study" }}
        />
        <SkillCatalog skills={getLearningSkills(slug)} drill />
      </div>
    );
  let history;
  let profile;
  try {
    const [progress, settings] = await Promise.all([
      loadEnglishProgress(supabase, user.id),
      supabase
        .from("profiles")
        .select("current_score, target_score")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    if (settings.error) throw new Error("Settings unavailable");
    history = progress;
    profile = settings.data;
  } catch {
    return (
      <EnglishProgressError
        href={`/drill/${slug}${skillId ? `?skill=${encodeURIComponent(skillId)}` : ""}`}
      />
    );
  }

  if (topic) {
    const questions = skill
      ? englishDailyQuestions(slug).filter((q) =>
          skill.questionIds.includes(q.id),
        )
      : getQuestions(slug);
    const initialProgress = history.progress.find(
      (row) => row.topic_slug === slug,
    );
    return (
      <DrillClient
        key={`${user.id}:${slug}:${skillId ?? ""}`}
        ownerId={user.id}
        answeredQuestionIds={history.answeredQuestionIds}
        currentScore={profile?.current_score ?? null}
        targetScore={profile?.target_score ?? null}
        mode="topic"
        slug={slug}
        title={skill ? skill.title : topic.title}
        skillId={skillId}
        questions={questions}
        initialProgress={initialProgress}
      />
    );
  }

  if (slug === "weak") {
    const topics = getTopics();
    const titleBySlug = new Map(topics.map((t) => [t.slug, t.title]));

    let weakSlugs: string[] = [];
    {
      weakSlugs = history.progress
        .filter((r) => titleBySlug.has(r.topic_slug) && r.attempts > 0)
        .map((r) => ({ slug: r.topic_slug, accuracy: r.correct / r.attempts }))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3)
        .map((r) => r.slug);
    }
    if (weakSlugs.length === 0) {
      weakSlugs = topics.slice(0, 3).map((t) => t.slug);
    }

    const pool: PoolItem[] = weakSlugs.flatMap((s) =>
      getQuestions(s).map((q) => ({
        topicSlug: s,
        topicTitle: titleBySlug.get(s) ?? s,
        question: q,
      })),
    );
    return (
      <DrillClient
        key={`${user.id}:${slug}`}
        ownerId={user.id}
        mode="weak"
        pool={pool}
        answeredQuestionIds={history.answeredQuestionIds}
        currentScore={profile?.current_score ?? null}
        targetScore={profile?.target_score ?? null}
      />
    );
  }

  if (slug === "misses") {
    const pool: PoolItem[] = [];
    {
      const topics = getTopics();
      const titleBySlug = new Map(topics.map((t) => [t.slug, t.title]));
      const questionCache = new Map<string, Question[]>();

      for (const miss of history.misses) {
        if (!titleBySlug.has(miss.topic_slug)) continue;
        let bank = questionCache.get(miss.topic_slug);
        if (!bank) {
          bank = englishDailyQuestions(miss.topic_slug);
          questionCache.set(miss.topic_slug, bank);
        }
        const question = bank.find((q) => q.id === miss.question_id);
        if (question) {
          pool.push({
            topicSlug: miss.topic_slug,
            topicTitle: titleBySlug.get(miss.topic_slug) ?? miss.topic_slug,
            question,
          });
        }
      }
    }
    return (
      <DrillClient
        key={`${user.id}:${slug}`}
        ownerId={user.id}
        mode="misses"
        pool={pool}
      />
    );
  }

  notFound();
}
