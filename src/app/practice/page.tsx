import Link from "next/link";
import { Card } from "@/components/ui/Card";
export default function PracticePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Extra practice</h1>
      <p className="text-ink-soft">
        Your daily lesson already chooses the work. Use these when you want to
        focus on something extra.
      </p>
      <Card className="divide-y divide-border">
        {["english", "reading", "math", "science"].map((subject) => (
          <Link
            key={subject}
            href={`/study/${subject}`}
            className="flex min-h-14 items-center justify-between px-5 py-4 font-semibold capitalize hover:text-brand"
          >
            {subject}
            <span className="text-sm font-normal text-ink-soft">
              Lessons and drills
            </span>
          </Link>
        ))}
        <Link
          href="/exam"
          className="block px-5 py-4 font-semibold hover:text-brand"
        >
          Full timed digital sections
        </Link>
      </Card>
      <Link
        href="/dashboard"
        className="inline-block text-sm text-brand underline"
      >
        Back to daily study
      </Link>
    </div>
  );
}
