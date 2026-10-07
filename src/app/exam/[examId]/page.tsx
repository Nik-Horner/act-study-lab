import { getExams as getActExams } from "@/lib/act/content";
import { ExamRunner } from "@/components/act/ExamRunner";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getExam } from "@/lib/content";
import ExamClient from "./ExamClient";

export default async function ExamRunnerPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  if (getActExams().some((exam) => exam.id === examId))
    return (
      <Suspense>
        <ExamRunner examId={examId} />
      </Suspense>
    );
  const exam = getExamOrNotFound(examId);
  return <ExamClient exam={exam} />;
}

function getExamOrNotFound(examId: string) {
  try {
    return getExam(examId);
  } catch {
    notFound();
  }
}
