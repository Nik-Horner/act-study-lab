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
import { englishDailyQuestions } from "./english-daily-content";
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
  requiredConceptIndices?: number[];
}
export interface DailyBlock {
  units?: DailyUnit[];
  reviewQuestions?: DailyQuestion[];
  historicalQuestions?: DailyQuestion[];
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
  curriculumPositions?: Partial<Record<AccountSubject, number>>;
  nextCurriculumPositions?: Partial<Record<AccountSubject, number>>;
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
  positions: DailyPlan["curriculumPositions"] = {},
): DailyPlan {
  const curriculumPositions: DailyPlan["curriculumPositions"] = {};
  const draft = DAILY_SUBJECTS.map((subject) => {
    const topics =
      subject === "english"
        ? englishTopics().filter((t) => t.part !== "final")
        : getTopics(subject);
    const scopes = topics.flatMap((topic) =>
      (subject === "english"
        ? englishScopes(topic.slug)
        : DAILY_CURRICULUM[topic.slug]
      ).map((scope, index) => ({
        topic,
        scope,
        index,
        id:
          subject === "english"
            ? `english:${topic.slug}:original:${index}`
            : `${subject}:${topic.slug}:scope:${index}`,
      })),
    );
    const start = (positions?.[subject] ?? sequence * 2) % scopes.length;
    curriculumPositions[subject] = start;
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
          ? englishDailyQuestions(topic.slug)
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
        title:
          subject === "english" &&
          scope.sections.length === full.sections.length
            ? full.title
            : lesson.sections[0].heading,
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
  // Keep a complete lesson and its drill together. If two complete lessons
  // would exceed the saved budget, defer a whole second unit, never its rules.
  while (
    draft.reduce((n, b) => n + Math.ceil(estimateDailyBlock(b)), 0) >
    settings.minutesPerDay
  ) {
    const candidates = draft
      .filter((b) => b.units!.length > 1)
      .sort((a, b) => estimateDailyBlock(b) - estimateDailyBlock(a));
    const block = candidates[0];
    if (!block) break;
    block.units!.pop();
    block.reviewQuestions = makeReviewQuestions(block.subject, block.units!, 0);
    block.questions = [
      ...block.units!.flatMap((u) => u.questions),
      ...block.reviewQuestions,
    ];
  }
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
            ? englishDailyQuestions(unit.topic).find((q) => q.id === id)
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
    formatVersion: 6,
    curriculumPositions,
    nextCurriculumPositions: Object.fromEntries(
      draft.map((b) => [
        b.subject,
        (curriculumPositions[b.subject] ?? 0) +
          blockUnits(b).filter(
            (u) =>
              !(focus?.[b.subject] ?? []).some(
                (key) => key === u.id || key === u.topic,
              ),
          ).length,
      ]),
    ),
  };
}
function englishScopes(topic: string) {
  const full = englishLesson(topic);
  const bank = englishQuestions(topic);
  const complete = {
    sections: full.sections.map((_, i) => i),
    practice: bank.map((_, i) => i),
  };
  return topic === "sentence-structure"
    ? [
        {
          sections: [0],
          practice: [0, 1, 2, 3, 4, 5].map((i) => bank.length + i),
        },
        {
          sections: [1],
          practice: [0, 1, 2, 3, 4, 5].map((i) => bank.length + 6 + i),
        },
        complete,
      ]
    : [complete];
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
    check:
      subject === "english" && indices.length === full.sections.length
        ? full.check
        : [],
  };
}
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
/** Conservative teaching estimate plus unanswered application and corrections. */
export function estimateDailyBlock(
  block: DailyBlock,
  answers: Record<string, number> = {},
) {
  const unanswered = block.questions.filter((q) => answers[q.id] === undefined);
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
    for (const q of unanswered)
      if (q.passage) passages.set(q.passage.id, q.passage.context ?? "");
  const reading =
    [...passages.values()].reduce((n, t) => n + words(t), 0) / 220;
  const checkCount = blockUnits(block).reduce(
    (n, u) => n + u.lesson.check.length,
    0,
  );
  const answering =
    (checkCount * QUESTION_TARGET_SECONDS[block.subject] +
      unanswered.length *
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
        ((unanswered.length + checkCount) * 20) / 60 +
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
        ? englishDailyQuestions(unit.topic)
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
        last?.nextCurriculumPositions ??
          (last?.curriculumPositions &&
            Object.fromEntries(
              last.blocks.map((b) => [
                b.subject,
                (last.curriculumPositions?.[b.subject] ?? 0) +
                  blockUnits(b).length,
              ]),
            )),
      );
}

