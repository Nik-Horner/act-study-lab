import Link from "next/link";
import { getLearningSkills } from "@/lib/learning-skills";
import { SkillCatalog } from "@/components/SkillCatalog";
import type { AccountSubject } from "@/lib/account-settings";
const subjects: AccountSubject[] = ["english", "math", "reading", "science"];
export default async function CurriculumPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject: selected } = await searchParams;
  const subject = subjects.find((subject) => subject === selected) ?? "math";
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <Link
        href={`/study/${subject}`}
        className="inline-flex min-h-11 items-center text-sm text-brand underline"
      >
        Back to {subject} practice
      </Link>
      <h1 className="text-3xl font-semibold capitalize">
        {subject} skill course
      </h1>
      <p className="max-w-3xl text-ink-soft">
        Choose a specific skill within the ACT reporting categories. Each lesson
        teaches its method, gives a worked example and a separate try-it task,
        then links to matching drills.
      </p>
      <nav aria-label="Skill course subject" className="flex flex-wrap gap-2">
        {subjects.map((item) => (
          <Link
            key={item}
            href={`/learn?subject=${item}`}
            aria-current={subject === item ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg border px-4 capitalize ${subject === item ? "border-brand bg-brand-soft" : "border-border"}`}
          >
            {item}
          </Link>
        ))}
      </nav>
      <SkillCatalog skills={getLearningSkills(undefined, subject)} />
    </div>
  );
}
