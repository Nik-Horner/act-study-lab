import type { DailyBlock, DailyPlan, DailyUnit } from "./daily-plan";
import { answerPacing } from "./question-pacing";
import { DAILY_CURRICULUM } from "./daily-curriculum";
/** Keep saved concept keys while skipping Reading sections already taught. */
export function readingConceptProgress(plan: DailyPlan, lessons: string[]) {
  const completed = new Set(lessons);
  for (const block of plan.blocks) {
    if (block.subject !== "reading" || block.reviewOnly) continue;
    const taught = new Set<string>();
    for (const id of plan.course?.coveredUnits ?? []) {
      const match = id.match(/^reading:(.+):scope:(\d+)$/);
      if (match)
        DAILY_CURRICULUM[match[1]]?.[Number(match[2])]?.sections.forEach(
          (index) => taught.add(`${match[1]}:${index}`),
        );
    }
    for (const unit of blockUnits(block)) {
      unit.sectionIndices?.forEach((source, index) => {
        const key = `${unit.id}:concept:${index}`;
        const section = `${unit.topic}:${source}`;
        if (
          taught.has(section) &&
          !unit.requiredConceptIndices?.includes(index)
        )
          completed.add(key);
        if (completed.has(key) || completed.has(unit.id)) taught.add(section);
      });
      if (
        unit.lesson.sections.every((_, i) =>
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
        !lessons.includes(unit.id) ||
        unit.requiredConceptIndices?.some(
          (i) => !lessons.includes(`${unit.id}:concept:${i}`),
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

/** Revisit weak skills with fresh drills instead of declaring mastery on completion. */
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
        const weak = new Set(plan.nextFocus?.[block.subject] ?? []);
        for (const unit of [
          ...blockUnits(block),
          ...(block.reviewUnits ?? []),
        ]) {
          const workedExamples = unit.lesson.sections.flatMap((section) =>
            (section.examples ?? []).map((example) => example.text),
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
          const missed = questions.some(
            (question) =>
              answers[question.id] !== question.answer ||
              uncertainAnswers[question.id] ||
              (answerTimes[question.id] !== undefined &&
                !answerPacing(answerTimes[question.id], block.subject).onPace),
          );
          if (missed)
            weak.add(
              unit.sectionIndices ? (unit.courseId ?? unit.id) : unit.topic,
            );
          else if (
            questions.every(
              (question) =>
                Number.isFinite(answerTimes[question.id]) &&
                answerTimes[question.id] >= 0,
            ) &&
            new Set(
              questions
                .filter(
                  (question) =>
                    !plan.previouslyAnsweredQuestions?.includes(question.id) &&
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
          }
        }
        return [block.subject, [...weak]];
      }),
    ),
  };
}
