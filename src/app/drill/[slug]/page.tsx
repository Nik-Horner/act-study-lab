import { notFound } from "next/navigation";
import { getTopic, getTopics, getQuestions, type Question } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { DrillClient, type PoolItem } from "./DrillClient";

export default async function DrillPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const topic = getTopic(slug);

  if (topic) {
    const questions = getQuestions(slug);
    let initialProgress;
    if (user) {
      const { data } = await supabase
        .from("topic_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("topic_slug", slug)
        .maybeSingle();
      initialProgress = data ?? undefined;
    }
    return (
      <DrillClient
        mode="topic"
        slug={slug}
        title={topic.title}
        questions={questions}
        initialProgress={initialProgress}
      />
    );
  }

  if (slug === "weak") {
    const topics = getTopics();
    const titleBySlug = new Map(topics.map((t) => [t.slug, t.title]));

    let weakSlugs: string[] = [];
    if (user) {
      const { data: rows } = await supabase
        .from("topic_progress")
        .select("topic_slug, attempts, correct")
        .eq("user_id", user.id);
      weakSlugs = (rows ?? [])
        .filter((r) => r.attempts > 0)
        .map((r) => ({ slug: r.topic_slug, accuracy: r.correct / r.attempts }))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3)
        .map((r) => r.slug);
    }
    if (weakSlugs.length === 0) {
      weakSlugs = topics.slice(0, 3).map((t) => t.slug);
    }

    const pool: PoolItem[] = weakSlugs.flatMap((s) =>
      getQuestions(s).map((q) => ({ topicSlug: s, topicTitle: titleBySlug.get(s) ?? s, question: q })),
    );
    return <DrillClient mode="weak" pool={pool} />;
  }

  if (slug === "misses") {
    const pool: PoolItem[] = [];
    if (user) {
      const { data: misses } = await supabase
        .from("question_misses")
        .select("question_id, topic_slug")
        .eq("user_id", user.id);

      const topics = getTopics();
      const titleBySlug = new Map(topics.map((t) => [t.slug, t.title]));
      const questionCache = new Map<string, Question[]>();

      for (const miss of misses ?? []) {
        let bank = questionCache.get(miss.topic_slug);
        if (!bank) {
          bank = getQuestions(miss.topic_slug);
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
    return <DrillClient mode="misses" pool={pool} />;
  }

  notFound();
}
