import type { Exam } from "./content";
import { remainingSeconds } from "./act/exam-session";

export const ENGLISH_EXAM_SECONDS = 35 * 60;
const uuid =
  /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
export interface EnglishExamSession {
  id: string;
  examId: string;
  ownerId: string;
  startedAt: number;
  deadline: number;
  finishedAt: number | null;
  answers: Record<number, number | null>;
  flags: number[];
  activeQuestion: number;
}
export interface EnglishExamSubmission {
  attemptId: string;
  examId: string;
  ownerId: string;
  answers: { number: number; picked: number | null }[];
  durationSeconds: number;
}
export function englishExamStorageKey(ownerId: string, examId: string) {
  return `act-study-english-exam:${ownerId}:${examId}`;
}
export function newEnglishExamSession(
  exam: Exam,
  ownerId: string,
  now = Date.now(),
): EnglishExamSession {
  const numbers = exam.passages.flatMap((p) =>
    p.questions.map((q) => q.number),
  );
  return {
    id: crypto.randomUUID(),
    examId: exam.id,
    ownerId,
    startedAt: now,
    deadline: now + ENGLISH_EXAM_SECONDS * 1000,
    finishedAt: null,
    answers: Object.fromEntries(numbers.map((number) => [number, null])),
    flags: [],
    activeQuestion: Math.min(...numbers),
  };
}
export function validateEnglishExamSubmission(
  value: unknown,
  exam: Exam,
): EnglishExamSubmission | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as EnglishExamSubmission;
  const questions = exam.passages.flatMap((p) => p.questions);
  if (
    typeof raw.attemptId !== "string" ||
    !uuid.test(raw.attemptId) ||
    typeof raw.ownerId !== "string" ||
    !uuid.test(raw.ownerId) ||
    raw.examId !== exam.id ||
    !Array.isArray(raw.answers) ||
    raw.answers.length > questions.length ||
    !Number.isInteger(raw.durationSeconds) ||
    raw.durationSeconds < 0 ||
    raw.durationSeconds > ENGLISH_EXAM_SECONDS
  )
    return null;
  const seen = new Set<number>();
  for (const item of raw.answers) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const question = questions.find((q) => q.number === item.number);
    if (
      !question ||
      seen.has(item.number) ||
      (item.picked !== null &&
        (!Number.isInteger(item.picked) ||
          item.picked < 0 ||
          item.picked >= question.choices.length))
    )
      return null;
    seen.add(item.number);
  }
  return {
    attemptId: raw.attemptId,
    examId: exam.id,
    ownerId: raw.ownerId,
    durationSeconds: raw.durationSeconds,
    answers: raw.answers.map(({ number, picked }) => ({ number, picked })),
  };
}
export function validateEnglishExamSession(
  value: unknown,
  exam: Exam,
  ownerId: string,
  now = Date.now(),
): EnglishExamSession | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as EnglishExamSession;
  const numbers = exam.passages.flatMap((p) =>
    p.questions.map((q) => q.number),
  );
  if (
    raw.ownerId !== ownerId ||
    raw.examId !== exam.id ||
    !Number.isSafeInteger(raw.startedAt) ||
    raw.startedAt < 0 ||
    raw.startedAt > now ||
    raw.deadline !== raw.startedAt + ENGLISH_EXAM_SECONDS * 1000 ||
    (raw.finishedAt !== null &&
      (!Number.isSafeInteger(raw.finishedAt) ||
        raw.finishedAt < raw.startedAt ||
        raw.finishedAt > raw.deadline)) ||
    !numbers.includes(raw.activeQuestion) ||
    !Array.isArray(raw.flags) ||
    new Set(raw.flags).size !== raw.flags.length ||
    raw.flags.some((number) => !numbers.includes(number)) ||
    !raw.answers ||
    typeof raw.answers !== "object" ||
    Array.isArray(raw.answers) ||
    Object.keys(raw.answers).some(
      (key) => !numbers.some((number) => String(number) === key),
    )
  )
    return null;
  const submission = validateEnglishExamSubmission(
    {
      attemptId: raw.id,
      ownerId,
      examId: exam.id,
      durationSeconds: 0,
      answers: Object.entries(raw.answers).map(([number, picked]) => ({
        number: Number(number),
        picked,
      })),
    },
    exam,
  );
  if (!submission) return null;
  return {
    id: submission.attemptId,
    ownerId,
    examId: exam.id,
    startedAt: raw.startedAt,
    deadline: raw.deadline,
    finishedAt: raw.finishedAt,
    answers: Object.fromEntries(
      numbers.map((number) => [number, raw.answers[number] ?? null]),
    ),
    flags: [...raw.flags],
    activeQuestion: raw.activeQuestion,
  };
}
export function englishExamSubmission(
  session: EnglishExamSession,
): EnglishExamSubmission {
  return {
    attemptId: session.id,
    ownerId: session.ownerId,
    examId: session.examId,
    answers: Object.entries(session.answers).map(([number, picked]) => ({
      number: Number(number),
      picked,
    })),
    durationSeconds:
      ENGLISH_EXAM_SECONDS -
      remainingSeconds(session.deadline, session.finishedAt ?? Date.now()),
  };
}
