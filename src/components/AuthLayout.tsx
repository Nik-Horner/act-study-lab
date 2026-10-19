import Link from "next/link";
import type { ReactNode } from "react";
import { StudyIcon } from "./StudyIcon";

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-workspace">
      <section
        className="auth-course-preview"
        aria-labelledby="auth-course-title"
      >
        <h2 id="auth-course-title">One place to learn the ACT.</h2>
        <p>
          Clear methods. Visual examples. Practice that builds on what you have
          learned.
        </p>
        <ol className="auth-learning-steps">
          <li>
            <StudyIcon name="book" />
            <div>
              <strong>Understand the method</strong>
              <span>Follow an explanation and a worked example.</span>
            </div>
          </li>
          <li>
            <StudyIcon name="practice" />
            <div>
              <strong>Put it into practice</strong>
              <span>Try a guided check, then solve new questions.</span>
            </div>
          </li>
          <li>
            <StudyIcon name="progress" />
            <div>
              <strong>Review and build</strong>
              <span>
                Keep saved work and revisit the ideas that need practice.
              </span>
            </div>
          </li>
        </ol>
        <div className="auth-subjects">
          {(["english", "math", "reading", "science"] as const).map(
            (subject) => (
              <span key={subject} data-subject={subject}>
                <StudyIcon name={subject} size={18} />
                {subject}
              </span>
            ),
          )}
        </div>
        <Link href="/">Explore ACT Study Lab</Link>
      </section>
      <section className="auth-form-surface">
        <header>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </section>
    </div>
  );
}
