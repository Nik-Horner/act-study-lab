import { StudyIcon } from "./StudyIcon";
import { explanationSteps } from "@/lib/answer-explanation";
import { MathText } from "./MathText";
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
      data-correct={correct}
      className="answer-feedback mt-5 space-y-4 rounded-xl border border-border bg-bg-soft p-5"
    >
      <div>
        <h3
          className={`answer-feedback-title font-semibold ${correct ? "text-good" : "text-bad"}`}
        >
          {correct && (
            <StudyIcon name="check" className="answer-success-mark" size={22} />
          )}
          {correct ? "Correct" : chosen == null ? "Skipped" : "Let’s fix this"}
        </h3>
        {!correct && chosen != null && (
          <p className="mt-2 text-sm text-ink-soft">
            Your answer: {String.fromCharCode(65 + chosen)}.{" "}
            <MathText>{choices[chosen]}</MathText>
          </p>
        )}
        <p className="mt-2 font-semibold text-good">
          {String.fromCharCode(65 + answer)}.{" "}
          <MathText>{choices[answer]}</MathText>
        </p>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="mb-3 text-sm font-semibold">Why this works</h4>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-ink">
          {steps.map((step, i) => (
            <li key={i} className="max-w-prose pl-1">
              <MathText>{step}</MathText>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
