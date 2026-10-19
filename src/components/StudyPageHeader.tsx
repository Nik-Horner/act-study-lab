import Link from "next/link";
import type { ReactNode } from "react";
import type { AccountSubject } from "@/lib/account-settings";
import { StudyIcon } from "./StudyIcon";

/** One orientation pattern across the course, practice, and saved results. */
export function StudyPageHeader({
  title,
  description,
  subject,
  back,
  actions,
}: {
  title: string;
  description: ReactNode;
  subject?: AccountSubject;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="study-page-heading" data-subject={subject}>
      {back && (
        <Link className="study-breadcrumb" href={back.href}>
          {back.label}
        </Link>
      )}
      <div className="study-page-title-row">
        {subject && (
          <span className="subject-symbol">
            <StudyIcon name={subject} size={28} />
          </span>
        )}
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {actions && <div className="study-page-actions">{actions}</div>}
    </header>
  );
}
