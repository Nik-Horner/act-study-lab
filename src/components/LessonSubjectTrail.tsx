import Link from "next/link";
import { SUBJECTS, type AccountSubject } from "@/lib/account-settings";
import { StudyIcon } from "./StudyIcon";

export function LessonSubjectTrail({ subject }: { subject: AccountSubject }) {
  return (
    <nav aria-label="Course subjects" className="lesson-subject-trail">
      {SUBJECTS.map((item) => (
        <Link
          key={item}
          href={`/learn?subject=${item}`}
          aria-current={item === subject ? "page" : undefined}
          data-subject={item}
        >
          <span>
            <StudyIcon name={item} size={24} />
          </span>
          <strong>{item[0].toUpperCase() + item.slice(1)}</strong>
          <i aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
