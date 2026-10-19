import type { ReactNode } from "react";
import type { AccountSubject } from "@/lib/account-settings";
import { StudyIcon } from "./StudyIcon";

export function SessionIntro({
  subject,
  title,
  description,
  questions,
  timing,
  children,
}: {
  subject: AccountSubject;
  title: string;
  description: ReactNode;
  questions: string;
  timing: string;
  children: ReactNode;
}) {
  return (
    <section className="session-intro" data-subject={subject}>
      <div className="session-intro-method">
        <h2>{title}</h2>
        <div className="session-intro-description">{description}</div>
        <ol className="session-method">
          <li>
            <StudyIcon name="practice" />
            <span>Solve independently</span>
          </li>
          <li>
            <StudyIcon name="book" />
            <span>Check the reasoning</span>
          </li>
          <li>
            <StudyIcon name="progress" />
            <span>Review the method</span>
          </li>
        </ol>
      </div>
      <div className="session-intro-start">
        <dl>
          <div>
            <dt>Question set</dt>
            <dd>{questions}</dd>
          </div>
          <div>
            <dt>Pacing</dt>
            <dd>{timing}</dd>
          </div>
        </dl>
        <div className="session-start-actions">{children}</div>
        <p>Answers and completed results save to the signed-in account.</p>
      </div>
    </section>
  );
}
