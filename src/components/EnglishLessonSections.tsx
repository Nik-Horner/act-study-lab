import { renderStem } from "@/lib/format";
import type { LessonSection } from "@/lib/content";
/** Original English Lab teaching and labeled examples, without replacement quizzes. */
export function EnglishLessonSections({
  sections,
  hideHeading = false,
  mode = "all",
}: {
  sections: LessonSection[];
  hideHeading?: boolean;
  mode?: "all" | "method" | "examples";
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
          <div className="lesson-method-grid" data-mode={mode}>
            {mode !== "examples" && (
              <div className="lesson-method-text">
                {section.body.map((p, j) => (
                  <p key={j} className="text-ink">
                    {p}
                  </p>
                ))}
              </div>
            )}
            {mode !== "method" && (
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
              </div>
            )}
            {mode !== "examples" && section.tip && (
              <div className="rounded-xl border border-brand-soft bg-brand-soft px-4 py-3 text-sm text-brand-dark">
                <span className="font-semibold">Tip · </span>
                {section.tip}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
