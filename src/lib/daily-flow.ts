import type { DailyBlock, DailyPlan, DailyUnit } from "./daily-plan";
import { answerPacing } from "./question-pacing";
import { DAILY_CURRICULUM } from "./daily-curriculum";
import {
  getLearningSkill,
  getLearningSkills,
  getQuestionTeaching,
  hasTeaching,
} from "./learning-skills";
import { getLesson, getQuestions } from "./act/content";

/** Resolve historical scopes through their authored assessment pool, never a topic guess. */
export function legacyFocusSkills(key: string): string[] | undefined {
  const match = key.match(/^(math|science|reading):([^:]+):scope:(\d+)$/);
  if (!match) return undefined;
  const scope = DAILY_CURRICULUM[match[2]]?.[Number(match[3])];
  const bank = getQuestions(match[2]);
  return [
    ...new Set(
      (scope?.practice ?? []).flatMap((i) =>
        bank[i]?.skillId ? [bank[i].skillId!] : [],
      ),
    ),
  ];
}
export function dailyConcepts(unit: DailyUnit) {
  return (
    unit.focusedConceptIndices ?? unit.lesson.sections.map((_, i) => i)
  ).filter(
    (i) => unit.lesson.sections[i] && hasTeaching(unit.lesson.sections[i]),
  );
}
/** Keep saved keys while reusing verified teaching and preserving new activities. */
export function readingConceptProgress(plan: DailyPlan, lessons: string[]) {
  const completed = new Set(lessons);
  for (const block of plan.blocks) {
    if (!["reading", "english"].includes(block.subject) || block.reviewOnly)
      continue;
    const proofKey = (unit: DailyUnit, index: number) => {
      const section = unit.lesson.sections[index];
      const source = unit.sectionIndices?.[index] ?? index;
      if (block.subject === "english")
        return section.activity
          ? undefined
          : `${unit.topic}:${source}:${JSON.stringify(section)}`;
      return `${unit.topic}:${unit.skillId}:${source}:${section.teachingRevision ?? 0}`;
    };
    const proven = new Map<string, Set<string>>();
    for (const unit of blockUnits(block)) {
      if (!unit.skillId) continue;
      for (const index of dailyConcepts(unit)) {
        if (!lessons.includes(`${unit.id}:concept:${index}`)) continue;
        const key = proofKey(unit, index);
        if (!key) continue;
        const owners = proven.get(key) ?? new Set<string>();
        owners.add(unit.id);
        proven.set(key, owners);
      }
    }
    const taught = new Set<string>();
    for (const id of plan.course?.coveredUnits ?? []) {
      const match = id.match(/^reading:(.+):scope:(\d+)$/);
      if (match)
        DAILY_CURRICULUM[match[1]]?.[Number(match[2])]?.sections.forEach(
          (index) => {
            if ((getLesson(match[1]).sections[index].teachingRevision ?? 0) < 3)
              taught.add(`${match[1]}:${index}`);
          },
        );
      const skill = id.match(/^reading:([^:]+):skill:([^:]+)(?::|$)/);
      if (skill)
        getLearningSkill(skill[1], skill[2])?.sections.forEach((index) =>
          taught.add(`${skill[1]}:skill:${skill[2]}:${index}`),
        );
    }
    for (const unit of blockUnits(block)) {
      for (const index of dailyConcepts(unit)) {
        const source = unit.sectionIndices?.[index] ?? index;
        const key = `${unit.id}:concept:${index}`;
        const section = `${unit.topic}:${source}`;
        const covered =
          taught.has(section) ||
          (unit.skillId &&
            taught.has(`${unit.topic}:skill:${unit.skillId}:${source}`));
        const proof = proofKey(unit, index);
        const sameMethod =
          unit.skillId &&
          proof &&
          [...(proven.get(proof) ?? [])].some((id) => id !== unit.id);
        if (
          (covered && !unit.requiredConceptIndices?.includes(index)) ||
          sameMethod
        )
          completed.add(key);
      }
      if (
        dailyConcepts(unit).every((i) =>
          completed.has(`${unit.id}:concept:${i}`),
        )
      )
        completed.add(unit.id);
    }
  }
  return [...completed];
}
export function blockUnits(block: DailyBlock): DailyUnit[] {
  return (
    block.units ?? [
      {
        id: `${block.subject}:${block.topic}`,
        topic: block.topic,
        title: block.title,
        lesson: block.lesson,
        questions: block.questions,
      },
    ]
  );
}
export const dailyReviewKey = (block: DailyBlock) =>
  block.reviewKey ?? `review:${block.subject}`;
