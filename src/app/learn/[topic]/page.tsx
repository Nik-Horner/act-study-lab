import { getTopic as getActTopic } from "@/lib/act/content";
import { LessonView } from "@/components/act/StudyClient";
import { notFound } from "next/navigation";
import { getTopic, getLesson } from "@/lib/content";
import { renderStem } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { topicStatus } from "@/lib/mastery";
import { QuickCheck } from "./QuickCheck";
import { loadEnglishProgress } from "@/lib/english-progress-server";
import { EnglishProgressError } from "@/components/EnglishProgressError";
import { getLearningSkill, getLearningSkills } from "@/lib/learning-skills";
import { SkillCatalog } from "@/components/SkillCatalog";
import { SkillLesson } from "@/components/SkillLesson";
import type { Lesson as ActLesson } from "@/lib/act/types";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ skill?: string; reference?: string }>;
}) {
  const { topic: slug } = await params;
  const { skill: skillId, reference } = await searchParams;
  if (skillId && !getLearningSkill(slug, skillId)) notFound();

  if (getActTopic(slug))
    return (
      <LessonView slug={slug} skillId={skillId} reference={reference === "1"} />
    );
  const topic = getTopic(slug);
  if (!topic) notFound();

  let lesson;
  try {
    lesson = getLesson(slug);
  } catch {
    notFound();
  }
  const skills = getLearningSkills(slug);
  const skill = skillId && getLearningSkill(slug, skillId);
  if (skill) return <SkillLesson skill={skill} full={lesson as ActLesson} />;
  if (skills.length && reference !== "1")
    return (
      <div className="mx-auto max-w-5xl space-y-7">
        <ButtonLink href="/learn?subject=english" variant="ghost">
          English skill course
        </ButtonLink>
        <h1 className="text-3xl font-semibold">{lesson.title}</h1>
        <p className="text-ink-soft">
          Choose the rule you want to learn. Each lesson links to its own
          matched drill.
        </p>
        <SkillCatalog skills={skills} />
        <ButtonLink variant="ghost" href={`/learn/${slug}?reference=1`}>
          Read the complete topic reference
        </ButtonLink>
      </div>
    );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let progressRow;
  if (user) {
    try {
      const { progress } = await loadEnglishProgress(supabase, user.id);
      progressRow = progress.find((row) => row.topic_slug === slug);
    } catch {
      return <EnglishProgressError href={`/learn/${slug}`} />;
    }
  }

  const status = topicStatus(progressRow);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone="brand">{topic.category}</Badge>
          {status === "mastered" && (
            <Badge tone="good">Practice milestone</Badge>
          )}
          {status === "practicing" && <Badge tone="warn">Practicing</Badge>}
        </div>
        <h1 className="text-2xl font-semibold text-ink">{lesson.title}</h1>
        <p className="mt-2 text-ink-soft">{lesson.intro || topic.blurb}</p>
      </div>

      {lesson.sections.map((section, i) => (
        <section key={i} className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">{section.heading}</h2>
          {section.body.map((p, j) => (
            <p key={j} className="text-ink-soft">
              {p}
            </p>
          ))}
          {section.examples && section.examples.length > 0 && (
            <div className="space-y-2">
              {section.examples.map((ex, k) => (
                <div
                  key={k}
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    section.heading === "Clauses and phrases"
                      ? "border-border bg-bg-soft text-ink-soft"
                      : ex.good
                        ? "border-good bg-good-soft text-good"
                        : "border-bad bg-bad-soft text-bad"
                  }`}
                >
                  {ex.label && (
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide">
                      {ex.label}
                    </div>
                  )}
                  <div
                    className="text-ink"
                    dangerouslySetInnerHTML={{ __html: renderStem(ex.text) }}
                  />
                </div>
              ))}
            </div>
          )}
          {section.tip && (
            <div className="rounded-xl border border-brand-soft bg-brand-soft px-4 py-3 text-sm text-brand-dark">
              <span className="font-semibold">Tip · </span>
              {section.tip}
            </div>
          )}
        </section>
      ))}

      {lesson.check.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Quick check</h2>
          <QuickCheck checks={lesson.check} />
        </section>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="font-semibold text-ink">Ready to drill?</p>
          <p className="text-sm text-ink-soft">
            Practice {lesson.title} questions until it&apos;s automatic.
          </p>
        </div>
        <ButtonLink href={`/drill/${slug}`}>Start drill →</ButtonLink>
      </Card>
    </div>
  );
}
