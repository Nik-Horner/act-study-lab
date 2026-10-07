import Link from "next/link";
export function SubjectNav({
  subject,
}: {
  subject: "english" | "math" | "reading" | "science";
}) {
  return (
    <nav
      aria-label="ACT subjects"
      className="flex flex-wrap gap-1 rounded-2xl border border-border bg-bg-raised p-1 sm:w-fit sm:rounded-full"
    >
      {(["english", "math", "reading", "science"] as const).map((value) => (
        <Link
          key={value}
          href={value === "english" ? "/dashboard" : `/study/${value}`}
          aria-current={subject === value ? "page" : undefined}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-semibold capitalize sm:flex-none ${subject === value ? "bg-bg-soft text-brand shadow-sm" : "text-ink-soft hover:text-ink"}`}
        >
          {value === "english"
            ? "English"
            : value === "math"
              ? "Math"
              : value === "reading"
                ? "Reading"
                : "Science"}
        </Link>
      ))}
    </nav>
  );
}
