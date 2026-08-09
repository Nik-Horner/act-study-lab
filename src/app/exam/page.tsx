import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getExam, type ExamId } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";

const EXAM_IDS: ExamId[] = ["exam-1", "exam-2"];

export default async function ExamIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: attempts } = user
    ? await supabase
        .from("exam_attempts")
        .select("id, exam_id, raw_correct, raw_total, scale_score, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
    : { data: null };

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold">Full practice exams</h1>
        <p className="mt-1 text-ink-soft">
          50 questions, 35 minutes, scored on the official ACT English curve.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {EXAM_IDS.map((id) => {
            const exam = getExam(id);
            const total = exam.passages.reduce((n, p) => n + p.questions.length, 0);
            return (
              <Card key={id} className="flex flex-col justify-between p-6">
                <div>
                  <h2 className="font-semibold">{exam.title}</h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    {total} questions · {exam.passages.length} passages
                  </p>
                </div>
                <ButtonLink href={`/exam/${id}`} className="mt-5 self-start">
                  Start
                </ButtonLink>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Your past attempts</h2>
        {!attempts || attempts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">You haven&apos;t taken a full exam yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {attempts.map((a) => (
              <Link
                key={a.id}
                href={`/exam/${a.exam_id}/results/${a.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-bg-soft px-4 py-3 hover:bg-bg-raised"
              >
                <div>
                  <div className="font-medium">{getExam(a.exam_id).title}</div>
                  <div className="text-xs text-ink-soft">
                    {new Date(a.completed_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="brand">
                    {a.raw_correct}/{a.raw_total}
                  </Badge>
                  <span className="text-lg font-bold text-brand-dark">{a.scale_score}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
