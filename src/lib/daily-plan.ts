import { createHash } from "node:crypto";
import {
  getTopics as englishTopics,
  getLesson as englishLesson,
  getQuestions as englishQuestions,
} from "./content";
import {
  getTopics,
  getLesson,
  getQuestions,
  type Lesson,
  type Question,
  getQuestion,
} from "./act/content";
import { blockUnits } from "./daily-flow";
import { DAILY_CURRICULUM } from "./daily-curriculum";
import { QUESTION_TARGET_SECONDS } from "./question-pacing";
export { dailyComplete } from "./daily-flow";
import type { StudySettings, AccountSubject } from "./account-settings";
export const DAILY_SUBJECTS: AccountSubject[] = [
  "english",
  "reading",
  "math",
  "science",
];
export interface DailyQuestion {
  id: string;
  subject: AccountSubject;
  topic: string;
  stem: string;
  questionText: string;
  choices: string[];
  answer: number;
  explanation: string;
  passage?: Question["passage"];
  category: string;
  difficulty: Question["difficulty"];
  phase?: "check" | "drill" | "review";
}
export interface DailyUnit {
  id: string;
  topic: string;
  title: string;
  lesson: Lesson;
  questions: DailyQuestion[];
  sectionIndices?: number[];
  practiceIds?: string[];
}
export interface DailyBlock {
  units?: DailyUnit[];
  reviewQuestions?: DailyQuestion[];
  subject: AccountSubject;
  topic: string;
  title: string;
  minutes: number;
  estimatedMinutes?: number;
  lesson: Lesson;
  questions: DailyQuestion[];
}
export interface DailyPlan {
  id: string;
  date: string;
  minutes: number;
  sequence: number;
  blocks: DailyBlock[];
  complete: boolean;
  completedDate?: string;
  formatVersion?: number;
  nextFocus?: Partial<Record<AccountSubject, string[]>>;
}
export function dailyId(value: string) {
  const hex = createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function dailyDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function dailyBudget(minutes: number, scores: StudySettings["scores"]) {
  const weights = DAILY_SUBJECTS.map((subject) =>
    Math.max(1, 36 - (scores[subject] ?? 28)),
  );
  const available = minutes - 40,
    total = weights.reduce((a, b) => a + b, 0);
  const allocations = weights.map(
    (weight) => 10 + Math.floor((available * weight) / total),
  );
  let extra = minutes - allocations.reduce((a, b) => a + b, 0);
  for (let i = 0; extra > 0; i++, extra--) allocations[i % 4]++;
  return allocations;
}
export function makeDailyPlan(
  userId: string,
  date: string,
  settings: StudySettings,
  sequence: number,
  focus?: DailyPlan["nextFocus"],
  recentQuestions: string[] = [],
): DailyPlan {
  const draft = DAILY_SUBJECTS.map((subject) => {
    const topics =
      subject === "english"
        ? englishTopics().filter((t) => t.part !== "final")
        : getTopics(subject);
    const scopes = topics.flatMap((topic) =>
      DAILY_CURRICULUM[topic.slug].map((scope, index) => ({
        topic,
        scope,
        index,
        id: `${subject}:${topic.slug}:scope:${index}`,
      })),
    );
    const start = (sequence * 2) % scopes.length;
    const preferred = (focus?.[subject] ?? []).flatMap((key) => {
      const exact = scopes.find((s) => s.id === key);
      return exact
        ? [exact]
        : scopes.filter((s) => s.topic.slug === key).slice(0, 1);
    });
    const ordered = [
      ...preferred,
      ...Array.from(
        { length: scopes.length },
        (_, i) => scopes[(start + i) % scopes.length],
      ),
    ].filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i);
    const used = new Set<string>();
    const units = ordered.slice(0, 2).map(({ topic, scope, id }) => {
      const full = (
        subject === "english"
          ? englishLesson(topic.slug)
          : getLesson(topic.slug)
      ) as Lesson;
      const bank =
        subject === "english"
          ? englishQuestions(topic.slug)
          : getQuestions(topic.slug);
      const pool = scope.practice.map((i) => bank[i]);
      if (pool.some((q) => !q))
        throw new Error(`Missing curriculum question for ${id}`);
      const cycle = Math.floor((sequence * 2) / scopes.length);
      const rotated = Array.from(
        { length: pool.length },
        (_, i) => pool[(cycle + i) % pool.length],
      )
        .filter((q) => !used.has(q.id))
        .sort(
          (a, b) =>
            Number(recentQuestions.includes(a.id)) -
            Number(recentQuestions.includes(b.id)),
        );
      const q = rotated[0];
      used.add(q.id);
      const lesson = sliceLesson(full, scope.sections, subject);
      return {
        id,
        topic: topic.slug,
        title: lesson.sections[0].heading,
        sectionIndices: scope.sections,
        practiceIds: rotated.map((q) => q.id),
        lesson,
        questions: [
          {
            ...q,
            subject,
            topic: topic.slug,
            phase: "drill" as const,
            category: q.category ?? "",
            difficulty: q.difficulty ?? "medium",
          },
        ],
      } as DailyUnit;
    });
    const reviewQuestions = makeReviewQuestions(subject, units, 0);
    return {
      subject,
      units,
      reviewQuestions,
      topic: units[0].topic,
      title: units[0].title,
      lesson: units[0].lesson,
      minutes: 0,
      questions: [...units.flatMap((u) => u.questions), ...reviewQuestions],
    } as DailyBlock;
  });
  const minimum = draft.map((block) => Math.ceil(estimateDailyBlock(block)));
  if (minimum.reduce((a, b) => a + b, 0) > settings.minutesPerDay)
    throw new Error("Curriculum exceeds the daily budget");
  const weights = DAILY_SUBJECTS.map((s) =>
    Math.max(1, 36 - (settings.scores[s] ?? 28)),
  );
  const extra = settings.minutesPerDay - minimum.reduce((a, b) => a + b, 0);
  const total = weights.reduce((a, b) => a + b, 0);
  const allocations = minimum.map(
    (min, i) => min + Math.floor((extra * weights[i]) / total),
  );
  let remainder =
    settings.minutesPerDay - allocations.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0; i++, remainder--) allocations[i % 4]++;
  draft.forEach((block, i) => {
    block.minutes = allocations[i];
    // More time buys more matched application, never another oversized lesson.
    for (let round = 0; round < 4; round++)
      for (const unit of block.units!) {
        const used = new Set(block.questions.map((q) => q.id));
        const id = unit.practiceIds!.find((id) => !used.has(id));
        const q =
          id &&
          (block.subject === "english"
            ? englishQuestions(unit.topic).find((q) => q.id === id)
            : getQuestion(id));
        if (!q) continue;
        const candidate = {
          ...q,
          subject: block.subject,
          topic: unit.topic,
          phase: "drill" as const,
          category: q.category ?? "",
          difficulty: q.difficulty ?? "medium",
        } as DailyQuestion;
        unit.questions.push(candidate);
        block.questions.push(candidate);
        if (estimateDailyBlock(block) > block.minutes) {
          unit.questions.pop();
          block.questions.pop();
        }
      }
    block.questions = [
      ...block.units!.flatMap((u) => u.questions),
      ...block.reviewQuestions!,
    ];
    block.estimatedMinutes = estimateDailyBlock(block);
  });
  return {
    id: dailyId(`${userId}:daily:${date}:${sequence}`),
    date,
    minutes: settings.minutesPerDay,
    sequence,
    blocks: draft,
    complete: false,
    formatVersion: 5,
  };
}
function sliceLesson(
  full: Lesson,
  indices: number[],
  subject: AccountSubject,
): Lesson {
  return {
    ...full,
    sections: indices.map((i) => {
      const section = full.sections[i];
      // Daily Reading uses one complete worked example for each rule. Every
      // additional example remains in the full lesson, available by its link.
      return subject === "reading"
        ? { ...section, examples: section.examples?.slice(0, 1) }
        : section;
    }),
    check: [],
  };
}
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
/** Planning estimate, not a speed test: slow teaching + application + corrections. */
export function estimateDailyBlock(block: DailyBlock) {
  const sections = blockUnits(block).flatMap((u) => u.lesson.sections);
  const teaching =
    sections.reduce(
      (n, s) =>
        n +
        words(
          [
            ...s.body,
            ...(s.examples ?? []).map((e) => e.text),
            s.tip ?? "",
          ].join(" "),
        ),
      0,
    ) / 180;
  const interaction =
    sections.reduce((n, s) => n + (s.examples?.length ?? 0) * 10, 0) / 60;
  const passages = new Map<string, string>();
  if (block.subject === "reading")
    for (const q of block.questions)
      if (q.passage) passages.set(q.passage.id, q.passage.context ?? "");
  const reading =
    [...passages.values()].reduce((n, t) => n + words(t), 0) / 220;
  const answering =
    (block.questions.length *
      (block.subject === "reading"
        ? 35
        : QUESTION_TARGET_SECONDS[block.subject])) /
    60;
  return (
    Math.round(
      (teaching +
        interaction +
        reading +
        answering +
        (block.questions.length * 20) / 60 +
        0.75) *
        100,
    ) / 100
  );
}

