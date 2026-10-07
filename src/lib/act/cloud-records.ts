import { getExam, getExamQuestions, getQuestion } from "./content";
import {
  createDefaultState,
  recordAnswer,
  recordExam,
  validateState,
  type AnswerRecord,
  type ExamAttempt,
  type StudyState,
} from "./progress-model";
import type { Json, Tables } from "../supabase/database.types";

export const PRACTICE_EXAM_IDS = [
  "practice:math",
  "practice:science",
  "practice:reading",
  "math-1",
  "math-2",
  "science-1",
  "science-2",
  "reading-1",
  "reading-2",
];
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type CloudRecord =
  | { kind: "answer"; event: AnswerRecord }
  | { kind: "exam"; attempt: ExamAttempt };

/** Only server-known questions and valid choices may enter account history. */
export function validateCloudRecord(value: unknown): CloudRecord | null {
  if (!value || typeof value !== "object") return null;
  const v = value as CloudRecord;
  try {
    if (v.kind === "answer") {
      const event = v.event;
      if (
        !event ||
        !uuid.test(event.id) ||
        event.mode !== "drill" ||
        !getQuestion(event.questionId)
      )
        return null;
      // Do not let a drill reveal/count held-out exam questions before a section.
      const q = getQuestion(event.questionId)!;
      if (getExamIdsForQuestion(q.id)) return null;
      recordAnswer(createDefaultState(), event);
      return { kind: "answer", event };
    }
    if (v.kind === "exam") {
      const attempt = v.attempt;
      if (!attempt || !uuid.test(attempt.id)) return null;
      const exam = getExam(attempt.examId);
      if (attempt.elapsedSeconds > exam.minutes * 60) return null;
      const keys = Object.keys(attempt.answers ?? {});
      if (keys.some((id) => !exam.questionIds.includes(id))) return null;
      const normalized = recordExam(
        createDefaultState(),
        attempt,
        getExamQuestions(exam.id),
      ).attempts[0];
      return { kind: "exam", attempt: normalized };
    }
  } catch {
    return null;
  }
  return null;
}

function getExamIdsForQuestion(id: string) {
  return PRACTICE_EXAM_IDS.filter(
    (value) => !value.startsWith("practice:"),
  ).some((value) => {
    try {
      return getExam(value).questionIds.includes(id);
    } catch {
      return false;
    }
  });
}

export function cloudInsert(record: CloudRecord, userId: string) {
  const questions =
    record.kind === "answer"
      ? [getQuestion(record.event.questionId)!]
      : getExamQuestions(record.attempt.examId);
  const rawCorrect = questions.filter(
    (q) =>
      (record.kind === "answer"
        ? record.event.chosen
        : record.attempt.answers[q.id]) === q.answer,
  ).length;
  return {
    id: record.kind === "answer" ? record.event.id : record.attempt.id,
    user_id: userId,
    exam_id:
      record.kind === "answer"
        ? `practice:${questions[0].subject}`
        : record.attempt.examId,
    answers: record as unknown as Json,
    raw_correct: rawCorrect,
    raw_total: questions.length,
    // Existing English estimates retain their original values. Zero denotes
    // unscaled original practice, never a claimed official 1–36 score.
    scale_score: 0,
    duration_seconds:
      record.kind === "answer"
        ? Math.round(record.event.elapsedMs / 1000)
        : record.attempt.elapsedSeconds,
    completed_at:
      record.kind === "answer" ? record.event.at : record.attempt.completedAt,
  };
}

export function hydrateCloudState(
  rows: Pick<Tables<"exam_attempts">, "answers">[],
  profile: Tables<"profiles"> | null,
  checks: Tables<"plan_checks">[],
  timeZone = "America/Chicago",
): StudyState {
  let state = createDefaultState();
  state.profile = {
    ...state.profile,
    testDate: profile?.test_date ?? state.profile.testDate,
    mathBaseline: null,
    scienceBaseline: null,
    targetScore: profile?.target_score ?? 36,
  };
  // Preserve the twelve-day preparation sequence, including its diagnostic,
  // even when the account first opens it after the first day.
  const start = new Date(`${state.profile.testDate}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 12);
  state.planStartDate = start.toISOString().slice(0, 10);
  state.planChecks = checks.map((row) => row.item_key);
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  state.planCheckDates = Object.fromEntries(
    checks.map((row) => [
      row.item_key,
      dateFormatter.format(new Date(row.checked_at)),
    ]),
  );
  for (const row of rows) {
    const record = validateCloudRecord(row.answers);
    if (record?.kind === "answer") state = recordAnswer(state, record.event);
    if (record?.kind === "exam")
      state = recordExam(
        state,
        record.attempt,
        getExamQuestions(record.attempt.examId),
      );
  }
  return validateState(state)!;
}
