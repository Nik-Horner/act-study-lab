import { getTopic } from "./content";
import { englishDailyQuestions } from "./english-daily-content";

export const ENGLISH_PRACTICE_ID = "practice:english";
export const ANSWER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateEnglishDrillAnswer(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.answerId !== "string" ||
    !ANSWER_ID.test(body.answerId) ||
    typeof body.topicSlug !== "string" ||
    typeof body.questionId !== "string" ||
    !getTopic(body.topicSlug)
  )
    return null;
  const question = englishDailyQuestions(body.topicSlug).find(
    (q) => q.id === body.questionId,
  );
  if (
    !question ||
    typeof body.chosen !== "number" ||
    !Number.isInteger(body.chosen) ||
    body.chosen < 0 ||
    body.chosen >= question.choices.length
  )
    return null;
  return {
    answerId: body.answerId,
    topicSlug: body.topicSlug,
    questionId: question.id,
    chosen: body.chosen,
    correct: body.chosen === question.answer,
  };
}
