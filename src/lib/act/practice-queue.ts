import type { Question, Subject } from "./types";
import { subjectBaseline, type StudyState } from "./progress-model";
import { answerPacing } from "../question-pacing";
import { exposureRank, seenPassages } from "./question-exposure";

export function practiceStage(
  questions: Question[],
  state: StudyState,
  subject: Subject,
) {
  const bank = new Map(questions.map((q) => [q.id, q]));
  const first = new Map<string, StudyState["answers"][number]>();
  const latest = new Map<string, StudyState["answers"][number]>();
  for (const answer of [...state.answers].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at),
  )) {
    if (answer.mode === "drill" && bank.has(answer.questionId)) {
      if (!first.has(answer.questionId)) first.set(answer.questionId, answer);
      latest.set(answer.questionId, answer);
    }
  }
  const recent = [...first.values()].slice(-6);
  const secure = recent.filter(
    (a) =>
      a.chosen === bank.get(a.questionId)!.answer &&
      latest.get(a.questionId)?.chosen === bank.get(a.questionId)!.answer &&
      a.confidence !== "low" &&
      a.elapsedMs > 0 &&
      answerPacing(a.elapsedMs, subject).onPace,
  ).length;
  const baseline = subjectBaseline(state.profile, subject);
  if (baseline === null && recent.length < 6) return "Diagnostic";
  if (recent.length === 6 && secure < 3) return "Foundations";
  if (
    (state.profile.targetScore ?? 36) >= 33 &&
    ((recent.length < 6 && (baseline ?? 0) >= 28) || secure >= 5)
  )
    return "Challenge";
  if (
    (baseline !== null && baseline < 24 && secure < 5) ||
    (recent.length === 6 && secure < 3)
  )
    return "Foundations";
  return "Build";
}

/** Fresh problems come before retention; a short set samples difficulty and skills. */
export function selectPracticeSet(
  questions: Question[],
  state: StudyState,
  subject: Subject,
) {
  const active = questions.filter((q) => q.assessment !== false);
  const stage = practiceStage(active, state, subject);
  const quotas =
    stage === "Foundations"
      ? [8, 3, 1]
      : stage === "Challenge"
        ? [2, 3, 7]
        : stage === "Diagnostic"
          ? [4, 4, 4]
          : [4, 5, 3];
  const levels = ["easy", "medium", "hard"] as const;
  const seen = new Set(state.answers.map((a) => a.questionId));
  const priorPassages = seenPassages(seen, questions);
  const selected: Question[] = [];
  const used = new Set<string>();
  const topics = new Map<string, number>();
  const passages = new Set<string>();
  const take = (pool: Question[], count: number) => {
    for (let n = 0; n < count && selected.length < 12; n++) {
      const q = pool
        .filter((q) => !used.has(q.id))
        .sort(
          (a, b) =>
            Number(!!a.passage && passages.has(a.passage.id)) -
              Number(!!b.passage && passages.has(b.passage.id)) ||
            (topics.get(a.topic) ?? 0) - (topics.get(b.topic) ?? 0),
        )[0];
      if (!q) break;
      selected.push(q);
      used.add(q.id);
      topics.set(q.topic, (topics.get(q.topic) ?? 0) + 1);
      if (q.passage) passages.add(q.passage.id);
    }
  };
  for (const rank of [0, 1, 2]) {
    const pool = active.filter(
      (q) => exposureRank(q, seen, priorPassages) === rank,
    );
    levels.forEach((level, i) =>
      take(
        pool.filter((q) => q.difficulty === level),
        Math.max(
          0,
          quotas[i] - selected.filter((q) => q.difficulty === level).length,
        ),
      ),
    );
    take(pool, 12 - selected.length);
  }
  return selected;
}
