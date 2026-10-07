import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Dashboard } from "@/components/act/StudyClient";
export default async function SubjectStudyPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;
  if (!["math", "science", "reading"].includes(subject)) notFound();
  return (
    <Suspense>
      <Dashboard subjectOverride={subject as "math" | "science" | "reading"} />
    </Suspense>
  );
}
