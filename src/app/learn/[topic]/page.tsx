import { getTopic as getActTopic } from "@/lib/act/content";
import { LessonView } from "@/components/act/StudyClient";
import { notFound } from "next/navigation";
import { getTopic, getLesson } from "@/lib/content";
import { TopicReference } from "@/components/TopicReference";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { topicStatus } from "@/lib/mastery";
import { QuickCheck } from "./QuickCheck";
import { loadEnglishProgress } from "@/lib/english-progress-server";
import { EnglishProgressError } from "@/components/EnglishProgressError";
import { getLearningSkill, getLearningSkills } from "@/lib/learning-skills";
import { SkillCatalog } from "@/components/SkillCatalog";
import { StudyPageHeader } from "@/components/StudyPageHeader";
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
      <div className="course-workspace" data-subject="english">
        <StudyPageHeader
          title={lesson.title}
          subject="english"
          description="Choose a focused method. Study the rule, follow a worked example, then test the skill in a separate drill."
          back={{ href: "/learn?subject=english", label: "English course" }}
        />
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
    <TopicReference subject="english" lesson={lesson as ActLesson}>
      {status === "mastered" && (
        <Badge tone="good">Practice milestone reached</Badge>
      )}
      {status === "practicing" && <Badge tone="brand">Practicing</Badge>}
      <QuickCheck checks={lesson.check} />
    </TopicReference>
  );
}
