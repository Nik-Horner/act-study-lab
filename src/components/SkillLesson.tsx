import Link from "next/link";
import {
  focusLesson,
  skillHref,
  reportingCategoryName,
  hasTeaching,
  type LearningSkill,
} from "@/lib/learning-skills";
import type { Lesson } from "@/lib/act/types";
import { LessonSections } from "./LessonSections";
import { EnglishLessonSections } from "./EnglishLessonSections";
import { LessonActivity } from "./LessonActivity";
import { ButtonLink } from "./ui/Button";

export function SkillLesson({
  skill,
  full,
}: {
  skill: LearningSkill;
  full: Lesson;
}) {
  const lesson = focusLesson(full, skill);
  lesson.sections = lesson.sections.filter(hasTeaching);
  return (
    <article className="mx-auto max-w-4xl space-y-7">
      <Link
        href={`/learn/${skill.topic}`}
        className="inline-flex min-h-11 items-center text-sm text-brand underline"
      >
        All skills in this topic
      </Link>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{skill.title}</h1>
        <p className="mt-3 text-sm text-ink-soft">
          {reportingCategoryName(skill.reportingCategory)}
          {skill.modeling ? " · Modeling" : ""}
        </p>
      </header>
      <p className="text-ink-soft">
        Learn the method, try a different example, then practice new questions
        on this skill.
      </p>
      {skill.subject === "english" ? (
        <>
          <EnglishLessonSections
            sections={lesson.sections}
            hideHeading={lesson.sections.length === 1}
          />
          {lesson.sections
            .filter((section) => section.activity)
            .map((section) => (
              <section
                key={section.heading}
                className="space-y-4 border-t border-border pt-6"
              >
                <h2 className="text-xl font-semibold">
                  Try it in a new context
                </h2>
                <LessonActivity activity={section.activity!} />
              </section>
            ))}
        </>
      ) : (
        <LessonSections
          sections={lesson.sections}
          hideHeading={lesson.sections.length === 1}
        />
      )}
      <div className="border-t border-border pt-6">
        <ButtonLink href={skillHref(skill, true)}>Drill this skill</ButtonLink>
        <p className="mt-3 text-sm text-ink-soft">
          {skill.questionIds.length} separate practice questions. The worked
          example and try-it task stay in the lesson.
        </p>
      </div>
    </article>
  );
}
