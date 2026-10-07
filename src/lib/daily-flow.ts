import type { DailyBlock, DailyPlan, DailyUnit } from "./daily-plan";
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
        unit: blockUnits(block).find(
          (u) =>
            u.practiceIds?.includes(question.id) ?? u.topic === question.topic,
        )!,
        question,
      };
    if (!lessons.includes(`review:${block.subject}`))
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
): DailyPlan["nextFocus"] {
  return Object.fromEntries(
    plan.blocks.map((block) => [
      block.subject,
      blockUnits(block)
        .filter((unit) => {
          const review = (block.reviewQuestions ?? []).filter((q) =>
            unit.practiceIds
              ? unit.practiceIds.includes(q.id)
              : q.topic === unit.topic,
          );
          const correct = unit.questions.filter(
            (q) => answers[q.id] === q.answer,
          ).length;
          return (
            correct / unit.questions.length < 0.9 ||
            review.some((q) => answers[q.id] !== q.answer)
          );
        })
        .map((unit) => (unit.sectionIndices ? unit.id : unit.topic)),
    ]),
  );
}
