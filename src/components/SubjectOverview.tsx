import Link from "next/link";
import type { AccountSubject } from "@/lib/account-settings";
import { StudyPageHeader } from "./StudyPageHeader";
import { SubjectNav } from "./SubjectNav";
import { ButtonLink } from "./ui/Button";

export type SubjectTopicSummary = {
  slug: string;
  title: string;
  blurb: string;
  attempts: number;
  accuracy: number | null;
  milestone: boolean;
};
const descriptions = {
  english:
    "Sentence structure, grammar, and effective writing. Learn the rule, then test it in context.",
  math: "Algebra, geometry, functions, probability, and modeling. Connect each method to fresh problems.",
  reading:
    "Passage structure, evidence, inference, and comparison. Support each answer with the text.",
  science:
    "Data, experimental design, and scientific reasoning. Read the evidence and test the claim.",
};
export function SubjectOverview({
  subject,
  topics,
  skillCount,
  questions,
}: {
  subject: AccountSubject;
  topics: SubjectTopicSummary[];
  skillCount: number;
  questions: number;
}) {
  const title = subject[0].toUpperCase() + subject.slice(1);
  return (
    <div className="subject-workspace" data-subject={subject}>
      <StudyPageHeader
        title={`${title} study`}
        description={descriptions[subject]}
        back={{ href: "/practice", label: "All practice" }}
      />
      <SubjectNav subject={subject} />
      <section className="study-mode-list" aria-label={`${title} study modes`}>
        <Link href={`/learn?subject=${subject}`}>
          <strong>Learn the methods</strong>
          <span>
            {skillCount} focused skills · instruction, examples, and guided
            checks
          </span>
          <b>Open course →</b>
        </Link>
        <Link
          href={
            subject === "english"
              ? "/drill/weak"
              : `/drill/mixed?subject=${subject}`
          }
        >
          <strong>Practice independently</strong>
          <span>{questions} questions · saved answers and explanations</span>
          <b>Start practice →</b>
        </Link>
        <Link
          href={
            subject === "english"
              ? "/drill/misses"
              : `/drill/misses?subject=${subject}`
          }
        >
          <strong>Review mistakes</strong>
          <span>
            Revisit the method behind a miss, then return to fresh practice
          </span>
          <b>Open review →</b>
        </Link>
      </section>
      <section
        className="subject-records"
        aria-labelledby="subject-records-title"
      >
        <div className="course-section-heading">
          <h2 id="subject-records-title">Topics and saved practice</h2>
          <p>
            {topics.filter((topic) => topic.milestone).length}/{topics.length}{" "}
            practice milestones
          </p>
        </div>
        <p className="study-caption">
          Lesson coverage and practice milestones measure different work.
          Existing saved practice is shown below.
        </p>
        <div className="topic-record-list">
          {topics.map((topic) => (
            <div key={topic.slug}>
              <Link href={`/learn/${topic.slug}`}>
                <h3>{topic.title}</h3>
                <p>{topic.blurb}</p>
              </Link>
              <div className="topic-record-meta">
                <span>
                  {topic.milestone
                    ? "Practice milestone reached"
                    : topic.attempts
                      ? "Practicing"
                      : "Not practiced yet"}
                </span>
                <small>
                  {topic.attempts} answers
                  {topic.accuracy !== null
                    ? ` · ${Math.round(topic.accuracy * 100)}% correct`
                    : ""}
                </small>
              </div>
              <Link
                className="topic-practice-link"
                href={`/drill/${topic.slug}`}
              >
                Practice
              </Link>
            </div>
          ))}
        </div>
      </section>
      <section className="study-next-bar">
        <div>
          <h2>Keep daily study in one place</h2>
          <p>
            The Daily session combines lessons, independent questions, and
            review across subjects. Timed sections check pacing separately.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/dashboard">Daily study</ButtonLink>
          <ButtonLink href="/exam" variant="ghost">
            Timed sections
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
