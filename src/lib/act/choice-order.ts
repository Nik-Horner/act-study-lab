import type { Question } from "./types";

/** Display positions only; answers and eliminations always use content indices. */
export function displayChoiceOrder(
  question: Pick<Question, "id" | "subject" | "choices">,
): number[] {
  const order = question.choices.map((_, index) => index);
  if (question.subject !== "reading") return order;
  let seed = 2166136261;
  for (let index = 0; index < question.id.length; index++)
    seed = Math.imul(seed ^ question.id.charCodeAt(index), 16777619) >>> 0;
  for (let index = order.length - 1; index > 0; index--) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const other = (seed >>> 0) % (index + 1);
    [order[index], order[other]] = [order[other], order[index]];
  }
  return order;
}
