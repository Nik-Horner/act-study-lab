import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getExam as getEnglishExam, type ExamId } from "@/lib/content";
import { getExams, SUBJECT_LABELS } from "@/lib/act/content";
import { createClient } from "@/lib/supabase/server";
const englishIds: ExamId[] = ["exam-1", "exam-2"];
const sections = [
  {
    label: "English",
    minutes: 35,
    exams: englishIds.map((id) => {
      const e = getEnglishExam(id);
      return {
        id,
        title: e.title,
        total: e.passages.reduce((n, p) => n + p.questions.length, 0),
      };
    }),
  },
  ...(["math", "reading", "science"] as const).map((subject) => ({
    label: SUBJECT_LABELS[subject],
    minutes: subject === "math" ? 50 : 40,
    exams: getExams(subject).map((e) => ({
      id: e.id,
      title: e.title,
      total: e.questionIds.length,
    })),
  })),
];
const published = sections.flatMap((s) => s.exams);
export default async function ExamIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: attempts, error } = user
    ? await supabase
        .from("exam_attempts")
        .select(
          "id, exam_id, raw_correct, raw_total, scale_score, completed_at",
        )
        .eq("user_id", user.id)
        .in(
          "exam_id",
          published.map((e) => e.id),
        )
        .order("completed_at", { ascending: false })
        .limit(100)
    : { data: null, error: null };
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Digital practice sections</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Practice each enhanced ACT subject at its full section length.
          Original training questions, saved results, and explanations after you
          finish.
        </p>
      </div>
      {sections.map((section) => (
        <section
          key={section.label}
          aria-labelledby={`section-${section.label}`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id={`section-${section.label}`}
              className="text-lg font-semibold"
            >
              {section.label}
            </h2>
            <span className="text-sm text-ink-soft">
              {section.exams[0].total} questions · {section.minutes} minutes
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {section.exams.map((exam) => (
              <Card key={exam.id} className="flex flex-col justify-between p-6">
                <div>
                  <h3 className="font-semibold">{exam.title}</h3>
                  <p className="mt-2 text-sm text-ink-soft">
                    {exam.total} questions · {section.minutes} minutes
                  </p>
                </div>
                <ButtonLink
                  href={`/exam/${exam.id}`}
                  className="mt-5 self-start"
                >
                  Start section
                </ButtonLink>
              </Card>
            ))}
          </div>
        </section>
      ))}
      <section>
        <h2 className="text-lg font-semibold">Your past sections</h2>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-bad">
            Your saved results could not be loaded. Reload to retry.
          </p>
        ) : !attempts?.length ? (
          <p className="mt-3 text-sm text-ink-soft">
            Your first completed section will appear here.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {attempts.map((a) => (
              <Link
                key={a.id}
                href={`/exam/${a.exam_id}/results/${a.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-soft px-4 py-3 hover:bg-bg-raised"
              >
                <div>
                  <div className="font-medium">
                    {published.find((e) => e.id === a.exam_id)?.title}
                  </div>
                  <div className="mt-1 text-xs text-ink-soft">
                    {new Date(a.completed_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <Badge tone="brand">
                  {a.raw_correct}/{a.raw_total}
                </Badge>
              </Link>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Results show raw accuracy. Original practice forms are not validated
          predictors of an official ACT score. Existing English score estimates
          remain available in their result pages.
        </p>
      </section>
    </div>
  );
}
