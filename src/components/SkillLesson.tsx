"use client";
import { useState } from "react";
import Link from "next/link";
import {
  focusLesson,
  skillHref,
  hasTeaching,
  type LearningSkill,
} from "@/lib/learning-skills";
import type { Lesson } from "@/lib/act/types";
import { ConceptTeaching } from "./ConceptTeaching";
import { ButtonLink } from "./ui/Button";
import { LessonSubjectTrail } from "./LessonSubjectTrail";

export function SkillLesson({
  skill,
  full,
}: {
  skill: LearningSkill;
  full: Lesson;
}) {
  const sections = focusLesson(full, skill).sections.filter(hasTeaching);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  return (
    <article className="course-lesson" data-subject={skill.subject}>
      <nav className="lesson-route-bar" aria-label="Lesson navigation">
        <Link href={`/learn?subject=${skill.subject}`}>
          {skill.subject} course
        </Link>
        <Link href={`/learn/${skill.topic}`}>Topic contents</Link>
        <Link href={skillHref(skill, true)}>Independent practice</Link>
      </nav>
      <LessonSubjectTrail subject={skill.subject} />
      {finished ? (
        <section className="lesson-transfer">
          <h1>Apply the method independently</h1>
          <h2>{skill.title}</h2>
          <p>
            The worked example and guided check are preparation. Use fresh
            questions to check whether the method transfers.
          </p>
          <ButtonLink href={skillHref(skill, true)}>
            Start independent practice
          </ButtonLink>
          <ButtonLink href={`/play?subject=${skill.subject}`} variant="ghost">
            Play a full-context mission
          </ButtonLink>
          <p className="text-sm text-ink-soft">
            {skill.questionIds.length} separate practice questions. Scored
            answers save to the account; reviewing this lesson does not claim a
            mastery milestone.
          </p>
          <button
            type="button"
            className="min-h-11 text-brand underline"
            onClick={() => {
              setIndex(0);
              setFinished(false);
            }}
          >
            Revisit lesson
          </button>
        </section>
      ) : (
        <ConceptTeaching
          key={`${skill.id}-${index}`}
          title={skill.title}
          subject={skill.subject}
          topic={skill.topic}
          skillId={skill.id}
          prerequisite={
            skill.subject === "english" &&
            index < sections.length - 1 &&
            !sections[index].activity &&
            !sections[index].evidence?.length &&
            !sections[index].examples?.length &&
            !sections[index].workedCases?.length
          }
          section={sections[index]}
          sourceIndex={full.sections.findIndex(
            (section) => section.heading === sections[index].heading,
          )}
          position={index}
          total={sections.length}
          onPrevious={
            index > 0
              ? () => {
                  setIndex(index - 1);
                  window.scrollTo({ top: 0 });
                }
              : undefined
          }
          nextLabel={
            index === sections.length - 1
              ? "Continue to independent practice"
              : "Next concept"
          }
          onContinue={() => {
            if (index === sections.length - 1) setFinished(true);
            else setIndex(index + 1);
            window.scrollTo({ top: 0 });
          }}
        />
      )}
    </article>
  );
}
