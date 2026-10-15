import { getExams as getActExams } from "@/lib/act/content";
import { ExamRunner } from "@/components/act/ExamRunner";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getExam } from "@/lib/content";
import { LETTERS } from "@/lib/format";
import { parsePassage } from "@/lib/passage";
import { createClient } from "@/lib/supabase/server";

interface StoredAnswer {
  number: number;
  topic: string;
  picked: number | null;
  correct: boolean;
  answer: number;
  explanation: string;
}

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ examId: string; attemptId: string }>;
}) {
  const { examId, attemptId } = await params;
  if (getActExams().some((exam) => exam.id === examId))
    return (
      <Suspense>
        <ExamRunner examId={examId} attemptId={attemptId} />
      </Suspense>
    );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (!attempt || attempt.user_id !== user.id || attempt.exam_id !== examId)
    notFound();

  const exam = getExam(examId);
  const answersByNumber = new Map(
    (attempt.answers as unknown as StoredAnswer[]).map((a) => [a.number, a]),
  );

  const questionTextByNumber = new Map<number, string>();
  const choicesByNumber = new Map<number, string[]>();
  const underlineByNumber = new Map<number, string>();
  exam.passages.forEach((p) => {
    p.questions.forEach((q) => {
      questionTextByNumber.set(q.number, q.questionText);
      choicesByNumber.set(q.number, q.choices);
    });
    parsePassage(p.html).forEach((seg) => {
      if (seg.type === "blank") underlineByNumber.set(seg.number, seg.text);
    });
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center gap-8 rounded-2xl border border-border bg-bg-soft p-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-brand-dark">
            {attempt.raw_correct}/{attempt.raw_total}
          </div>
          <div className="text-xs uppercase tracking-wide text-ink-soft">
            Practice raw score
          </div>
        </div>
        <div className="flex flex-1 flex-wrap gap-8 text-sm">
          <div>
            <div className="text-lg font-semibold">
              {Math.round((attempt.raw_correct / attempt.raw_total) * 100)}%
            </div>
            <div className="text-ink-soft">Accuracy</div>
          </div>
          <div>
            <div className="text-lg font-semibold">
              {new Date(attempt.completed_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="text-ink-soft">Date</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{exam.title}</div>
            <div className="text-ink-soft">Exam</div>
          </div>
        </div>
      </section>

      <p className="text-sm leading-relaxed text-ink-soft">
        These original practice questions report raw accuracy. Use different
        official timed forms and your daily score checks to verify progress
        toward your ACT score goal.
      </p>

      {exam.passages.map((passage) => (
        <section key={passage.id}>
          <h2 className="mb-3 text-lg font-semibold">{passage.title}</h2>
          <div className="space-y-3">
            {passage.questions.map((q) => {
              const a = answersByNumber.get(q.number);
              if (!a) return null;
              const choices = choicesByNumber.get(q.number) ?? [];
              const underline = underlineByNumber.get(q.number) ?? "";
              return (
                <Card key={q.number} className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        a.correct ? "bg-good" : "bg-bad"
                      }`}
                    >
                      {q.number}
                    </span>
                    <div className="flex-1 space-y-2">
                      {underline ? (
                        <p className="text-sm text-ink-soft">
                          Underlined: <span className="ul">{underline}</span>
                        </p>
                      ) : null}
                      <p className="text-sm font-medium">
                        {questionTextByNumber.get(q.number)}
                      </p>
                      <p
                        className={`text-sm ${a.correct ? "text-good" : "text-bad"}`}
                      >
                        Your answer:{" "}
                        {a.picked === null
                          ? "blank"
                          : `${LETTERS[a.picked]}. ${choices[a.picked]}`}
                      </p>
                      {!a.correct && (
                        <p className="text-sm text-good">
                          Correct: {LETTERS[a.answer]}. {choices[a.answer]}
                        </p>
                      )}
                      <p className="text-sm text-ink-soft">{a.explanation}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex gap-3">
        <ButtonLink href={`/exam/${exam.id}`}>Retake this exam</ButtonLink>
        <ButtonLink href="/exam" variant="ghost">
          Back to exams
        </ButtonLink>
      </div>
    </div>
  );
}
