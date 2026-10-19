"use client";
import { useState } from "react";
import Link from "next/link";
import type { LearningSkill } from "@/lib/learning-skills";
import type { AccountSubject } from "@/lib/account-settings";
import { SkillCatalog } from "./SkillCatalog";
import { StudyPageHeader } from "./StudyPageHeader";
import { StudyIcon } from "./StudyIcon";

const subjects: AccountSubject[] = ["english", "math", "reading", "science"];
const overview = {
  english: "Grammar, sentence structure, and writing",
  math: "Algebra, geometry, functions, and modeling",
  reading: "Structure, evidence, inference, and comparison",
  science: "Data, experiments, and scientific reasoning",
};
export function CourseBrowser({
  skills,
  subject,
  topics,
}: {
  skills: LearningSkill[];
  subject?: AccountSubject;
  topics: { slug: string; title: string }[];
}) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const filtered = skills.filter(
    (skill) =>
      (!subject || skill.subject === subject) &&
      (!search ||
        `${skill.title} ${skill.reportingCategory} ${topics.find((topic) => topic.slug === skill.topic)?.title ?? ""}`
          .toLowerCase()
          .includes(search)),
  );
  const groups = topics
    .map((topic) => ({
      ...topic,
      skills: filtered.filter((skill) => skill.topic === topic.slug),
    }))
    .filter((topic) => topic.skills.length);
  return (
    <div className="course-workspace" data-subject={subject}>
      <StudyPageHeader
        title={
          subject
            ? `${subject[0].toUpperCase() + subject.slice(1)} course`
            : "ACT course"
        }
        description="Build understanding one skill at a time. Study the method, follow an example, complete a guided check, then practice independently."
        back={subject ? { href: "/learn", label: "All subjects" } : undefined}
      />
      <nav className="course-subjects" aria-label="Course subjects">
        {subjects.map((item) => (
          <Link
            key={item}
            href={`/learn?subject=${item}`}
            data-subject={item}
            aria-current={item === subject ? "page" : undefined}
          >
            <StudyIcon name={item} />
            <strong>{item}</strong>
            <span>
              {skills.filter((skill) => skill.subject === item).length} skills
            </span>
            {!subject && <p>{overview[item]}</p>}
          </Link>
        ))}
      </nav>
      <section
        className="course-curriculum"
        aria-labelledby="course-curriculum-title"
      >
        <div className="course-section-heading">
          <div>
            <h2 id="course-curriculum-title">
              {subject ? "Course contents" : "Explore the curriculum"}
            </h2>
            <p>
              {filtered.length} skills across {groups.length} topics
            </p>
          </div>
          <label className="course-search">
            Find a skill
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. triangle, comma, evidence"
            />
          </label>
        </div>
        {!groups.length && (
          <p role="status" className="course-empty">
            No skills match “{query}”. Try a topic name or a shorter phrase.
          </p>
        )}
        <div className="course-topic-list">
          {groups.map((topic, index) => (
            <details
              className="course-topic"
              key={`${subject ?? "all"}-${search}-${topic.slug}`}
              open={search ? true : subject ? index === 0 : false}
            >
              <summary>
                <span className="course-topic-order" aria-hidden="true">
                  {index + 1}
                </span>
                <span>
                  <strong>{topic.title}</strong>
                  <small>
                    {topic.skills.length} skills ·{" "}
                    {topic.skills.reduce(
                      (total, skill) => total + skill.questionIds.length,
                      0,
                    )}{" "}
                    independent questions
                  </small>
                </span>
                <span className="course-expand" aria-hidden="true">
                  +
                </span>
              </summary>
              <SkillCatalog skills={topic.skills} />
              <Link
                className="course-reference"
                href={`/learn/${topic.slug}?reference=1`}
              >
                Complete topic reference
              </Link>
            </details>
          ))}
        </div>
      </section>
      <div className="study-next-bar">
        <div>
          <h2>Study a planned session</h2>
          <p>
            Daily study uses the same course lessons and keeps the saved session
            ready to resume.
          </p>
        </div>
        <Link
          className="text-brand underline min-h-11 inline-flex items-center"
          href="/dashboard"
        >
          Open Daily study
        </Link>
      </div>
    </div>
  );
}
