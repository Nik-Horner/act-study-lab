export interface PlanItem {
  id: string;
  title: string;
  href: string;
  minutes: number;
}

export interface PlanDay {
  date: string;
  label: string;
  isToday: boolean;
  items: PlanItem[];
}

interface Block {
  key: string;
  title: string;
  href: string;
  weight: number;
}

const scienceMixed = "/drill/mixed?subject=science";
const mathHard = "/drill/hard?subject=math";
const scienceReview = "/drill/misses?subject=science";
const mathReview = "/drill/misses?subject=math";
const officialPractice =
  "https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep/act-online-test-sample-questions.html";

export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDate(date) === value
    ? date
    : null;
}

function calendarDistance(from: Date, to: Date): number {
  return Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86_400_000,
  );
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function block(
  key: string,
  title: string,
  href: string,
  weight: number,
): Block {
  return { key, title, href, weight };
}

/** Allocate the available session without inflating a timed ACT section. */
function splitBlocks(
  date: string,
  budget: number,
  blocks: Block[],
): PlanItem[] {
  const totalWeight = blocks.reduce((total, item) => total + item.weight, 0);
  let assigned = 0;
  return blocks
    .map((item, index) => {
      const minutes =
        index === blocks.length - 1
          ? budget - assigned
          : Math.floor((budget * item.weight) / totalWeight);
      assigned += minutes;
      return {
        id: `${date}:${item.key}`,
        title: item.title,
        href: item.href,
        minutes,
      };
    })
    .filter((item) => item.minutes > 0);
}

function fullSection(
  date: string,
  budget: number,
  subject: "math" | "science" | "reading",
  form = 1,
): PlanItem[] {
  const minutes = subject === "math" ? 50 : 40;
  const label =
    subject === "math" ? "Math" : subject === "reading" ? "Reading" : "Science";
  if (budget < minutes + 10) {
    return splitBlocks(date, budget, [
      block(
        `${subject}-timed-set`,
        `${label}: timed digital question set`,
        subject === "reading"
          ? "/drill/mixed?subject=reading"
          : subject === "math"
            ? mathHard
            : scienceMixed,
        2,
      ),
      block(
        `${subject}-set-review`,
        `${label}: review every miss and uncertain answer`,
        subject === "reading"
          ? "/drill/misses?subject=reading"
          : subject === "math"
            ? mathReview
            : scienceReview,
        1,
      ),
    ]);
  }
  return [
    {
      id: `${date}:${subject}-section-${form}`,
      title: `${label}: full digital practice section ${form}`,
      href: `/exam/${subject}-${form}`,
      minutes,
    },
    {
      id: `${date}:${subject}-section-review`,
      title: `${label}: explain misses, then redo without the solution`,
      href:
        subject === "reading"
          ? "/drill/misses?subject=reading"
          : subject === "math"
            ? mathReview
            : scienceReview,
      minutes: budget - minutes,
    },
  ];
}

