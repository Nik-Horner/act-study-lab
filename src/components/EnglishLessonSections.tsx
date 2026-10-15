import { renderStem } from "@/lib/format";
import type { LessonSection } from "@/lib/content";
/** Original English Lab teaching and labeled examples, without replacement quizzes. */
export function EnglishLessonSections({
  sections,
  hideHeading = false,
}: {
  sections: LessonSection[];
  hideHeading?: boolean;
}) {
  return (
    <div className="space-y-8">
      {sections.map((section, i) => (
        <section key={i} className="space-y-3">
          {!hideHeading && (
            <h2 className="text-lg font-semibold text-ink">
              {section.heading}
            </h2>
          )}
          <div className="lesson-method-grid">
            <div className="lesson-method-text">
              {section.body.map((p, j) => (
                <p key={j} className="text-ink">
                  {p}
                </p>
              ))}
            </div>
            <div className="lesson-method-examples">
              {section.examples && section.examples.length > 0 && (
                <div className="space-y-2">
                  {section.examples.map((ex, k) => (
                    <div
                      key={k}
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        section.heading === "Clauses and phrases"
                          ? "border-border bg-bg-soft text-ink-soft"
                          : ex.good
                            ? "border-good bg-good-soft text-good"
                            : "border-bad bg-bad-soft text-bad"
                      }`}
                    >
                      {ex.label && (
                        <div className="mb-2 text-sm font-semibold">
                          {ex.label}
                        </div>
                      )}
                      <div
                        className="text-ink"
                        dangerouslySetInnerHTML={{
                          __html: renderStem(ex.text),
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              {section.tip && (
                <div className="rounded-xl border border-brand-soft bg-brand-soft px-4 py-3 text-sm text-brand-dark">
                  <span className="font-semibold">Tip · </span>
                  {section.tip}
                </div>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
