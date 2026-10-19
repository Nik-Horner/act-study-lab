import { fmtTime } from "@/lib/format";

export function ResultSummary({
  correct,
  total,
  seconds,
  unanswered,
}: {
  correct: number;
  total: number;
  seconds: number | null;
  unanswered: number;
}) {
  return (
    <section
      className="assessment-result"
      aria-labelledby="section-result-title"
    >
      <header>
        <h2 id="section-result-title">Section result</h2>
        <p>
          <strong>{correct}</strong> / {total} correct
        </p>
      </header>
      <dl>
        <div>
          <dt>Practice accuracy</dt>
          <dd>{total ? Math.round((correct / total) * 100) : 0}%</dd>
        </div>
        <div>
          <dt>Time elapsed</dt>
          <dd>{seconds === null ? "Not recorded" : fmtTime(seconds)}</dd>
        </div>
        <div>
          <dt>Unanswered</dt>
          <dd>{unanswered}</dd>
        </div>
      </dl>
      <p className="study-caption">
        Original practice material. Use a fresh official form and its scoring
        key to check an ACT score goal.
      </p>
    </section>
  );
}

export function ReviewFilter({
  onlyMisses,
  onChange,
}: {
  onlyMisses: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="review-filter" role="group" aria-label="Review filter">
      <button
        type="button"
        aria-pressed={onlyMisses}
        onClick={() => onChange(true)}
      >
        Missed questions
      </button>
      <button
        type="button"
        aria-pressed={!onlyMisses}
        onClick={() => onChange(false)}
      >
        All answers
      </button>
    </div>
  );
}
