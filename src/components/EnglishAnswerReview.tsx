"use client";
import { useState } from "react";
import Link from "next/link";
import { ReviewFilter } from "./ResultSummary";
import { AnswerFeedback } from "./AnswerFeedback";

export interface EnglishReviewItem {
  number: number;
  topic: string;
  prompt: string;
  underline: string;
  choices: string[];
  picked: number | null;
  answer: number;
  correct: boolean;
  explanation: string;
  passage: string;
}
export function EnglishAnswerReview({ items }: { items: EnglishReviewItem[] }) {
  const [onlyMisses, setOnlyMisses] = useState(true);
  const shown = items.filter((item) => !onlyMisses || !item.correct);
  return (
    <section className="result-review" aria-labelledby="answer-review-title">
      <header className="result-review-toolbar">
        <div>
          <h2 id="answer-review-title">Answer review</h2>
          <p>
            {shown.length} of {items.length} questions
          </p>
        </div>
        <ReviewFilter onlyMisses={onlyMisses} onChange={setOnlyMisses} />
      </header>
      {!shown.length && (
        <p className="review-empty">
          No missed questions in this section. Switch to all answers to review
          the complete attempt.
        </p>
      )}
      {shown.map((item) => (
        <article className="answer-review-item" key={item.number}>
          <div className="review-question-heading">
            <span className="answer-letter">{item.number}</span>
            <h3>{item.prompt}</h3>
            <span className="study-badge">
              {item.correct ? "Correct" : "Review"}
            </span>
          </div>
          {item.underline && (
            <p className="review-source">
              Underlined text: <span className="ul">{item.underline}</span>
            </p>
          )}
          <AnswerFeedback
            choices={item.choices}
            chosen={item.picked}
            answer={item.answer}
            explanation={item.explanation}
          />
          <div className="lesson-reference-links">
            <Link href={`/learn/${item.topic}`}>Study the matching topic</Link>
            <Link href={`/drill/${item.topic}`}>Practice this topic</Link>
            <span className="study-caption">{item.passage}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
