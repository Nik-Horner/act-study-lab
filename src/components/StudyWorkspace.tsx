import type { ReactNode } from "react";
import type { AccountSubject } from "@/lib/account-settings";
import { StudyIcon } from "./StudyIcon";

/** The same task frame carries lessons into independent practice, exams, and recall. */
export function StudyWorkspace({
  title,
  subject,
  mode,
  current,
  total,
  tools,
  children,
  headingLevel = 2,
}: {
  title: string;
  subject: AccountSubject;
  mode: "practice" | "exam" | "recall";
  current?: number;
  total?: number;
  tools?: ReactNode;
  children: ReactNode;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section
      className="study-workspace"
      data-subject={subject}
      data-mode={mode}
    >
      <header className="workspace-toolbar">
        <div className="workspace-identity">
          <span className="subject-symbol">
            <StudyIcon name={subject} size={22} />
          </span>
          <div>
            <Heading>{title}</Heading>
            <p>
              {mode === "practice"
                ? "Independent practice"
                : mode === "exam"
                  ? "Timed section"
                  : "Recall from memory"}
              {current !== undefined && total !== undefined
                ? ` · ${mode === "recall" ? "Card" : "Question"} ${current} of ${total}`
                : ""}
            </p>
          </div>
        </div>
        {tools && <div className="workspace-tools">{tools}</div>}
      </header>
      {current !== undefined && !!total && (
        <progress
          className="workspace-position"
          value={current}
          max={total}
          aria-label={mode === "recall" ? "Card position" : "Question position"}
        />
      )}
      <div className="workspace-content">{children}</div>
    </section>
  );
}
