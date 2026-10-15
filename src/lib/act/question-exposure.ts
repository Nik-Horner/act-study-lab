import { getAllQuestions } from "./content";
import type { Question } from "./types";

const passages = new Map(getAllQuestions().map((q) => [q.id, q.passage?.id]));

export function seenPassages(
  questionIds: Iterable<string>,
  bank: Question[] = [],
) {
  const local = new Map(bank.map((q) => [q.id, q.passage?.id]));
  return new Set(
    [...questionIds].flatMap((id) => {
      const passage = local.get(id) ?? passages.get(id);
      return passage ? [passage] : [];
    }),
  );
}

/** A different question on a familiar Reading passage is review, not a new text. */
export function exposureRank(
  question: Pick<Question, "id" | "subject" | "passage">,
  answeredIds: ReadonlySet<string>,
  passageIds: ReadonlySet<string>,
) {
  return answeredIds.has(question.id)
    ? 2
    : question.subject === "reading" &&
        question.passage &&
        passageIds.has(question.passage.id)
      ? 1
      : 0;
}
