import { StudyPageHeader } from "@/components/StudyPageHeader";
import Link from "next/link";
import reference from "@/content/math-reference.json";
import { MathText } from "@/components/MathText";
import { getTopic } from "@/lib/act/content";
export default function MathFormulasPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <StudyPageHeader
        title="Formulas and methods"
        subject="math"
        description="Review the rule, its conditions, and a worked example. Then apply it to a different problem in the linked lesson and drill."
        back={{ href: "/math-formulas", label: "Formula recall" }}
      />
      <nav
        aria-label="Formula topics"
        className="flex flex-wrap gap-x-5 gap-y-2 border-y border-border py-4"
      >
        {reference.map((group) => (
          <a
            key={group.topic}
            href={`#${group.topic}`}
            className="inline-flex min-h-11 items-center text-sm text-brand underline"
          >
            {getTopic(group.topic)?.title ?? group.title}
          </a>
        ))}
      </nav>
      {reference.map((group) => (
        <section
          id={group.topic}
          key={group.topic}
          className="scroll-mt-8 space-y-5 border-b border-border pb-8"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-2xl font-semibold">{group.title}</h2>
            <Link
              href={`/learn/${group.topic}`}
              className="inline-flex min-h-11 items-center text-sm text-brand underline"
            >
              Study the full lesson
            </Link>
          </div>
          <div className="divide-y divide-border">
            {group.items.map((item) => (
              <article key={item.id} id={item.id} className="space-y-3 py-5">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <div className="overflow-x-auto py-2 text-lg">
                  <MathText>{item.formula}</MathText>
                </div>
                <p className="max-w-3xl leading-relaxed">
                  <MathText>{item.when}</MathText>
                </p>
                <p className="max-w-3xl leading-relaxed text-ink-soft">
                  <strong className="text-ink">Worked example: </strong>
                  <MathText>{item.example}</MathText>
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}
      <p className="text-sm leading-relaxed text-ink-soft">
        Coverage is organized around{" "}
        <a
          href="https://www.act.org/content/act/en/college-and-career-readiness/standards/mathematics-standards.html"
          target="_blank"
          rel="noreferrer"
          className="text-brand underline"
        >
          ACT&apos;s mathematics standards
        </a>
        . No list can guarantee a particular score; use the official timed forms
        in your score checks to test transfer and pacing.
      </p>
    </div>
  );
}
