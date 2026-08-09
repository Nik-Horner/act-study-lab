import { notFound } from "next/navigation";
import { getExam } from "@/lib/content";
import ExamClient from "./ExamClient";

export default async function ExamRunnerPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
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
