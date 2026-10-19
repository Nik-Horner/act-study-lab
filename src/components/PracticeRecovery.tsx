"use client";
import Link from "next/link";
import {
  getLearningSkill,
  getQuestionTeaching,
  focusLesson,
  skillHref,
} from "@/lib/learning-skills";
import { getLesson as englishLesson } from "@/lib/content";
import { getLesson, getTopic } from "@/lib/act/content";
import type { Lesson } from "@/lib/act/types";
import { LessonActivity } from "./LessonActivity";

/** Supported lesson work is separate from the original scored response. */
export function PracticeRecovery({
  topic,
  questionId,
}: {
  topic: string;
  questionId: string;
}) {
  const teaching = getQuestionTeaching(topic, questionId);
  const skill = teaching && getLearningSkill(topic, teaching.skillId);
  if (!skill) return null;
  const lesson = getTopic(topic)
    ? getLesson(topic)
    : (englishLesson(topic) as Lesson);
  const section = focusLesson(lesson, skill).sections.find(
    (section) => section.activity,
  );
  return (
    <details className="practice-recovery">
      <summary>Rebuild the method before moving on</summary>
      <div>
        <h3>{skill.title}</h3>
        <p className="study-caption">
          This is a supported lesson check. The original answer and grade stay
          saved; this correction does not count as fresh independent evidence.
        </p>
        {section?.activity && (
          <LessonActivity
            key={`${questionId}-recovery`}
            activity={section.activity}
          />
        )}
        <Link className="course-reference" href={skillHref(skill)}>
          Study this method step by step
        </Link>
        <p className="study-caption">
          After the correction, continue the set or revisit this skill in a
          later session.
        </p>
      </div>
    </details>
  );
}
