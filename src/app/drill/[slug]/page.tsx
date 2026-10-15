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

export default async function DrillPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const { slug } = await params;
  const { subject } = await searchParams;
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
  let history;
  try {
    history = await loadEnglishProgress(supabase, user.id);
  } catch {
    return <EnglishProgressError href={`/drill/${slug}`} />;
  }

  if (topic) {
    const questions = getQuestions(slug);
    const initialProgress = history.progress.find(
      (row) => row.topic_slug === slug,
    );
    return (
      <DrillClient
        key={user.id}
        ownerId={user.id}
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
      <DrillClient key={user.id} ownerId={user.id} mode="weak" pool={pool} />
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
    return (
      <DrillClient key={user.id} ownerId={user.id} mode="misses" pool={pool} />
    );
  }

  notFound();
}
