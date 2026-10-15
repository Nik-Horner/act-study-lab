import { getQuestions, getTopic } from "./content";

export function validateEnglishDrillAnswer(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.topicSlug !== "string" ||
    typeof body.questionId !== "string" ||
    !getTopic(body.topicSlug)
  )
    return null;
  const question = getQuestions(body.topicSlug).find(
    (q) => q.id === body.questionId,
  );
  if (!question) return null;
  if (body.chosen !== undefined) {
    if (
      typeof body.chosen !== "number" ||
      !Number.isInteger(body.chosen) ||
      body.chosen < 0 ||
      body.chosen >= question.choices.length
    )
      return null;
    return {
      topicSlug: body.topicSlug,
      questionId: question.id,
      correct: body.chosen === question.answer,
    };
  }
  // shortcut: old open clients only send correctness; remove after their upgrade.
  return typeof body.correct === "boolean"
    ? {
        topicSlug: body.topicSlug,
        questionId: question.id,
        correct: body.correct,
      }
    : null;
}
