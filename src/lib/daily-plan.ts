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
  getPracticeReplacement,
} from "./act/content";
import { blockUnits, dailyConcepts, legacyFocusSkills } from "./daily-flow";
import { englishDailyQuestions } from "./english-daily-content";
import { DAILY_CURRICULUM, type DailyScope } from "./daily-curriculum";
import { QUESTION_TARGET_SECONDS } from "./question-pacing";
export { dailyComplete } from "./daily-flow";
import type { StudySettings, AccountSubject } from "./account-settings";
import { geometryFirst, planningScores } from "./account-settings";
import {
  focusLesson,
  getLearningSkill,
  getLearningSkills,
  getQuestionTeaching,
  hasTeaching,
} from "./learning-skills";
import { exposureRank, seenPassages } from "./act/question-exposure";
export const DAILY_SUBJECTS: AccountSubject[] = [
  "english",
  "reading",
  "math",
  "science",
];
export function dailySubjects(includeScience = true) {
  return DAILY_SUBJECTS.filter(
    (subject) => subject !== "science" || includeScience,
  );
}
export interface DailyQuestion {
  skillId?: string;
  skillIds?: string[];
  teachingSections?: number[];
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
  reviewUnitId?: string;
}
export interface DailyUnit {
  skillId?: string;
  reportingCategory?: string;
  focusedConceptIndices?: number[];
  id: string;
  courseId?: string;
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
  reviewUnits?: DailyUnit[];
  reviewOnly?: boolean;
  reviewKey?: string;
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
  plannerVersion?: number;
  previouslyAnsweredQuestions?: string[];
  course?: DailyCourse;
}
export interface DailyCourse {
  coverageVersion?: number;
  completedSessions?: string[];
  testDate: string;
  targetScore?: number;
  coveredUnits: string[];
  deferUnits?: string[];
  answeredQuestions?: string[];
  seenQuestions?: string[];
}
/** Recover coverage from completed assessments, retaining original history identifiers. */
export function dailyHistory(plans: DailyPlan[]) {
  const covered = new Set(
    plans.flatMap((plan) => plan.course?.coveredUnits ?? []),
  );
  const sessions = new Set(
    plans.flatMap((plan) => plan.course?.completedSessions ?? []),
  );
  for (const plan of plans) {
    if (!plan.complete) continue;
    sessions.add(plan.id);
    for (const block of plan.blocks) {
      for (const unit of blockUnits(block)) {
        const id = unit.courseId ?? unit.id;
        covered.add(id);
        if (id.includes(":skill:")) continue;
        // A broad legacy pool is not proof that every method in that pool was practiced.
        for (const question of unit.questions) {
          const skill = getQuestionTeaching(unit.topic, question.id)?.skillId;
          if (skill)
            covered.add(`${block.subject}:${unit.topic}:skill:${skill}`);
        }
      }
    }
  }
  return {
    coveredUnits: [...covered],
    completedSessions: [...sessions],
    coverageVersion: 1,
  };
}
export function dailyScopes(subject: AccountSubject, settings?: StudySettings) {
  if (subject === "science" && settings?.includeScience === false) return [];
  const topics =
    subject === "english"
      ? englishTopics().filter(
          (t) => t.part !== "final" || getLearningSkills(t.slug).length > 0,
        )
      : getTopics(subject).filter(
          (topic) =>
            subject !== "math" ||
            !settings?.mathCoveredTopics?.includes(topic.slug),
        );
  const scopes = topics.flatMap((topic) => {
    const skills = getLearningSkills(topic.slug);
    const bank =
      subject === "english"
        ? englishDailyQuestions(topic.slug)
        : getQuestions(topic.slug);
    if (skills.length)
      return skills.flatMap((skill, index) => {
        const practice = skill.questionIds
          .map((id) => bank.findIndex((q) => q.id === id))
          .filter((i) => i >= 0);
        if (!practice.length) return [];
        const sections = [
          ...new Set([
            ...skill.sections,
            ...practice.flatMap(
              (i) =>
                getQuestionTeaching(topic.slug, bank[i].id)?.teachingSections ??
                [],
            ),
          ]),
        ];
        return [
          {
            topic,
            index,
            scope: {
              sections,
              practice,
              title: skill.title,
              skillId: skill.id,
              reportingCategory: skill.reportingCategory,
              difficulty: practice.some((i) => bank[i].difficulty === "hard")
                ? "hard"
                : practice.some((i) => bank[i].difficulty === "medium")
                  ? "medium"
                  : "easy",
            } as DailyScope,
            id: `${subject}:${topic.slug}:skill:${skill.id}`,
          },
        ];
      });
    return (
      subject === "english"
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
    }));
  });
  // Keep stored curriculum positions stable when advanced English scopes grow.
  return subject === "english"
    ? [
        ...scopes.filter(
          (s) => !s.scope.title?.startsWith("Advanced transfer:"),
        ),
        ...scopes.filter((s) =>
          s.scope.title?.startsWith("Advanced transfer:"),
        ),
      ]
    : scopes;
}
export function dailyId(value: string) {
  const hex = createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export { dailyDate } from "./daily-date";
export function dailyBudget(
  minutes: number,
  scores: StudySettings["scores"],
  targetScore = 36,
  includeScience = true,
) {
  const subjects = dailySubjects(includeScience);
  const weights = subjects.map((subject) =>
    Math.max(1, targetScore - (scores[subject] ?? 28)),
  );
  const available = minutes - subjects.length * 10,
    total = weights.reduce((a, b) => a + b, 0);
  const allocations = weights.map(
    (weight) => 10 + Math.floor((available * weight) / total),
  );
  let extra = minutes - allocations.reduce((a, b) => a + b, 0);
  for (let i = 0; extra > 0; i++, extra--) allocations[i % subjects.length]++;
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
  course?: DailyCourse,
): DailyPlan {
  const subjects = dailySubjects(settings.includeScience);
  const seenQuestions = [
    ...new Set([
      ...recentQuestions,
      ...(course?.answeredQuestions ?? []),
      ...(course?.seenQuestions ?? []),
    ]),
  ];
  const seenIds = new Set(seenQuestions);
  const priorPassages = seenPassages(seenIds);
  const curriculumPositions: DailyPlan["curriculumPositions"] = {};
  const counts: Partial<Record<AccountSubject, number>> = {};
  const pending: Partial<
    Record<AccountSubject, ReturnType<typeof dailyScopes>>
  > = {};
  const weakUnits: Partial<Record<AccountSubject, DailyUnit[]>> = {};
  const candidates: Partial<Record<AccountSubject, DailyUnit[]>> = {};
  const covered = new Set(course?.coveredUnits ?? []);
  const days = course
    ? Math.max(
        1,
        Math.ceil((Date.parse(course.testDate) - Date.parse(date)) / 86400000),
      )
    : 0;
  const draft = subjects.map((subject) => {
    const scopes = dailyScopes(subject, settings);
    const banks = new Map(
      [...new Set(scopes.map((entry) => entry.topic.slug))].map((topic) => [
        topic,
        (subject === "english"
          ? englishDailyQuestions(topic)
          : getQuestions(topic)) as Question[],
      ]),
    );
    const recent = new Set(recentQuestions);
    const start = course
      ? scopes.findIndex((scope) => !covered.has(scope.id))
      : Math.min(positions?.[subject] ?? sequence * 2, scopes.length);
    curriculumPositions[subject] = start < 0 ? scopes.length : start;
    const unseen = course
      ? scopes.filter((scope) => !covered.has(scope.id))
      : scopes.slice(start);
    pending[subject] = unseen;
    counts[subject] = course ? Math.max(1, Math.ceil(unseen.length / days)) : 2;
    const preferred = (focus?.[subject] ?? []).flatMap((key) => {
      const exact = scopes.find(
        (scope) => scope.id === key || scope.id.startsWith(`${key}:`),
      );
      const legacy = legacyFocusSkills(key);
      return exact
        ? [exact]
        : legacy
          ? scopes.filter((entry) => legacy.includes(entry.scope.skillId ?? ""))
          : scopes
              .filter(
                (scope) =>
                  scope.topic.slug === key ||
                  key.startsWith(`${subject}:${scope.topic.slug}:`),
              )
              .slice(0, 1);
    });
    const ordered = unseen.length
      ? [...unseen].sort(
          (a, b) =>
            Number(course?.deferUnits?.includes(a.id) ?? false) -
              Number(course?.deferUnits?.includes(b.id) ?? false) ||
            Number(preferred.some((scope) => scope.id === b.id)) -
              Number(preferred.some((scope) => scope.id === a.id)) ||
            (course
              ? practicePriority(
                  a.scope.difficulty ?? "medium",
                  planningScores(settings)[subject],
                  course?.targetScore ?? 36,
                ) -
                practicePriority(
                  b.scope.difficulty ?? "medium",
                  planningScores(settings)[subject],
                  course?.targetScore ?? 36,
                )
              : 0) ||
            (course &&
            subject === "english" &&
            (course?.targetScore ?? 36) >= 33 &&
            (planningScores(settings).english ?? 0) >= 28
              ? Number(
                  b.scope.title?.startsWith("Advanced transfer:") ?? false,
                ) -
                Number(a.scope.title?.startsWith("Advanced transfer:") ?? false)
              : 0) ||
            (course && subject === "math" && geometryFirst(settings)
              ? mathPriority(a.topic.slug) - mathPriority(b.topic.slug)
              : 0),
        )
      : [
          ...preferred,
          ...Array.from(
            { length: scopes.length },
            (_, i) =>
              scopes[
                ((positions?.[subject] ?? sequence * 2) + i) % scopes.length
              ],
          ),
        ].filter(
          (scope, i, all) =>
            all.findIndex((other) => other.id === scope.id) === i,
        );
    const used = new Set<string>();
    const usedPassages = new Set<string>();
    const unitFor = ({
      topic,
      scope,
      id,
    }: ReturnType<typeof dailyScopes>[number]) => {
      const full = (
        subject === "english"
          ? englishLesson(topic.slug)
          : getLesson(topic.slug)
      ) as Lesson;
      const bank = banks.get(topic.slug)!;
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
            exposureRank(a as Question, seenIds, priorPassages) -
              exposureRank(b as Question, seenIds, priorPassages) ||
            Number(!!a.passage && usedPassages.has(a.passage.id)) -
              Number(!!b.passage && usedPassages.has(b.passage.id)) ||
            practicePriority(
              a.difficulty,
              planningScores(settings)[subject],
              course?.targetScore ?? 36,
            ) -
              practicePriority(
                b.difficulty,
                planningScores(settings)[subject],
                course?.targetScore ?? 36,
              ),
        );
      const q = rotated[0];
      if (!q) throw new Error(`Empty practice pool for ${id}`);
      used.add(q.id);
      if (q.passage) usedPassages.add(q.passage.id);
      const skill =
        scope.skillId && getLearningSkill(topic.slug, scope.skillId);
      const lesson = skill
        ? focusLesson(full, { ...skill, sections: scope.sections })
        : sliceLesson(full, scope.sections, subject);
      return {
        skillId: scope.skillId,
        reportingCategory: scope.reportingCategory,
        id:
          subject === "english" &&
          topic.slug === "sentence-structure" &&
          scope.sections[0] === 2
            ? `${id}:boundaries`
            : id,
        courseId: id,
        topic: topic.slug,
        title:
          scope.title ??
          (subject === "reading"
            ? `${full.title}: ${full.sections[scope.sections.find((i) => i !== 0) ?? scope.sections[0]].heading}`
            : subject === "english" &&
                scope.sections.length === full.sections.length
              ? full.title
              : lesson.sections[0].heading),
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
    };
    const options = ordered.slice(0, course ? ordered.length : 2).map(unitFor);
    used.clear();
    usedPassages.clear();
    const weak = preferred.filter((scope) =>
      course ? covered.has(scope.id) : scopes.indexOf(scope) < start,
    );
    const spaced = course
      ? scopes.filter(
          (entry) =>
            covered.has(entry.id) &&
            !entry.scope.practice.some((i) =>
              recent.has(banks.get(entry.topic.slug)![i].id),
            ),
        )
      : [];
    weakUnits[subject] = (
      weak.length
        ? weak
        : spaced.length
          ? [spaced[sequence % spaced.length]]
          : []
    )
      .slice(0, 1)
      .map(unitFor)
      .map((unit) => ({ ...unit, questions: [] }));
    candidates[subject] = options;
    const units = options.slice(0, course ? 1 : 2);
    const reviewQuestions = makeReviewQuestions(
      subject,
      units,
      0,
      seenQuestions,
    );
    return {
      subject,
      reviewOnly: !!course && unseen.length === 0,
      reviewKey: course ? `review:${subject}:course:1` : undefined,
      units,
      reviewQuestions,
      topic: units[0].topic,
      title: units[0].title,
      lesson: units[0].lesson,
      minutes: 0,
      questions: [...units.flatMap((u) => u.questions), ...reviewQuestions],
    } as DailyBlock;
  });
  if (course) {
    // Add intact lesson/drill pairs where the deadline needs the most coverage.
    while (true) {
      const choices = draft.filter(
        (block) =>
          block.units!.length < candidates[block.subject]!.length &&
          block.units!.length < counts[block.subject]!,
      );
      choices.sort(
        (a, b) =>
          pending[b.subject]!.length / b.units!.length -
          pending[a.subject]!.length / a.units!.length,
      );
      const next = choices.find((block) => {
        const units = [
          ...block.units!,
          candidates[block.subject]![block.units!.length],
        ];
        const reviewQuestions = makeReviewQuestions(
          block.subject,
          units,
          0,
          seenQuestions,
        );
        return (
          draft.reduce(
            (n, item) =>
              n +
              Math.ceil(
                estimateDailyBlock(
                  item === block
                    ? {
                        ...block,
                        units,
                        reviewQuestions,
                        questions: [
                          ...units.flatMap((unit) => unit.questions),
                          ...reviewQuestions,
                        ],
                      }
                    : item,
                ),
              ),
            0,
          ) <= settings.minutesPerDay
        );
      });
      if (!next) break;
      next.units!.push(candidates[next.subject]![next.units!.length]);
      next.reviewQuestions = makeReviewQuestions(
        next.subject,
        next.units!,
        0,
        seenQuestions,
      );
      next.questions = [
        ...next.units!.flatMap((unit) => unit.questions),
        ...next.reviewQuestions,
      ];
    }
  }
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
    block.reviewQuestions = makeReviewQuestions(
      block.subject,
      block.units!,
      0,
      seenQuestions,
    );
    block.questions = [
      ...block.units!.flatMap((u) => u.questions),
      ...block.reviewQuestions,
    ];
  }
  for (const block of draft) {
    const unit = weakUnits[block.subject]?.find(
      (unit) =>
        !block.units!.some(
          (item) => (item.courseId ?? item.id) === (unit.courseId ?? unit.id),
        ),
    );
    if (!unit) continue;
    for (let attempt = 0; attempt < 2; attempt++) {
      const used = new Set([
        ...block.questions.map((question) => question.id),
        ...(course?.answeredQuestions ?? []),
      ]);
      const id =
        unit.practiceIds?.find(
          (id) => !used.has(id) && !seenQuestions.includes(id),
        ) ?? unit.practiceIds?.find((id) => !used.has(id));
      const source =
        id &&
        (block.subject === "english"
          ? englishDailyQuestions(unit.topic).find(
              (question) => question.id === id,
            )
          : getQuestion(id));
      if (!source) break;
      const question = {
        ...source,
        subject: block.subject,
        topic: unit.topic,
        phase: "review" as const,
        reviewUnitId: unit.id,
        category: source.category ?? "",
        difficulty: source.difficulty ?? "medium",
      } as DailyQuestion;
      block.reviewQuestions!.push(question);
      block.questions.push(question);
      if (
        draft.reduce(
          (sum, item) => sum + Math.ceil(estimateDailyBlock(item)),
          0,
        ) > settings.minutesPerDay
      ) {
        block.reviewQuestions!.pop();
        block.questions.pop();
        break;
      }
      block.reviewUnits = [unit];
    }
  }
  const minimum = draft.map((block) => Math.ceil(estimateDailyBlock(block)));
  if (minimum.reduce((a, b) => a + b, 0) > settings.minutesPerDay)
    throw new Error("Curriculum exceeds the daily budget");
  const weights = subjects.map((s) =>
    Math.max(
      1,
      (course?.targetScore ?? 36) - (planningScores(settings)[s] ?? 28),
    ),
  );
  const extra = settings.minutesPerDay - minimum.reduce((a, b) => a + b, 0);
  const total = weights.reduce((a, b) => a + b, 0);
  const allocations = minimum.map(
    (min, i) => min + Math.floor((extra * weights[i]) / total),
  );
  let remainder =
    settings.minutesPerDay - allocations.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0; i++, remainder--)
    allocations[i % subjects.length]++;
  draft.forEach((block, i) => {
    block.minutes = allocations[i];
    // More time buys more matched application, never another oversized lesson.
    for (let round = 0; round < 4; round++)
      for (const unit of block.units!) {
        const used = new Set(block.questions.map((q) => q.id));
        // Keep a fresh transfer item for a later daily review.
        if (
          unit.skillId &&
          unit.practiceIds!.filter((id) => !used.has(id) && !seenIds.has(id))
            .length <= 1
        )
          continue;
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
    plannerVersion: 2,
    previouslyAnsweredQuestions: course?.seenQuestions,
    nextFocus: focus,
    course: course && {
      ...course,
      deferUnits: undefined,
      answeredQuestions: undefined,
      seenQuestions: undefined,
    },
    curriculumPositions,
    nextCurriculumPositions: Object.fromEntries(
      draft.map((b) => [
        b.subject,
        course
          ? (() => {
              const done = new Set([
                ...covered,
                ...blockUnits(b).map((unit) => unit.courseId ?? unit.id),
              ]);
              const scopes = dailyScopes(b.subject, settings);
              const next = scopes.findIndex((scope) => !done.has(scope.id));
              return next < 0 ? scopes.length : next;
            })()
          : Math.min(
              dailyScopes(b.subject, settings).length,
              (curriculumPositions[b.subject] ?? 0) + blockUnits(b).length,
            ),
      ]),
    ),
  };
}
/** Forecast complete lesson/drill pairs, excluding test day, without changing progress. */
export function dailyCoverage(
  plan: DailyPlan,
  settings: StudySettings,
  course: DailyCourse,
  today: string,
  saved = true,
) {
  const all = new Set(
    dailySubjects(settings.includeScience).flatMap((subject) =>
      dailyScopes(subject, settings).map((scope) => scope.id),
    ),
  );
  const confirmed = new Set(course.coveredUnits.filter((id) => all.has(id)));
  const days = Math.max(
    0,
    Math.ceil((Date.parse(course.testDate) - Date.parse(today)) / 86400000),
  );
  const finish = (minutes: number) => {
    const covered = new Set(confirmed);
    if (covered.size === all.size) return today;
    // A long horizon needs at most one day per authored scope to establish coverage.
    // A finished session has used today's slot, including at a larger budget.
    const startDay = plan.complete && plan.date === today ? 1 : 0;
    for (let day = startDay; day < Math.min(days, all.size + startDay); day++) {
      const date = new Date(Date.parse(today) + day * 86400000)
        .toISOString()
        .slice(0, 10);
      const next =
        day === 0 && (saved || minutes === settings.minutesPerDay)
          ? plan
          : makeDailyPlan(
              "forecast",
              date,
              { ...settings, minutesPerDay: minutes },
              plan.sequence + day,
              undefined,
              [],
              {},
              { ...course, coveredUnits: [...covered] },
            );
      next.blocks
        .flatMap(blockUnits)
        .forEach((unit) => covered.add(unit.courseId ?? unit.id));
      if ([...all].every((id) => covered.has(id))) return date;
    }
    return null;
  };
  const finishDate = finish(settings.minutesPerDay);
  const requiredMinutes = finishDate
    ? settings.minutesPerDay
    : ([75, 90].find(
        (minutes) => minutes > settings.minutesPerDay && finish(minutes),
      ) ?? null);
  return {
    covered: confirmed.size,
    completedSessions: new Set([
      ...(course.completedSessions ?? []),
      ...(plan.complete ? [plan.id] : []),
    ]).size,
    total: all.size,
    testDate: course.testDate,
    finishDate,
    onTrack: finishDate !== null,
    requiredMinutes,
  };
}
function mathPriority(topic: string) {
  return topic === "math-geometry" || topic === "math-trigonometry"
    ? 0
    : topic === "math-number-quantity" ||
        topic === "math-statistics-probability"
      ? 1
      : 2;
}
function difficultyRank(difficulty: string) {
  return difficulty === "hard" ? 2 : difficulty === "medium" ? 1 : 0;
}
export function practicePriority(
  difficulty: string,
  baseline: number | null,
  target: number,
) {
  const rank = difficultyRank(difficulty);
  if (baseline === null) return 0;
  if (target >= 33 && baseline >= 28) return 2 - rank;
  if (target <= 27 || baseline < 24) return rank;
  return difficulty === "medium" ? 0 : difficulty === "hard" ? 1 : 2;
}
function englishScopes(topic: string): DailyScope[] {
  const full = englishLesson(topic) as Lesson;
  const bank = englishQuestions(topic);
  const complete = {
    sections: full.sections.flatMap((s, i) =>
      s.teachingRevision === 2 ? [] : [i],
    ),
    practice: bank.flatMap((q, i) =>
      /-transfer-0[12]$/.test(q.id) ? [] : [i],
    ),
  };
  const core =
    topic === "sentence-structure"
      ? [
          {
            sections: [0],
            practice: [0, 1, 2, 3, 4, 5].map((i) => bank.length + i),
          },
          {
            sections: [1],
            practice: [0, 1, 2, 3, 4, 5].map((i) => bank.length + 6 + i),
          },
          { sections: [2, 3, 4], practice: complete.practice },
        ]
      : [complete];
  const advanced = full.sections.flatMap((s, i) =>
    s.teachingRevision === 2 ? [i] : [],
  );
  return advanced.length
    ? [
        ...core,
        {
          title: `Advanced transfer: ${full.title}`,
          sections: advanced,
          practice: bank.flatMap((q, i) =>
            /-transfer-0[12]$/.test(q.id) ? [i] : [],
          ),
        },
      ]
    : core;
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
      subject === "english" &&
      indices.length ===
        full.sections.filter((s) => s.teachingRevision !== 2).length &&
      indices.every((i) => full.sections[i].teachingRevision !== 2)
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
  // Appended repair checkpoints can point at the same teaching section.
  const sections = blockUnits(block).flatMap((unit) => {
    const included = new Set<number>();
    return dailyConcepts(unit)
      .filter((index) => {
        if (block.reviewOnly && !unit.requiredConceptIndices?.includes(index))
          return false;
        const source = unit.sectionIndices?.[index] ?? index;
        if (included.has(source)) return false;
        included.add(source);
        return true;
      })
      .map((index) => unit.lesson.sections[index]);
  });
  const teaching =
    sections.reduce(
      (n, s) =>
        n +
        words(
          [
            ...s.body,
            ...(s.examples ?? []).map((e) => e.text),
            s.tip ?? "",
            s.activity
              ? [
                  s.activity.prompt,
                  ...s.activity.choices,
                  s.activity.explanation,
                  s.activity.evidenceText ?? "",
                  s.activity.evidence?.context ?? "",
                ].join(" ")
              : "",
          ].join(" "),
        ),
      0,
    ) / 180;
  const interaction =
    sections.reduce(
      (n, s) => n + (s.activity ? 45 : (s.examples?.length ?? 0) * 10),
      0,
    ) / 60;
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
  previousQuestions: string[] = [],
): DailyQuestion[] {
  const used = new Set(units.flatMap((u) => u.questions.map((q) => q.id)));
  const seen = new Set(previousQuestions);
  const passages = seenPassages(seen);
  const currentPassages = seenPassages(used);
  return units.flatMap((unit) => {
    const pool = (
      subject === "english"
        ? englishDailyQuestions(unit.topic)
        : getQuestions(unit.topic)
    ).filter(
      (q) =>
        !used.has(q.id) &&
        (!unit.practiceIds || unit.practiceIds.includes(q.id)),
    );
    if (unit.skillId && pool.length <= 1) return [];
    pool.sort(
      (a, b) =>
        exposureRank(a as Question, seen, passages) -
          exposureRank(b as Question, seen, passages) ||
        Number(
          !!(a as Question).passage &&
            currentPassages.has((a as Question).passage!.id),
        ) -
          Number(
            !!(b as Question).passage &&
              currentPassages.has((b as Question).passage!.id),
          ) ||
        (unit.practiceIds?.indexOf(a.id) ?? 0) -
          (unit.practiceIds?.indexOf(b.id) ?? 0),
    );
    const q = pool[cycle % pool.length];
    if (!q) return [];
    used.add(q.id);
    if ((q as Question).passage)
      currentPassages.add((q as Question).passage!.id);
    return [
      {
        ...q,
        topic: unit.topic,
        subject,
        category: q.category ?? "",
        difficulty: q.difficulty ?? "medium",
        phase: "review" as const,
        reviewUnitId: unit.id,
      } as DailyQuestion,
    ];
  });
}

/** Finishing an older lesson unlocks today's plan; the daily clock stays shared. */
export function selectDailyPlan(
  last: DailyPlan | undefined,
  userId: string,
  today: string,
  settings: StudySettings,
  moveOn = false,
  course?: DailyCourse,
) {
  return last && ((!last.complete && !moveOn) || last.date === today)
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
        course,
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
  const entries = dailyScopes("english", settings).map(({ topic, index }) => ({
    topic: topic.slug,
    index,
  }));
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
  const study = {
    ...(settings ?? {
      minutesPerDay: plan.minutes as StudySettings["minutesPerDay"],
      scores: { english: null, math: null, reading: null, science: null },
    }),
    includeScience: plan.blocks.some((block) => block.subject === "science"),
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
  const replacements = new Map<string, Question>();
  const scopesBySubject = new Map<
    AccountSubject,
    ReturnType<typeof dailyScopes>
  >();
  const assignedIds = new Set(
    plan.blocks.flatMap((block) => block.questions.map((q) => q.id)),
  );
  const priorPassages = seenPassages([
    ...(plan.previouslyAnsweredQuestions ?? []),
    ...Object.keys(answers),
  ]);
  const question = (q: DailyQuestion, replaceExposed = true): DailyQuestion => {
    const lesson =
      q.subject === "english" ? englishLesson(q.topic) : getLesson(q.topic);
    const replacement =
      replaceExposed && answers[q.id] === undefined
        ? getPracticeReplacement(q.id)
        : undefined;
    const source =
      (replaceExposed ? replacements.get(q.id) : undefined) ??
      replacement ??
      (q.subject === "english"
        ? (englishDailyQuestions(q.topic).find((item) => item.id === q.id) ??
          lesson.check.find(
            (item, i) =>
              (item.id ?? `${q.topic}-daily-check-${i + 1}`) === q.id,
          ))
        : getQuestion(q.id));
    return source
      ? ({
          ...q,
          ...source,
          id:
            (replaceExposed ? replacements.get(q.id)?.id : undefined) ??
            replacement?.id ??
            q.id,
          subject: q.subject,
          topic: q.topic,
          phase: q.phase,
        } as DailyQuestion)
      : q;
  };
  const refreshed = {
    ...plan,
    plannerVersion: plan.complete ? plan.plannerVersion : 2,
    blocks: plan.blocks.map((b) => {
      const refreshUnit = (u: DailyUnit, promoteReview = false): DailyUnit => {
        const full = (
          b.subject === "english" ? englishLesson(u.topic) : getLesson(u.topic)
        ) as Lesson;
        const indices = [
          ...(u.sectionIndices ?? u.lesson.sections.map((_, i) => i)),
        ];
        const required = [...(u.requiredConceptIndices ?? [])];
        const review = (b.reviewQuestions ?? []).filter((q) =>
          q.reviewUnitId
            ? q.reviewUnitId === u.id
            : u.practiceIds?.includes(q.id),
        );
        const pending = [...u.questions, ...review].find(
          (q) => answers[q.id] === undefined,
        );
        let current = pending && question(pending);
        const skillId = u.skillId ?? current?.skillId;
        const skill = skillId && getLearningSkill(u.topic, skillId);
        if (skill && !plan.complete) {
          if (
            !u.skillId &&
            current?.subject === "reading" &&
            answers[current.id] === undefined &&
            current.passage &&
            priorPassages.has(current.passage.id) &&
            pending &&
            u.questions.some((q) => q.id === pending.id)
          ) {
            const fresh = getQuestions(u.topic).find(
              (candidate) =>
                candidate.skillId === skill.id &&
                !assignedIds.has(candidate.id) &&
                candidate.passage &&
                !priorPassages.has(candidate.passage.id),
            );
            if (fresh) {
              replacements.set(pending.id, fresh);
              assignedIds.add(fresh.id);
              current = question(pending);
            }
          }
          if (current?.passage) priorPassages.add(current.passage.id);
          if (!scopesBySubject.has(b.subject))
            scopesBySubject.set(b.subject, dailyScopes(b.subject));
          const matchedScope = scopesBySubject
            .get(b.subject)!
            .find(
              (entry) =>
                entry.topic.slug === u.topic &&
                entry.scope.skillId === skill.id,
            );
          const needed =
            matchedScope?.scope.sections ??
            current?.teachingSections ??
            skill.sections;
          const positions = needed.map((sourceIndex) => {
            let position = indices.lastIndexOf(sourceIndex);
            const changed =
              position >= 0 &&
              (full.sections[sourceIndex].teachingRevision ?? 0) >
                (u.lesson.sections[position]?.teachingRevision ?? 0);
            if (position < 0 || changed) {
              position = indices.length;
              indices.push(sourceIndex);
              if (pending) required.push(position);
            }
            return position;
          });
          const lesson = sliceLesson(full, indices, b.subject);
          const focused = focusLesson(full, { ...skill, sections: needed });
          positions.forEach((position, i) => {
            lesson.sections[position] = focused.sections[i];
          });
          lesson.title = skill.title;
          lesson.check = [];
          const questions = (
            u.skillId
              ? u.questions
              : u.questions.filter(
                  (q) => answers[q.id] !== undefined || q.id === pending?.id,
                )
          ).map((q) => question(q));
          // Teach-and-drill repairs stay together, including an older review task.
          if (
            promoteReview &&
            !u.skillId &&
            pending &&
            !u.questions.some((q) => q.id === pending.id)
          ) {
            questions.push({
              ...question(pending),
              phase: "drill",
              reviewUnitId: undefined,
            });
          }
          return {
            ...u,
            skillId: skill.id,
            reportingCategory: skill.reportingCategory,
            courseId: matchedScope ? matchedScope.id : u.courseId,
            title: skill.title,
            sectionIndices: indices,
            focusedConceptIndices: positions,
            requiredConceptIndices: [
              ...new Set(
                required.filter(
                  (i) =>
                    positions.includes(i) && hasTeaching(lesson.sections[i]),
                ),
              ),
            ],
            lesson,
            practiceIds: skill.questionIds,
            // Old broad assignments become one focused pending task; saved answers stay.
            questions,
          };
        }
        const scopes = DAILY_CURRICULUM[u.topic];
        const scopeIndex = Number(u.id.match(/:scope:(\d+)$/)?.[1]);
        const own = scopes?.[scopeIndex];
        if (b.subject !== "english") {
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
              (full.sections[sourceIndex].teachingRevision ?? 0) >
                (u.lesson.sections[position]?.teachingRevision ?? 0);
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
          title:
            b.subject === "math" || b.subject === "reading"
              ? (own?.title ??
                (b.subject === "reading"
                  ? `${full.title}: ${full.sections[own?.sections.find((i) => i !== 0) ?? indices[0]].heading}`
                  : u.title))
              : u.title,
          sectionIndices: indices,
          requiredConceptIndices: [...new Set(required)],
          lesson: sliceLesson(full, indices, b.subject),
          practiceIds: u.practiceIds?.map((id) =>
            answers[id] === undefined
              ? (getPracticeReplacement(id)?.id ?? id)
              : id,
          ),
          questions: u.questions.map((q) => question(q)),
        };
      };
      const units = blockUnits(b).map((unit) =>
        refreshUnit(unit, !b.reviewOnly),
      );
      const reviewUnits = b.reviewUnits?.map((unit) => refreshUnit(unit));
      const drillIds = new Set(
        units.flatMap((unit) => unit.questions.map((q) => q.id)),
      );
      const reviewQuestions = b.reviewQuestions
        ?.map((q) => question(q))
        .filter((q) => !drillIds.has(q.id))
        .filter(
          (q) =>
            answers[q.id] !== undefined ||
            [...units, ...(reviewUnits ?? [])].some((unit) =>
              unit.practiceIds?.includes(q.id),
            ),
        );
      const refreshed = {
        ...b,
        units,
        reviewUnits,
        title: units[0].title,
        lesson: units[0].lesson,
        questions: [
          ...units.flatMap((unit) => unit.questions),
          ...(reviewQuestions ?? []),
        ],
        historicalQuestions: b.historicalQuestions?.map((q) =>
          question(q, false),
        ),
        reviewQuestions,
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
    if (plan.course) {
      const covered = new Set([
        ...plan.course.coveredUnits,
        ...blockUnits(block).map((unit) => unit.courseId ?? unit.id),
      ]);
      const scopes = dailyScopes(block.subject);
      const frontier = scopes.findIndex((scope) => !covered.has(scope.id));
      next[block.subject] = frontier < 0 ? scopes.length : frontier;
    } else
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
