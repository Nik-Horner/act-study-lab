import { getExams as getActExams } from "@/lib/act/content";
import { ExamRunner } from "@/components/act/ExamRunner";
import { StudyPageHeader } from "@/components/StudyPageHeader";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { getExam } from "@/lib/content";
import { ResultSummary } from "@/components/ResultSummary";
import { EnglishAnswerReview } from "@/components/EnglishAnswerReview";
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
      <StudyPageHeader
        title="English results"
        subject="english"
        description="Review the evidence behind each answer, then return to the matching course lesson when a method needs work."
        back={{ href: "/exam", label: "Timed sections" }}
      />
      <ResultSummary
        correct={attempt.raw_correct}
        total={attempt.raw_total}
        seconds={attempt.duration_seconds}
        unanswered={
          [...answersByNumber.values()].filter(
            (answer) => answer.picked === null,
          ).length
        }
      />
      <p className="study-caption">
        {exam.title} ·{" "}
        {new Date(attempt.completed_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <EnglishAnswerReview
        items={exam.passages.flatMap((passage) =>
          passage.questions.flatMap((q) => {
            const answer = answersByNumber.get(q.number);
            return answer
              ? [
                  {
                    number: q.number,
                    topic: answer.topic,
                    prompt: questionTextByNumber.get(q.number) ?? "",
                    underline: underlineByNumber.get(q.number) ?? "",
                    choices: choicesByNumber.get(q.number) ?? [],
                    picked: answer.picked,
                    answer: answer.answer,
                    correct: answer.correct,
                    explanation: answer.explanation,
                    passage: passage.title,
                  },
                ]
              : [];
          }),
        )}
      />

      <div className="flex gap-3">
        <ButtonLink href={`/exam/${exam.id}`}>Retake this exam</ButtonLink>
        <ButtonLink href="/exam" variant="ghost">
          Back to exams
        </ButtonLink>
      </div>
    </div>
  );
}