function stageItems(stage: number, date: string, budget: number): PlanItem[] {
  switch (stage) {
    case 0:
      return splitBlocks(date, budget, [
        block(
          "science-diagnostic",
          "Science: focused diagnostic, record timing and confidence",
          scienceMixed,
          3,
        ),
        block(
          "science-diagnostic-review",
          "Science: classify misses and find the evidence",
          scienceReview,
          3,
        ),
        block(
          "math-hard-baseline",
          "Math: a short hard-question baseline",
          mathHard,
          1,
        ),
      ]);
    case 1:
      return splitBlocks(date, budget, [
        block(
          "science-data",
          "Science: read axes, units, tables, and trends",
          "/learn/science-data-reading",
          2,
        ),
        block(
          "science-design",
          "Science: variables, controls, and experimental design",
          "/learn/science-experimental-design",
          2,
        ),
        block(
          "science-data-drill",
          "Science: timed data questions, then review",
          scienceMixed,
          3,
        ),
      ]);
    case 2:
      return fullSection(date, budget, "math");
    case 3:
      return splitBlocks(date, budget, [
        block(
          "science-interpolation",
          "Science: interpolate and compare trends",
          "/learn/science-trends-interpolation",
          2,
        ),
        block(
          "science-viewpoints",
          "Science: map the claims in conflicting viewpoints",
          "/learn/science-conflicting-viewpoints",
          2,
        ),
        block(
          "science-viewpoints-drill",
          "Science: timed mixed practice and evidence review",
          scienceMixed,
          3,
        ),
      ]);
    case 4:
      return fullSection(date, budget, "science");
    case 5:
      return splitBlocks(date, budget, [
        block(
          "math-geometry",
          "Math: repair geometry gaps",
          "/learn/math-geometry",
          1,
        ),
        block(
          "math-trigonometry",
          "Math: repair trigonometry gaps",
          "/learn/math-trigonometry",
          1,
        ),
        block(
          "math-hard-set",
          "Math: hard questions with a first-pass skip strategy",
          mathHard,
          3,
        ),
        block(
          "science-retrieval",
          "Science: redo missed questions without notes",
          scienceReview,
          2,
        ),
      ]);
    case 6:
      return splitBlocks(date, budget, [
        block(
          "science-models",
          "Science: connect models and evidence",
          "/learn/science-models-evidence",
          2,
        ),
        block(
          "science-foundations",
          "Science: check the essential scientific foundations",
          "/learn/science-scientific-foundations",
          1,
        ),
        block(
          "science-weak",
          "Science: drill the weakest skills, then explain each answer",
          "/drill/weak?subject=science",
          4,
        ),
      ]);
    case 7:
      return fullSection(date, budget, "math", 2);
    case 8:
      return fullSection(date, budget, "science", 2);
    case 9:
      return splitBlocks(date, budget, [
        block(
          "science-weak-return",
          "Science: timed practice on the weakest skills",
          "/drill/weak?subject=science",
          3,
        ),
        block(
          "math-last-gaps",
          "Math: close the remaining hard-question gaps",
          mathHard,
          2,
        ),
        block(
          "science-evidence",
          "Science: prove each missed answer from the passage",
          scienceReview,
          2,
        ),
      ]);
    case 10:
      if (budget < 50) {
        return splitBlocks(date, budget, [
          block(
            "science-pacing",
            "Science: rehearse pacing, flagging, and the final pass",
            scienceMixed,
            3,
          ),
          block(
            "science-last-misses",
            "Science: redo unresolved misses",
            scienceReview,
            2,
          ),
          block(
            "math-accuracy",
            "Math: rehearse units, signs, and careless-error checks",
            mathHard,
            2,
          ),
        ]);
      }
      const reviewMinutes = Math.max(10, Math.floor((budget - 40) / 2));
      return [
        {
          id: `${date}:science-official-validation`,
          title:
            "Science: validate readiness with a fresh official digital section",
          href: officialPractice,
          minutes: 40,
        },
        {
          id: `${date}:science-official-review`,
          title:
            "Science: review the official answer key and practice remaining gaps",
          href: "/drill/weak?subject=science",
          minutes: reviewMinutes,
        },
        {
          id: `${date}:math-accuracy`,
          title: "Math: rehearse units, signs, and careless-error checks",
          href: mathHard,
          minutes: budget - 40 - reviewMinutes,
        },
      ].filter((item) => item.minutes > 0);
    default:
      // Keep the day before the test deliberately light.
      return splitBlocks(date, Math.min(budget, 45), [
        block(
          "science-light-review",
          "Science: light review of your evidence and pacing notes",
          "/study/science",
          4,
        ),
        block(
          "math-light-review",
          "Math: light review of formulas and error patterns",
          "/study/math",
          3,
        ),
        block(
          "digital-checklist",
          "Digital ACT: confirm admission, device rules, calculator, and rest",
          "/exam",
          2,
        ),
      ]);
  }
}

type PlanFocus = "math-science" | "reading";

function readingItems(stage: number, date: string, budget: number): PlanItem[] {
  const mixed = "/drill/mixed?subject=reading",
    review = "/drill/misses?subject=reading";
  if (stage === 4 || stage === 8)
    return fullSection(date, budget, "reading", stage === 4 ? 1 : 2);
  if (stage === 11)
    return splitBlocks(date, Math.min(budget, 45), [
      block(
        "reading-light-review",
        "Reading: light review of evidence and pacing notes",
        "/study/reading",
        2,
      ),
      block(
        "reading-digital-checklist",
        "Digital ACT: confirm admission, device rules, and rest",
        "/exam",
        1,
      ),
    ]);
  if (stage === 0)
    return splitBlocks(date, budget, [
      block(
        "reading-diagnostic",
        "Reading: diagnostic with timing and confidence",
        mixed,
        2,
      ),
      block(
        "reading-diagnostic-review",
        "Reading: locate evidence for every miss",
        review,
        1,
      ),
    ]);
  if (stage === 10 && budget >= 50)
    return [
      {
        id: `${date}:reading-official-validation`,
        title: "Reading: fresh official digital practice",
        href: officialPractice,
        minutes: 40,
      },
      {
        id: `${date}:reading-official-review`,
        title: "Reading: review official explanations and remaining gaps",
        href: review,
        minutes: budget - 40,
      },
    ];
  const skills = [
    "main-idea",
    "details",
    "inference",
    "vocabulary",
    "craft",
    "integration",
  ];
  const skill = skills[Math.max(0, stage - 1) % skills.length];
  const names: Record<string, string> = {
    "main-idea": "main ideas and summaries",
    details: "details, sequence, and cause",
    inference: "evidence-based inference",
    vocabulary: "words in context",
    craft: "purpose, tone, and structure",
    integration: "paired texts and visual evidence",
  };
  return splitBlocks(date, budget, [
    block(
      `reading-${skill}-lesson`,
      `Reading: ${names[skill]}`,
      `/learn/reading-${skill}`,
      2,
    ),
    block(
      `reading-${skill}-drill`,
      "Reading: apply the skill to fresh passages",
      `/drill/reading-${skill}`,
      2,
    ),
    block(
      `reading-${skill}-review`,
      "Reading: prove misses and uncertain answers from the text",
      review,
      1,
    ),
  ]);
}