/** Upgrade teaching in saved sessions without changing answer IDs or deadlines. */
export function restoreDailyTeaching(
  plan: DailyPlan,
  answers: Record<string, number>,
  settings?: StudySettings,
): DailyPlan {
  if (plan.formatVersion === 6) return plan;
  if (plan.complete) return { ...plan, formatVersion: 6 };
  const oldEnglish = plan.blocks.find((b) => b.subject === "english");
  const oldUnit = oldEnglish && blockUnits(oldEnglish)[0];
  const entries = englishTopics()
    .filter((t) => t.part !== "final")
    .flatMap((t) =>
      englishScopes(t.slug).map((_, index) => ({ topic: t.slug, index })),
    );
  const oldScope = Number(oldUnit?.id.match(/:scope:(\d+)$/)?.[1] ?? 0);
  const start = Math.max(
    0,
    entries.findIndex(
      (entry) =>
        entry.topic === oldUnit?.topic &&
        entry.index ===
          (oldUnit?.topic === "sentence-structure" ? Math.min(oldScope, 2) : 0),
    ),
  );
  const study = settings ?? {
    minutesPerDay: plan.minutes as StudySettings["minutesPerDay"],
    scores: { english: null, math: null, reading: null, science: null },
  };
  const fresh = makeDailyPlan(
    "upgrade",
    plan.date,
    study,
    plan.sequence,
    plan.nextFocus,
    [],
    { ...plan.curriculumPositions, english: start },
  );
  let english = fresh.blocks[0];
  const capacity = oldEnglish?.minutes ?? english.minutes;
  const rebuild = (units: DailyUnit[]) => {
    const reviewQuestions = makeReviewQuestions("english", units, 0);
    return {
      ...english,
      units,
      reviewQuestions,
      topic: units[0].topic,
      title: units[0].title,
      lesson: units[0].lesson,
      questions: [...units.flatMap((u) => u.questions), ...reviewQuestions],
    };
  };
  // Historical answers stay available for review, but buy no new workload.
  while (estimateDailyBlock(english) > capacity) {
    const units = blockUnits(english).map((u) => ({
      ...u,
      questions: [...u.questions],
    }));
    const longest = [...units].sort(
      (a, b) => b.questions.length - a.questions.length,
    )[0];
    if (longest.questions.length > 1) longest.questions.pop();
    else if (units.length > 1) units.pop();
    else break;
    english = rebuild(units);
  }
  let deferred = false;
  if (estimateDailyBlock(english) > capacity) {
    // Migration only: keep a complete foundation refresher inside an older
    // allocation, then resume the deferred original topic on the next day.
    const foundation = makeDailyPlan(
      "upgrade",
      plan.date,
      study,
      0,
      undefined,
      [],
      { english: 0 },
    ).blocks[0];
    const unit = {
      ...blockUnits(foundation)[0],
      questions: [blockUnits(foundation)[0].questions[0]],
    };
    english = rebuild([unit]);
    deferred = true;
  }
  const active = new Set(english.questions.map((q) => q.id));
  const historicalQuestions = [
    ...(oldEnglish?.questions ?? []),
    ...(oldEnglish?.historicalQuestions ?? []),
  ].filter(
    (q, i, all) =>
      answers[q.id] !== undefined &&
      !active.has(q.id) &&
      all.findIndex((item) => item.id === q.id) === i,
  );
  english = {
    ...english,
    minutes: capacity,
    estimatedMinutes: estimateDailyBlock(english),
    historicalQuestions,
  };
  const blocks = fresh.blocks.map((b) => {
    const old = plan.blocks.find((item) => item.subject === b.subject);
    if (b.subject === "english") return english;
    if (old && (plan.formatVersion ?? 0) >= 5) return old;
    const ids = new Set(b.questions.map((q) => q.id));
    return {
      ...b,
      minutes: old?.minutes ?? b.minutes,
      historicalQuestions: [
        ...(old?.questions ?? []),
        ...(old?.historicalQuestions ?? []),
      ].filter((q) => answers[q.id] !== undefined && !ids.has(q.id)),
    };
  });
  const nextEnglish = deferred
    ? start
    : start +
      blockUnits(english).filter(
        (u) =>
          !(plan.nextFocus?.english ?? []).some(
            (key) => key === u.id || key === u.topic,
          ),
      ).length;
  return {
    ...plan,
    formatVersion: 6,
    blocks,
    curriculumPositions: { ...fresh.curriculumPositions, english: start },
    nextCurriculumPositions: {
      ...fresh.nextCurriculumPositions,
      ...Object.fromEntries(
        blocks
          .filter((b) => b.subject !== "english")
          .map((b) => [
            b.subject,
            plan.nextCurriculumPositions?.[b.subject] ??
              (fresh.curriculumPositions?.[b.subject] ?? 0) +
                blockUnits(b).filter(
                  (u) =>
                    !(plan.nextFocus?.[b.subject] ?? []).some(
                      (key) => key === u.id || key === u.topic,
                    ),
                ).length,
          ]),
      ),
      english: nextEnglish,
    },
  };
}

