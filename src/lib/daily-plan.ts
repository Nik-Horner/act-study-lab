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
} from "./act/content";
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
}
export interface DailyBlock {
  subject: AccountSubject;
  topic: string;
  title: string;
  minutes: number;
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
): DailyPlan {
  const allocations = dailyBudget(settings.minutesPerDay, settings.scores);
  const blocks = DAILY_SUBJECTS.map((subject, index) => {
    const topics =
      subject === "english"
        ? englishTopics().filter((t) => t.part !== "final")
        : getTopics(subject);
    const topic = topics[sequence % topics.length];
    const fullLesson =
      subject === "english" ? englishLesson(topic.slug) : getLesson(topic.slug);
    const cycle = Math.floor(sequence / topics.length);
    const section = fullLesson.sections[cycle % fullLesson.sections.length];
    const lesson = { ...fullLesson, sections: [section], check: [] } as Lesson;
    const raw =
      subject === "english"
        ? englishQuestions(topic.slug)
        : getQuestions(topic.slug);
    const count = Math.min(
      8,
      Math.max(3, Math.floor((allocations[index] - 5) / 2)),
    );
    // Reading questions remain together on one original practice passage.
    const readingPassages = [
      ...new Set(raw.map((q) => (q as Question).passage?.id)),
    ];
    const pool =
      subject === "reading"
        ? [
            ...raw,
            ...getTopics("reading")
              .filter((t) => t.slug !== topic.slug)
              .flatMap((t) => getQuestions(t.slug)),
          ].filter(
            (q) =>
              (q as Question).passage?.id ===
              readingPassages[cycle % readingPassages.length],
          )
        : raw;
    const questions = Array.from(
      { length: Math.min(count, pool.length) },
      (_, i) => pool[(cycle * count + i) % pool.length],
    ).map((q) => ({
      ...q,
      topic: topic.slug,
      subject,
      category: q.category ?? "",
      difficulty: q.difficulty ?? "medium",
    })) as DailyQuestion[];
    return {
      subject,
      topic: topic.slug,
      title: topic.title,
      minutes: allocations[index],
      lesson,
      questions,
    };
  });
  return {
    id: dailyId(`${userId}:daily:${date}:${sequence}`),
    date,
    minutes: settings.minutesPerDay,
    sequence,
    blocks,
    complete: false,
  };
}
export function dailyComplete(
  plan: DailyPlan,
  answers: Record<string, number>,
  lessons: readonly string[],
) {
  return plan.blocks.every(
    (b) =>
      lessons.includes(b.subject) &&
      b.questions.every((q) => answers[q.id] !== undefined),
  );
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
    : makeDailyPlan(userId, today, settings, last ? last.sequence + 1 : 0);
}
