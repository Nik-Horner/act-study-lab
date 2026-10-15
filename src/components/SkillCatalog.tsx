import Link from "next/link";
import { skillHref, type LearningSkill } from "@/lib/learning-skills";

export function SkillCatalog({
  skills,
  drill = false,
}: {
  skills: LearningSkill[];
  drill?: boolean;
}) {
  const categories = [
    ...new Set(skills.map((skill) => skill.reportingCategory)),
  ];
  const names: Record<string, string> = {
    CSE: "Conventions of Standard English",
    POW: "Production of Writing",
    KLA: "Knowledge of Language",
  };
  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <section key={category} className="space-y-3">
          <h2 className="text-xl font-semibold">
            {names[category] ?? category}
          </h2>
          <ul className="divide-y divide-border border-y border-border">
            {skills
              .filter((skill) => skill.reportingCategory === category)
              .map((skill) => (
                <li
                  key={`${skill.topic}:${skill.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 py-2"
                >
                  <Link
                    href={skillHref(skill, drill)}
                    className="flex min-h-11 min-w-0 flex-1 items-center py-2 font-medium text-ink hover:text-brand"
                  >
                    {skill.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-ink-soft">
                    <span>
                      {skill.questionIds.length} drill question
                      {skill.questionIds.length === 1 ? "" : "s"}
                      {skill.modeling ? " · Modeling" : ""}
                    </span>
                    <Link
                      href={skillHref(skill, !drill)}
                      className="inline-flex min-h-11 items-center text-brand underline"
                    >
                      {drill ? "Learn the method" : "Drill this skill"}
                    </Link>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