/**
 * A preparation schedule ending the day before the test. It starts today,
 * gives Science the majority of repair time, and never schedules a test on
 * test day. A later date adds skill-building days before the final sprint.
 */
export function buildSchedule(
  testDateStr: string,
  minutesPerDay: number,
  now = new Date(),
  focus: PlanFocus = "math-science",
): PlanDay[] {
  const examDate = parseDate(testDateStr);
  if (!examDate || !Number.isFinite(now.getTime())) return [];
  const today = parseDate(localDate(now))!;
  const days = calendarDistance(today, examDate);
  if (days <= 0 || days > 366) return [];
  const budget = Number.isFinite(minutesPerDay)
    ? Math.max(15, Math.min(240, Math.floor(minutesPerDay)))
    : 75;
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(today, index);
    const date = localDate(day);
    const remaining = calendarDistance(day, examDate);
    // Anchor tasks to the test date so tomorrow does not move checked tasks.
    const stage =
      remaining > 12
        ? remaining % 3 === 2
          ? 5
          : remaining % 2 === 0
            ? 1
            : 6
        : 12 - remaining;
    return {
      date,
      label: day.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      isToday: index === 0,
      items:
        focus === "reading"
          ? readingItems(stage, date, budget)
          : stageItems(stage, date, budget),
    };
  });
}

export interface PlanProgress {
  startDate?: string;
  completedTaskIds: readonly string[];
  completionDates?: Readonly<Record<string, string>>;
}

export interface StudyPlan {
  days: PlanDay[];
  /** Still unfinished, but cannot fit before the fixed test date. */
  deferred: PlanItem[];
}

/**
 * Move unfinished sessions forward, preserving task IDs and section + review
 * pairs. Checks made today stay visible and still occupy today's time; checking
 * a task never expands a completed session into another day's workload.
 */
export function buildStudyPlan(
  testDateStr: string,
  minutesPerDay: number,
  progress: PlanProgress,
  now = new Date(),
  focus: PlanFocus = "math-science",
): StudyPlan {
  const days = buildSchedule(testDateStr, minutesPerDay, now, focus).map(
    (day) => ({
      ...day,
      items: [] as PlanItem[],
    }),
  );
  if (!days.length) return { days, deferred: [] };
  const today = days[0].date;
  const examDate = parseDate(testDateStr)!;
  const earliest = localDate(addDays(examDate, -366));
  const requestedStart =
    progress.startDate ?? localDate(addDays(examDate, -12));
  const start = parseDate(requestedStart);
  const startDate = start
    ? requestedStart < earliest
      ? earliest
      : requestedStart > today
        ? today
        : requestedStart
    : today;
  const canonical = buildSchedule(
    testDateStr,
    minutesPerDay,
    parseDate(startDate)!,
    focus,
  );
  const checks = new Set(progress.completedTaskIds);
  const allItems = canonical.flatMap((day) => day.items);
  const unfinished = (item: PlanItem) => !checks.has(item.id);
  days[0].items = allItems.filter((item) => {
    if (!checks.has(item.id)) return false;
    // Legacy checks were completed on their original calendar day.
    const completedOn =
      progress.completionDates?.[item.id] ?? item.id.slice(0, 10);
    return completedOn === today;
  });
  const sessions = canonical
    .slice(0, -1)
    .map((day) => ({ date: day.date, items: day.items.filter(unfinished) }))
    .filter((session) => session.items.length > 0);
  const budget = Number.isFinite(minutesPerDay)
    ? Math.max(15, Math.min(240, Math.floor(minutesPerDay)))
    : 75;
  let next = 0;
  // Reserve the day before the ACT for the original light review and rest.
  for (const day of days.slice(0, -1)) {
    let remaining = Math.max(
      0,
      budget - day.items.reduce((sum, item) => sum + item.minutes, 0),
    );
    while (next < sessions.length) {
      const session = sessions[next];
      if (session.date > day.date) break;
      const minutes = session.items.reduce(
        (sum, item) => sum + item.minutes,
        0,
      );
      if (minutes > remaining) break;
      day.items.push(...session.items);
      remaining -= minutes;
      next += 1;
    }
  }
  const finalDay = days.at(-1)!;
  const lightItems = canonical.at(-1)!.items.filter(unfinished);
  let available = Math.max(
    0,
    budget - finalDay.items.reduce((sum, item) => sum + item.minutes, 0),
  );
  const deferredLight: PlanItem[] = [];
  for (const item of lightItems) {
    if (item.minutes <= available) {
      finalDay.items.push(item);
      available -= item.minutes;
    } else deferredLight.push(item);
  }
  // Keep normal checkbox rows in place even as completed items are pinned.
  const order = new Map(allItems.map((item, index) => [item.id, index]));
  days[0].items.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return {
    days,
    deferred: [
      ...sessions.slice(next).flatMap((session) => session.items),
      ...deferredLight,
    ],
  };
}
