import { readStudySettings } from "@/lib/account-settings";
import Link from "next/link";
import { SubjectNav } from "@/components/SubjectNav";
import { createClient } from "@/lib/supabase/server";
import { getTopics, getTopicParts } from "@/lib/content";
import { daysUntil } from "@/lib/format";
import {
  buildSchedule,
  itemKey,
  type PlanDay,
  type PlanItem,
} from "@/lib/plan";
import {
  topicStatus,
  masteryProgress,
  type TopicProgressRow,
} from "@/lib/mastery";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ButtonLink } from "@/components/ui/Button";
import { AccountForm } from "@/components/AccountForm";
import { PlanChecklist, type ChecklistItem } from "./PlanChecklist";

const ITEM_META: Record<
  Exclude<PlanItem["kind"], "learn">,
  { title: string; subtitle: string; href: string | null }
> = {
  exam: {
    title: "Take a full practice exam",
    subtitle: "50 questions, 35 minutes — simulate test day.",
    href: "/exam",
  },
  review: {
    title: "Review every exam miss",
    subtitle: "Read each explanation and know the rule.",
    href: "/exam",
  },
  weak: {
    title: "Drill your weakest topics",
    subtitle: "Get each one back toward an 8-streak.",
    href: "/drill/weak",
  },
  rest: {
    title: "Pack, then rest",
    subtitle: "ID, ticket, calculator — then close the laptop.",
    href: null,
  },
};

