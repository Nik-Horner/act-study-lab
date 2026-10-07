import { explanationSteps } from "@/lib/answer-explanation";
export function AnswerFeedback({
  choices,
  answer,
  chosen,
  explanation,
}: {
  choices: string[];
  answer: number;
  chosen: number | null | undefined;
  explanation: string;
}) {
  const correct = chosen === answer;
  const steps = explanationSteps(explanation);
  return (
    <section
      role="status"
      aria-label="Answer explanation"
      className="mt-5 space-y-4 rounded-xl border border-border bg-bg-soft p-5"
    >
      <div>
        <h3 className={`font-semibold ${correct ? "text-good" : "text-bad"}`}>
          {correct ? "Correct" : chosen == null ? "Skipped" : "Let’s fix this"}
        </h3>
        {!correct && chosen != null && (
          <p className="mt-2 text-sm text-ink-soft">
            Your answer: {String.fromCharCode(65 + chosen)}. {choices[chosen]}
          </p>
        )}
        <p className="mt-2 font-semibold text-good">
          {String.fromCharCode(65 + answer)}. {choices[answer]}
        </p>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="mb-3 text-sm font-semibold">Why this works</h4>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-ink">
          {steps.map((step, i) => (
            <li key={i} className="max-w-prose pl-1">
              {step}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
