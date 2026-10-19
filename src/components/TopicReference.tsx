import Link from "next/link";
import type { ReactNode } from "react";
import type { Lesson } from "@/lib/act/types";
import type { AccountSubject } from "@/lib/account-settings";
import { StudyPageHeader } from "./StudyPageHeader";
import { EnglishLessonSections } from "./EnglishLessonSections";
import { LessonSections } from "./LessonSections";
import { ButtonLink } from "./ui/Button";
import { MathText } from "./MathText";

export function TopicReference({
  subject,
  lesson,
  children,
}: {
  subject: AccountSubject;
  lesson: Lesson;
  children?: ReactNode;
}) {
  return (
    <div className="reference-workspace" data-subject={subject}>
      <StudyPageHeader
        title={lesson.title}
        subject={subject}
        description={<MathText>{lesson.intro}</MathText>}
        back={{
          href: `/learn/${lesson.slug}`,
          label: "Focused lessons in this topic",
        }}
      />
      <div className="reference-layout">
        <nav className="reference-index" aria-label="Topic reference contents">
          <h2>In this reference</h2>
          {lesson.sections.map((section, index) => (
            <a key={index} href={`#reference-concept-${index}`}>
              {section.heading.replace(/^\d+\.\s*/, "")}
            </a>
          ))}
          <Link href="#reference-check">Check understanding</Link>
        </nav>
        <article className="reference-content">
          {lesson.sections.map((section, index) => (
            <section
              id={`reference-concept-${index}`}
              key={index}
              className="reference-concept"
            >
              {subject === "english" ? (
                <EnglishLessonSections sections={[section]} />
              ) : (
                <LessonSections sections={[section]} />
              )}
            </section>
          ))}
          <section id="reference-check" className="reference-concept">
            <h2>Check understanding</h2>
            {children}
            <div className="session-start-actions">
              <ButtonLink href={`/drill/${lesson.slug}`}>
                Practice this topic
              </ButtonLink>
              <ButtonLink href={`/learn/${lesson.slug}`} variant="ghost">
                Choose a focused lesson
              </ButtonLink>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