export function dailyStep(
  plan: DailyPlan,
  answers: Record<string, number>,
  lessons: readonly string[],
) {
  for (const block of plan.blocks) {
    for (const unit of blockUnits(block)) {
      if (
        (!block.reviewOnly && !lessons.includes(unit.id)) ||
        unit.requiredConceptIndices?.some(
          (i) =>
            dailyConcepts(unit).includes(i) &&
            !lessons.includes(`${unit.id}:concept:${i}`),
        )
      )
        return { kind: "lesson" as const, block, unit };
      const question = unit.questions.find((q) => answers[q.id] === undefined);
      if (question) return { kind: "drill" as const, block, unit, question };
    }
    const question = block.reviewQuestions?.find(
      (q) => answers[q.id] === undefined,
    );
    if (question)
      return {
        kind: "drill" as const,
        block,
        unit: [...blockUnits(block), ...(block.reviewUnits ?? [])].find((u) =>
          question.reviewUnitId
            ? u.id === question.reviewUnitId
            : (u.practiceIds?.includes(question.id) ??
              u.topic === question.topic),
        )!,
        question,
      };
    if (!lessons.includes(dailyReviewKey(block)))
      return { kind: "review" as const, block };
  }
  return { kind: "done" as const };
}
export function dailyComplete(
  plan: DailyPlan,
  answers: Record<string, number>,
  lessons: readonly string[],
) {
  return dailyStep(plan, answers, lessons).kind === "done";
}

/** Revisit weak skills without declaring mastery on lesson completion. */
export function dailyFocus(
  plan: DailyPlan,
  answers: Record<string, number>,
  answerTimes: Record<string, number> = {},
  uncertainAnswers: Record<string, boolean> = {},
): DailyPlan["nextFocus"] {
  return {
    ...plan.nextFocus,
    ...Object.fromEntries(
      plan.blocks.map((block) => {
        const weak = new Set(
          (plan.nextFocus?.[block.subject] ?? []).flatMap((key) => {
            const legacy = legacyFocusSkills(key);
            if (legacy?.length) {
              const topic = key.split(":")[1];
              return legacy.map(
                (id) => `${block.subject}:${topic}:skill:${id}`,
              );
            }
            const topicSkills = getLearningSkills(key, block.subject);
            return topicSkills.length
              ? topicSkills.map(
                  (skill) =>
                    `${block.subject}:${skill.topic}:skill:${skill.id}`,
                )
              : [key];
          }),
        );
        for (const unit of [
          ...blockUnits(block),
          ...(block.reviewUnits ?? []),
        ]) {
          const workedExamples = unit.lesson.sections.flatMap((section) =>
            [...(section.examples ?? []), ...(section.workedCases ?? [])].map(
              (example) => example.text,
            ),
          );
          const review = (block.reviewQuestions ?? []).filter((question) =>
            question.reviewUnitId
              ? question.reviewUnitId === unit.id
              : unit.practiceIds
                ? unit.practiceIds.includes(question.id)
                : question.topic === unit.topic,
          );
          const questions = [...unit.questions, ...review].filter(
            (question) => answers[question.id] !== undefined,
          );
          // A later review can resolve a repair flag; score mastery stays separate.
          const laterReview =
            block.reviewUnits?.some((entry) => entry.id === unit.id) &&
            questions.every(
              (question) =>
                question.phase === "review" &&
                question.reviewUnitId === unit.id,
            ) &&
            (plan.course?.coveredUnits.includes(unit.courseId ?? unit.id) ||
              questions.some((question) =>
                plan.previouslyAnsweredQuestions?.includes(question.id),
              ));
          const missed = questions.some(
            (question) =>
              answers[question.id] !== question.answer ||
              uncertainAnswers[question.id] ||
              (answerTimes[question.id] !== undefined &&
                !answerPacing(answerTimes[question.id], block.subject).onPace),
          );
          if (missed) {
            for (const question of questions.filter(
              (question) =>
                answers[question.id] !== question.answer ||
                uncertainAnswers[question.id] ||
                (answerTimes[question.id] !== undefined &&
                  !answerPacing(answerTimes[question.id], block.subject)
                    .onPace),
            )) {
              const skill =
                question.skillId ??
                getQuestionTeaching(question.topic, question.id)?.skillId;
              weak.add(
                skill
                  ? `${block.subject}:${question.topic}:skill:${skill}`
                  : unit.sectionIndices
                    ? (unit.courseId ?? unit.id)
                    : unit.topic,
              );
            }
          } else if (
            questions.every(
              (question) =>
                Number.isFinite(answerTimes[question.id]) &&
                answerTimes[question.id] > 0,
            ) &&
            new Set(
              questions
                .filter(
                  (question) =>
                    (laterReview ||
                      !plan.previouslyAnsweredQuestions?.includes(
                        question.id,
                      )) &&
                    (!unit.skillId || question.skillId === unit.skillId) &&
                    !workedExamples.some(
                      (example) =>
                        question.questionText.trim().length > 0 &&
                        example.includes(question.questionText) &&
                        example.includes(question.choices[question.answer]),
                    ),
                )
                .map((question) => question.id),
            ).size >= 2
          ) {
            weak.delete(unit.courseId ?? unit.id);
            weak.delete(unit.topic);
            if (unit.skillId)
              for (const key of weak)
                if (
                  key ===
                    `${block.subject}:${unit.topic}:skill:${unit.skillId}` ||
                  key.startsWith(
                    `${block.subject}:${unit.topic}:skill:${unit.skillId}:`,
                  )
                )
                  weak.delete(key);
          }
        }
        return [block.subject, [...weak]];
      }),
    ),
  };
}
