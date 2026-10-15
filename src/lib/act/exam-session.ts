import type { Exam } from "./types";
export interface ExamSession {
  id: string;
  ownerId: string;
  examId: string;
  startedAt: string;
  deadline: number;
  finishedAt: number | null;
  answers: Record<string, number | null>;
  flags: string[];
  eliminated: Record<string, number[]>;
  index: number;
}
export function remainingSeconds(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
export function validateSession(
  value: unknown,
  exam: Exam,
  ownerId: string,
): ExamSession | null {
  if (!value || typeof value !== "object") return null;
  const v = value as ExamSession;
  if (
    typeof v.id !== "string" ||
    v.id.trim().length === 0 ||
    v.id.length > 200 ||
    (v.ownerId !== undefined && v.ownerId !== ownerId) ||
    v.examId !== exam.id ||
    typeof v.startedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(v.startedAt) ||
    !Number.isFinite(Date.parse(v.startedAt)) ||
    typeof v.deadline !== "number" ||
    v.deadline !== Date.parse(v.startedAt) + exam.minutes * 60_000 ||
    (v.finishedAt !== undefined &&
      v.finishedAt !== null &&
      (!Number.isSafeInteger(v.finishedAt) ||
        v.finishedAt < Date.parse(v.startedAt) ||
        v.finishedAt > v.deadline)) ||
    !Number.isInteger(v.index) ||
    v.index < 0 ||
    v.index >= exam.questionIds.length ||
    !Array.isArray(v.flags) ||
    v.flags.some((f) => !exam.questionIds.includes(f)) ||
    !v.answers ||
    typeof v.answers !== "object" ||
    Array.isArray(v.answers) ||
    !v.eliminated ||
    typeof v.eliminated !== "object" ||
    Array.isArray(v.eliminated)
  )
    return null;
  for (const [id, a] of Object.entries(v.answers))
    if (
      !exam.questionIds.includes(id) ||
      (a !== null && (!Number.isInteger(a) || a < 0 || a > 3))
    )
      return null;
  for (const [id, items] of Object.entries(v.eliminated))
    if (
      !exam.questionIds.includes(id) ||
      !Array.isArray(items) ||
      items.some((a) => !Number.isInteger(a) || a < 0 || a > 3)
    )
      return null;
  return { ...v, ownerId, finishedAt: v.finishedAt ?? null };
}
export function finalizeSession(
  session: ExamSession,
  now = Date.now(),
): ExamSession {
  if (session.finishedAt !== null) return session;
  return {
    ...session,
    answers: { ...session.answers },
    finishedAt: Math.min(
      session.deadline,
      Math.max(Date.parse(session.startedAt), now),
    ),
  };
}
