/* Day-by-day study schedule, ported from the old js/plan.js.
   Pure function: no localStorage, no DOM, no hardcoded calendar dates —
   every user gets their own schedule generated from their own test_date. */
import type { Topic } from "@/lib/content";

export interface PlanItem {
  kind: "learn" | "exam" | "review" | "weak" | "rest";
  slug?: string;
  title?: string;
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
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function itemKey(item: PlanItem, dayNum: number, idx: number): string {
  return `d${dayNum}-${idx}-${item.kind}`;
}

/* Build a fixed schedule anchored so the last day lands on test_date.
   Topics from the "final" part (bonus/test-day-patterns content) are shown
   in the topic grid but not force-scheduled into a day. */
export function buildSchedule(topics: Topic[], testDateStr: string): Schedule {
  const scheduledTopics = topics.filter((t) => t.part !== "final");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDate = new Date(testDateStr + "T00:00:00");

  const reserve = 2; // exam+review day, then weak-topics+rest day
  const topicDayCount = Math.max(1, Math.ceil(scheduledTopics.length / 2.5)); // ~2-3 topics/day
  const total = topicDayCount + reserve;

  const planStart = new Date(examDate);
  planStart.setDate(planStart.getDate() - (total - 1)); // last day (index total-1) = test_date

  const rawIndex = Math.round((today.getTime() - planStart.getTime()) / 86400000);

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
      items[i].push({ kind: "learn", slug: scheduledTopics[ti].slug, title: scheduledTopics[ti].title });
      ti++;
    }
  }
  items[total - 2].push({ kind: "exam" });
  items[total - 2].push({ kind: "review" });
  items[total - 1].push({ kind: "weak" });
  items[total - 1].push({ kind: "rest" });

  const days: PlanDay[] = dates.map((date, i) => ({
    date,
    label: fmtDay(date),
    dayNum: i + 1,
    isToday: i === todayIndex,
    isPast: i < todayIndex,
    items: items[i],
  }));

  return { days, examDate, todayIndex };
}
