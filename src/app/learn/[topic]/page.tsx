import { getTopic as getActTopic } from "@/lib/act/content";
import { LessonView } from "@/components/act/StudyClient";
import { notFound } from "next/navigation";
import { getTopic, getLesson } from "@/lib/content";
import { renderStem } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { topicStatus } from "@/lib/mastery";
import { QuickCheck } from "./QuickCheck";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic: slug } = await params;
  if (getActTopic(slug)) return <LessonView slug={slug} />;

  const topic = getTopic(slug);
  if (!topic) notFound();

  let lesson;
  try {
    lesson = getLesson(slug);
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let progressRow;
  if (user) {
    const { data } = await supabase
      .from("topic_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("topic_slug", slug)
      .maybeSingle();
    progressRow = data ?? undefined;
  }

  const status = topicStatus(progressRow);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone="brand">{topic.category}</Badge>
          {status === "mastered" && <Badge tone="good">Mastered</Badge>}
          {status === "practicing" && <Badge tone="warn">Practicing</Badge>}
        </div>
        <h1 className="text-2xl font-semibold text-ink">{lesson.title}</h1>
        <p className="mt-2 text-ink-soft">{lesson.intro || topic.blurb}</p>
      </div>

      {lesson.sections.map((section, i) => (
        <section key={i} className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">{section.heading}</h2>
          {section.body.map((p, j) => (
            <p key={j} className="text-ink-soft">
              {p}
            </p>
          ))}
          {section.examples && section.examples.length > 0 && (
            <div className="space-y-2">
              {section.examples.map((ex, k) => (
                <div
                  key={k}
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    ex.good
                      ? "border-good bg-good-soft text-good"
                      : "border-bad bg-bad-soft text-bad"
                  }`}
                >
                  {ex.label && (
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide">
                      {ex.label}
                    </div>
                  )}
                  <div
                    className="text-ink"
                    dangerouslySetInnerHTML={{ __html: renderStem(ex.text) }}
                  />
                </div>
              ))}
            </div>
          )}
          {section.tip && (
            <div className="rounded-xl border border-brand-soft bg-brand-soft px-4 py-3 text-sm text-brand-dark">
              <span className="font-semibold">Tip · </span>
              {section.tip}
            </div>
          )}
        </section>
      ))}

      {lesson.check.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Quick check</h2>
          <QuickCheck checks={lesson.check} />
        </section>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="font-semibold text-ink">Ready to drill?</p>
          <p className="text-sm text-ink-soft">
            Practice {lesson.title} questions until it&apos;s automatic.
          </p>
        </div>
        <ButtonLink href={`/drill/${slug}`}>Start drill →</ButtonLink>
      </Card>
    </div>
  );
}
