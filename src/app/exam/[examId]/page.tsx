import { getExams as getActExams } from "@/lib/act/content";
import { ExamRunner } from "@/components/act/ExamRunner";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getExam } from "@/lib/content";
import ExamClient from "./ExamClient";
import { createClient } from "@/lib/supabase/server";

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
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/exam/${examId}`)}`);
  return (
    <ExamClient key={`${user.id}:${exam.id}`} exam={exam} userId={user.id} />
  );
}

function getExamOrNotFound(examId: string) {
  try {
    return getExam(examId);
  } catch {
    notFound();
  }
}