function resolveItems(
  day: PlanDay,
  progressBySlug: Map<string, TopicProgressRow>,
  checkedKeys: Set<string>,
): ChecklistItem[] {
  return day.items.map((item, idx) => {
    const key = itemKey(item, day.dayNum, idx);
    if (item.kind === "learn" && item.slug) {
      const mastered =
        topicStatus(progressBySlug.get(item.slug)) === "mastered";
      return {
        key,
        title: item.title ?? item.slug,
        subtitle: mastered
          ? "Mastered"
          : "Read the lesson, then drill to an 8-streak.",
        href: `/learn/${item.slug}`,
        auto: true,
        checked: mastered,
      };
    }
    const meta = ITEM_META[item.kind as Exclude<PlanItem["kind"], "learn">];
    return {
      key,
      title: meta.title,
      subtitle: meta.subtitle,
      href: meta.href,
      auto: false,
      checked: checkedKeys.has(key),
    };
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // the proxy already gates this route to logged-in users
  }

  const [{ data: profile }, { data: progressRows }, { data: checkRows }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("topic_progress").select("*").eq("user_id", user.id),
      supabase.from("plan_checks").select("*").eq("user_id", user.id),
    ]);

  if (!profile || profile.target_score === null || profile.test_date === null) {
    return (
      <AccountForm
        variant="onboarding"
        initial={{
          display_name: profile?.display_name ?? null,
          current_score: profile?.current_score ?? null,
          target_score: profile?.target_score ?? null,
          test_date: profile?.test_date ?? null,
          study_settings: readStudySettings(
            user.user_metadata,
            profile?.current_score ?? null,
          ),
        }}
      />
    );
  }

  const topics = getTopics();
  const parts = getTopicParts();
  const progressBySlug = new Map(
    (progressRows ?? []).map((r) => [r.topic_slug, r]),
  );
  const checkedKeys = new Set((checkRows ?? []).map((r) => r.item_key));

  const masteredCount = topics.filter(
    (t) => topicStatus(progressBySlug.get(t.slug)) === "mastered",
  ).length;
  const nextTopic =
    topics.find(
      (t) => topicStatus(progressBySlug.get(t.slug)) !== "mastered",
    ) ?? topics[0];

  const days = daysUntil(profile.test_date);
  const testDateNice = new Date(
    profile.test_date + "T00:00:00",
  ).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  const schedule = buildSchedule(topics, profile.test_date);
  const today =
    schedule.days.length > 0 ? schedule.days[schedule.todayIndex] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <SubjectNav subject="english" />
      {/* Hero */}
      <section className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-border bg-bg-soft p-6 shadow-[var(--shadow-card)]">
        <div>
          <h1 className="text-2xl font-bold">
            Let&apos;s get a {profile.target_score} on English.
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Learn every rule, then drill it until it&apos;s automatic.
          </p>
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-brand">{days}</div>
            <div className="text-xs text-ink-faint">
              days to test ({testDateNice})
            </div>
          </div>
          {profile.current_score !== null && (
            <div className="text-center">
              <div className="text-3xl font-bold text-ink-soft">
                {profile.current_score}
              </div>
              <div className="text-xs text-ink-faint">current score</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-3xl font-bold">{profile.target_score}</div>
            <div className="text-xs text-ink-faint">target score</div>
          </div>
        </div>
      </section>

      {/* Summary bar */}
      <section>
        <Card className="flex flex-wrap items-center gap-6 p-6">
          <div>
            <div className="text-2xl font-bold">
              {masteredCount}/{topics.length}
            </div>
            <div className="text-xs text-ink-faint">topics mastered</div>
          </div>
          <ProgressBar
            percent={(masteredCount / topics.length) * 100}
            tone="good"
            className="min-w-[140px] flex-1"
          />
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/learn/${nextTopic.slug}`} size="sm">
              Continue studying
            </ButtonLink>
            <ButtonLink href="/drill/misses" variant="ghost" size="sm">
              Review misses
            </ButtonLink>
            <ButtonLink href="/drill/weak" variant="ghost" size="sm">
              Drill weak topics
            </ButtonLink>
            <ButtonLink href="/exam" variant="ghost" size="sm">
              Take a full exam
            </ButtonLink>
          </div>
        </Card>
      </section>

      {/* Today */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
          {today
            ? `${today.isToday ? "Today" : "Upcoming"} · ${today.label} · Day ${today.dayNum}`
            : "Today"}
        </h2>
        {today ? (
          <Card className="p-6">
            <PlanChecklist
              items={resolveItems(today, progressBySlug, checkedKeys)}
            />
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <p className="font-semibold">
              No study days left on the plan — test day is here (or has passed).
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Go take the ACT. Good luck.
            </p>
          </Card>
        )}
      </section>

      {/* Topic grid, grouped by part */}
      <section className="space-y-8">
        {parts.map((part) => {
          const partTopics = topics.filter((t) => t.part === part.id);
          if (!partTopics.length) return null;
          return (
            <div key={part.id}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                {part.title}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {partTopics.map((t) => {
                  const row = progressBySlug.get(t.slug);
                  const status = topicStatus(row);
                  const progress = masteryProgress(row);
                  const accuracy =
                    row && row.attempts > 0
                      ? Math.round((row.correct / row.attempts) * 100)
                      : null;
                  return (
                    <Link key={t.slug} href={`/learn/${t.slug}`}>
                      <Card className="h-full p-4 transition-colors hover:border-brand">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold">
                            {t.num}. {t.title}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                          {t.blurb}
                        </p>
                        <ProgressBar
                          percent={progress * 100}
                          tone={status === "mastered" ? "good" : "brand"}
                          className="mt-3"
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <Badge
                            tone={
                              status === "mastered"
                                ? "good"
                                : status === "practicing"
                                  ? "brand"
                                  : "neutral"
                            }
                          >
                            {status === "mastered"
                              ? "Mastered"
                              : status === "practicing"
                                ? "Practicing"
                                : "Not started"}
                          </Badge>
                          <span className="text-xs text-ink-faint">
                            {accuracy !== null ? `${accuracy}% acc` : ""}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* Full schedule */}
      {schedule.days.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            Your plan to test day
          </h2>
          <Card className="divide-y divide-border">
            {schedule.days.map((day) => {
              const resolved = resolveItems(day, progressBySlug, checkedKeys);
              const doneCount = resolved.filter((it) => it.checked).length;
              const label = resolved.map((it) => it.title).join(" · ");
              return (
                <div
                  key={day.dayNum}
                  className={`flex flex-wrap items-center gap-3 p-3 text-sm ${day.isToday ? "bg-brand-soft" : ""}`}
                >
                  <span className="w-28 shrink-0 font-medium">
                    {day.isToday ? "Today" : `Day ${day.dayNum}`}
                    <span className="block text-xs font-normal text-ink-faint">
                      {day.label}
                    </span>
                  </span>
                  <span className="flex-1 text-ink-soft">{label}</span>
                  <span className="text-xs text-ink-faint">
                    {doneCount === resolved.length
                      ? "✓ done"
                      : `${doneCount}/${resolved.length}`}
                  </span>
                </div>
              );
            })}
          </Card>
        </section>
      )}
    </div>
  );
}
