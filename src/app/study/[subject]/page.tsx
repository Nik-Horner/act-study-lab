import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/study/${subject}`);
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("target_score,test_date")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Your account could not be loaded. Please retry.");
  if (!profile?.target_score || !profile.test_date) redirect("/dashboard");
  return (
    <Suspense>
      <Dashboard subjectOverride={subject as "math" | "science" | "reading"} />
    </Suspense>
  );
}
