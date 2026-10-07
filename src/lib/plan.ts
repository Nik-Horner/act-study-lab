/* Day-by-day study schedule, ported from the old js/plan.js.
   Pure function: no localStorage, no DOM, no hardcoded calendar dates —
   every user gets their own schedule generated from their own test_date. */
import type { Topic } from "@/lib/content";

export interface PlanItem {
  kind: "learn" | "exam" | "review" | "weak" | "rest";
  slug?: string;
  title?: string;
  savedKey?: string;
}

export interface PlanDay {
  date: Date;
  label: string;
  dayNum: number;
  isToday: boolean;
  isPast: boolean;
  items: PlanItem[];
}

export interface Schedule {
  days: PlanDay[];
  examDate: Date;
  todayIndex: number;
}

function fmtDay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function itemKey(item: PlanItem, dayNum: number, idx: number): string {
  return item.savedKey ?? `d${dayNum}-${idx}-${item.kind}`;
}

/* Build a fixed schedule anchored so the last study day lands the day before test_date.
   Topics from the "final" part (bonus/test-day-patterns content) are shown
   in the topic grid but not force-scheduled into a day. */
export function buildSchedule(
  topics: Topic[],
  testDateStr: string,
  now = new Date(),
  timeZone = "America/Chicago",
): Schedule {
  const scheduledTopics = topics.filter((t) => t.part !== "final");

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const today = new Date(date + "T12:00:00");
  const examDate = new Date(testDateStr + "T12:00:00");

  const reserve = 2; // exam+review day, then weak-topics+rest day
  const legacyTotal =
    Math.max(1, Math.ceil(scheduledTopics.length / 2.5)) + reserve;
  const total = Math.max(12, legacyTotal);
  const topicDayCount = total - reserve;

  const planStart = new Date(examDate);
  planStart.setDate(planStart.getDate() - total); // Keep the final light day before the ACT.

  const rawIndex = Math.round(
    (today.getTime() - planStart.getTime()) / 86400000,
  );

  // Test day has come and gone (or the whole plan already elapsed) — nothing left to show.
  if (rawIndex >= total) {
    return { days: [], examDate, todayIndex: 0 };
  }
  const todayIndex = Math.max(0, rawIndex);

  const dates: Date[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(planStart);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  const items: PlanItem[][] = dates.map(() => []);

  // Spread topics evenly across the topic-days.
  const base = Math.floor(scheduledTopics.length / topicDayCount);
  const extra = scheduledTopics.length % topicDayCount;
  let ti = 0;
  for (let i = 0; i < topicDayCount; i++) {
    const count = base + (i < extra ? 1 : 0);
    for (let k = 0; k < count && ti < scheduledTopics.length; k++) {
      items[i].push({
        kind: "learn",
        slug: scheduledTopics[ti].slug,
        title: scheduledTopics[ti].title,
      });
      ti++;
    }
  }
  items[total - 2].push({
    kind: "exam",
    savedKey: `d${legacyTotal - 1}-0-exam`,
  });
  items[total - 2].push({
    kind: "review",
    savedKey: `d${legacyTotal - 1}-1-review`,
  });
  items[total - 1].push({ kind: "weak", savedKey: `d${legacyTotal}-0-weak` });
  items[total - 1].push({ kind: "rest", savedKey: `d${legacyTotal}-1-rest` });

  const days: PlanDay[] = dates.map((date, i) => ({
    date,
    label: fmtDay(date),
    dayNum: i + 1,
    isToday: rawIndex >= 0 && i === todayIndex,
    isPast: i < todayIndex,
    items: items[i],
  }));

  return { days, examDate, todayIndex };
}