function makeReviewQuestions(
  subject: AccountSubject,
  units: DailyUnit[],
  cycle: number,
): DailyQuestion[] {
  const used = new Set(units.flatMap((u) => u.questions.map((q) => q.id)));
  return units.map((unit) => {
    const pool = (
      subject === "english"
        ? englishQuestions(unit.topic)
        : getQuestions(unit.topic)
    ).filter(
      (q) =>
        !used.has(q.id) &&
        (!unit.practiceIds || unit.practiceIds.includes(q.id)),
    );
    pool.sort(
      (a, b) =>
        (unit.practiceIds?.indexOf(a.id) ?? 0) -
        (unit.practiceIds?.indexOf(b.id) ?? 0),
    );
    const q = pool[cycle % pool.length];
    if (!q) throw new Error(`Missing fresh review question for ${unit.id}`);
    used.add(q.id);
    return {
      ...q,
      topic: unit.topic,
      subject,
      category: q.category ?? "",
      difficulty: q.difficulty ?? "medium",
      phase: "review" as const,
    } as DailyQuestion;
  });
}

/** Resume unfinished work; completing yesterday's work today uses today's session. */
export function selectDailyPlan(
  last: DailyPlan | undefined,
  userId: string,
  today: string,
  settings: StudySettings,
) {
  return last &&
    (!last.complete || last.date === today || last.completedDate === today)
    ? last
    : makeDailyPlan(
        userId,
        today,
        settings,
        last ? last.sequence + 1 : 0,
        last?.nextFocus,
        last?.blocks.flatMap((b) => b.questions.map((q) => q.id)),
      );
}