/** Saved sessions use corrected teaching and evidence without resetting progress. */
export function refreshDailyContent(
  plan: DailyPlan,
  answers: Record<string, number> = {},
): DailyPlan {
  const question = (q: DailyQuestion): DailyQuestion => {
    const lesson =
      q.subject === "english" ? englishLesson(q.topic) : getLesson(q.topic);
    const source =
      q.subject === "english"
        ? (englishDailyQuestions(q.topic).find((item) => item.id === q.id) ??
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
  const refreshed = {
    ...plan,
    blocks: plan.blocks.map((b) => {
      const units = blockUnits(b).map((u) => {
        const full = (
          b.subject === "english" ? englishLesson(u.topic) : getLesson(u.topic)
        ) as Lesson;
        const indices = [
          ...(u.sectionIndices ?? full.sections.map((_, i) => i)),
        ];
        const required = [...(u.requiredConceptIndices ?? [])];
        if (b.subject !== "english") {
          const scopes = DAILY_CURRICULUM[u.topic];
          const scopeIndex = Number(u.id.match(/:scope:(\d+)$/)?.[1]);
          const own = scopes?.[scopeIndex];
          const questions = [
            ...u.questions,
            ...(b.reviewQuestions ?? []).filter((q) =>
              u.practiceIds?.includes(q.id),
            ),
          ];
          const needed = new Set(own?.sections ?? []);
          const bank = getQuestions(u.topic);
          for (const q of questions) {
            const poolIndex = bank.findIndex((item) => item.id === q.id);
            if (own?.practice.includes(poolIndex)) continue;
            const match = scopes
              ?.filter((scope) => scope.practice.includes(poolIndex))
              .sort(
                (a, c) =>
                  a.sections.filter((i) => !needed.has(i)).length -
                  c.sections.filter((i) => !needed.has(i)).length,
              )[0];
            match?.sections.forEach((i) => needed.add(i));
          }
          const hasWork =
            !plan.complete &&
            questions.some((q) => answers[q.id] === undefined);
          for (const sourceIndex of needed) {
            const position = indices.indexOf(sourceIndex);
            const changed =
              position >= 0 &&
              JSON.stringify(u.lesson.sections[position]?.body) !==
                JSON.stringify(full.sections[sourceIndex].body);
            if (position < 0 || changed) {
              // Append to preserve saved :concept:i positions. A completed
              // lesson with unanswered drills must teach new prerequisites.
              const next = indices.length;
              indices.push(sourceIndex);
              if (hasWork) required.push(next);
            }
          }
        }
        return {
          ...u,
          sectionIndices: indices,
          requiredConceptIndices: [...new Set(required)],
          lesson: sliceLesson(full, indices, b.subject),
          questions: u.questions.map(question),
        };
      });
      const refreshed = {
        ...b,
        units,
        lesson: units[0].lesson,
        questions: b.questions.map(question),
        historicalQuestions: b.historicalQuestions?.map(question),
        reviewQuestions: b.reviewQuestions?.map(question),
      };
      return { ...refreshed, estimatedMinutes: estimateDailyBlock(refreshed) };
    }),
  };
  return fitRefreshedBudget(refreshed, answers);
}

/** Corrected prerequisites use the saved clock, with less new practice if needed. */
function fitRefreshedBudget(
  plan: DailyPlan,
  answers: Record<string, number>,
): DailyPlan {
  if (plan.complete) return plan;
  const blocks = plan.blocks.map((b) => ({
    ...b,
    units: blockUnits(b).map((u) => ({ ...u, questions: [...u.questions] })),
  }));
  const next = { ...plan.nextCurriculumPositions };
  const needed = () =>
    blocks.map((b) => Math.ceil(estimateDailyBlock(b, answers)));
  const total = () => needed().reduce((n, minutes) => n + minutes, 0);
  const rebuild = (block: DailyBlock) => {
    const units = blockUnits(block);
    block.topic = units[0].topic;
    block.title = units[0].title;
    block.lesson = units[0].lesson;
    block.questions = [
      ...units.flatMap((u) => u.questions),
      ...(block.reviewQuestions ?? []),
    ];
  };
  while (total() > plan.minutes) {
    const candidates = blocks
      .flatMap((block) =>
        blockUnits(block)
          .filter((unit) => unit.questions.length > 1)
          .map((unit) => ({ block, unit })),
      )
      .filter(({ unit }) =>
        unit.questions.some((q) => answers[q.id] === undefined),
      )
      .sort(
        (a, b) =>
          estimateDailyBlock(b.block, answers) -
          estimateDailyBlock(a.block, answers),
      );
    const candidate = candidates[0];
    if (candidate) {
      const index = candidate.unit.questions.findLastIndex(
        (q) => answers[q.id] === undefined,
      );
      candidate.unit.questions.splice(index, 1);
      rebuild(candidate.block);
      continue;
    }
    // Defer only an untouched trailing unit. Its saved completion keys and any
    // answered questions remain valid; no completed work is discarded.
    const block = [...blocks].reverse().find((b) => {
      const units = blockUnits(b),
        last = units.at(-1)!;
      return (
        units.length > 1 &&
        ![
          ...last.questions,
          ...(b.reviewQuestions ?? []).filter(
            (q) => last.practiceIds?.includes(q.id) ?? q.topic === last.topic,
          ),
        ].some((q) => answers[q.id] !== undefined)
      );
    });
    if (!block) break;
    const unit = block.units!.pop()!;
    block.reviewQuestions = block.reviewQuestions?.filter(
      (q) => !(unit.practiceIds?.includes(q.id) ?? q.topic === unit.topic),
    );
    if (
      !(plan.nextFocus?.[block.subject] ?? []).some(
        (key) => key === unit.id || key === unit.topic,
      )
    )
      next[block.subject] = Math.max(
        plan.curriculumPositions?.[block.subject] ?? 0,
        (next[block.subject] ?? 0) - 1,
      );
    rebuild(block);
  }
  const minimum = needed();
  if (minimum.reduce((n, m) => n + m, 0) <= plan.minutes) {
    // Use existing spare minutes before changing any subject's allocation.
    const allocation = blocks.map((b, i) => Math.max(b.minutes, minimum[i]));
    let excess = allocation.reduce((n, m) => n + m, 0) - plan.minutes;
    for (let i = 0; i < allocation.length && excess > 0; i++) {
      const taken = Math.min(excess, allocation[i] - minimum[i]);
      allocation[i] -= taken;
      excess -= taken;
    }
    blocks.forEach((b, i) => {
      b.minutes = allocation[i];
    });
  }
  blocks.forEach((b) => {
    b.estimatedMinutes = estimateDailyBlock(b, answers);
  });
  return { ...plan, blocks, nextCurriculumPositions: next };
}