/** Upgrade teaching in saved sessions without changing answer IDs or deadlines. */
export function restoreDailyTeaching(
  plan: DailyPlan,
  answers: Record<string, number>,
  settings?: StudySettings,
): DailyPlan {
  if (plan.formatVersion === 5) return plan;
  if (plan.complete) return { ...plan, formatVersion: 5 };
  const fresh = makeDailyPlan(
    "upgrade",
    plan.date,
    settings ?? {
      minutesPerDay: plan.minutes as StudySettings["minutesPerDay"],
      scores: { english: null, math: null, reading: null, science: null },
    },
    plan.sequence,
    plan.nextFocus,
  );
  return {
    ...fresh,
    id: plan.id,
    blocks: fresh.blocks.map((b) => {
      const ids = new Set(b.questions.map((q) => q.id));
      const historical =
        plan.blocks
          .find((old) => old.subject === b.subject)
          ?.questions.filter(
            (q) => answers[q.id] !== undefined && !ids.has(q.id),
          ) ?? [];
      return { ...b, questions: [...b.questions, ...historical] };
    }),
  };
}

/** Saved sessions use corrected teaching and evidence without resetting progress. */
export function refreshDailyContent(plan: DailyPlan): DailyPlan {
  const question = (q: DailyQuestion): DailyQuestion => {
    const lesson =
      q.subject === "english" ? englishLesson(q.topic) : getLesson(q.topic);
    const source =
      q.subject === "english"
        ? (englishQuestions(q.topic).find((item) => item.id === q.id) ??
          lesson.check.find(
            (item, i) =>
              (item.id ?? `${q.topic}-daily-check-${i + 1}`) === q.id,
          ))
        : getQuestion(q.id);
    return source
      ? ({
          ...q,
          ...source,
          id: q.id,
          subject: q.subject,
          topic: q.topic,
          phase: q.phase,
        } as DailyQuestion)
      : q;
  };
  return {
    ...plan,
    blocks: plan.blocks.map((b) => {
      const units = blockUnits(b).map((u) => ({
        ...u,
        lesson: u.sectionIndices
          ? sliceLesson(
              (b.subject === "english"
                ? englishLesson(u.topic)
                : getLesson(u.topic)) as Lesson,
              u.sectionIndices,
              b.subject,
            )
          : ((b.subject === "english"
              ? englishLesson(u.topic)
              : getLesson(u.topic)) as Lesson),
        questions: u.questions.map(question),
      }));
      return {
        ...b,
        units,
        lesson: units[0].lesson,
        questions: b.questions.map(question),
        reviewQuestions: b.reviewQuestions?.map(question),
      };
    }),
  };
}
