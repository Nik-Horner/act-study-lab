import type { Question } from "./types";

export interface StudyProfile {
  testDate: string;
  targetScore?: number;
  mathBaseline: number | null;
  scienceBaseline: number | null;
  readingBaseline?: number | null;
  minutesPerDay: number;
}

/** A baseline belongs only to the subject it was actually recorded for. */
export function subjectBaseline(
  profile: StudyProfile,
  subject: import("./types").Subject,
): number | null {
  return subject === "math"
    ? profile.mathBaseline
    : subject === "science"
      ? profile.scienceBaseline
      : (profile.readingBaseline ?? null);
}

export interface AnswerRecord {
  id: string;
  questionId: string;
  chosen: number | null;
  elapsedMs: number;
  confidence: "low" | "medium" | "high";
  cause: "content" | "careless" | "timing" | "guess" | null;
  at: string;
  mode: "drill" | "exam";
  attemptId?: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  startedAt: string;
  completedAt: string;
  answers: Record<string, number | null>;
  elapsedSeconds: number;
}

export interface StudyState {
  version: 1;
  profile: StudyProfile;
  answers: AnswerRecord[];
  attempts: ExamAttempt[];
  planChecks: string[];
  planStartDate?: string;
  planCheckDates?: Record<string, string>;
}

export const STORAGE_KEY = "act-math-science-lab-v1";
const DEFAULT_PLAN_START_DATE = "2026-10-05";

export function createDefaultState(): StudyState {
  return {
    version: 1,
    profile: {
      testDate: "2026-10-17",
      mathBaseline: 34,
      scienceBaseline: 27,
      minutesPerDay: 75,
    },
    answers: [],
    attempts: [],
    planChecks: [],
    planStartDate: DEFAULT_PLAN_START_DATE,
    planCheckDates: {},
  };
}

export const DEFAULT_STATE = createDefaultState();

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identifier(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= 200
  );
}

function finiteRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function choice(value: unknown): value is number | null {
  return (
    value === null || (finiteRange(value, 0, 3) && Number.isInteger(value))
  );
}

function timestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function calendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function baseline(value: unknown): value is number | null {
  return (
    value === null || (finiteRange(value, 1, 36) && Number.isInteger(value))
  );
}

function readAnswer(value: unknown): AnswerRecord | null {
  if (
    !object(value) ||
    !identifier(value.id) ||
    !identifier(value.questionId) ||
    !choice(value.chosen) ||
    !finiteRange(value.elapsedMs, 0, 86_400_000) ||
    !timestamp(value.at) ||
    !["low", "medium", "high"].includes(value.confidence as string) ||
    !["content", "careless", "timing", "guess", null].includes(
      value.cause as string | null,
    ) ||
    !["drill", "exam"].includes(value.mode as string) ||
    (value.attemptId !== undefined && !identifier(value.attemptId))
  )
    return null;

  return {
    id: value.id,
    questionId: value.questionId,
    chosen: value.chosen,
    elapsedMs: value.elapsedMs,
    confidence: value.confidence as AnswerRecord["confidence"],
    cause: value.cause as AnswerRecord["cause"],
    at: value.at,
    mode: value.mode as AnswerRecord["mode"],
    ...(value.attemptId === undefined
      ? {}
      : { attemptId: value.attemptId as string }),
  };
}

function readAttempt(value: unknown): ExamAttempt | null {
  if (
    !object(value) ||
    !identifier(value.id) ||
    !identifier(value.examId) ||
    !timestamp(value.startedAt) ||
    !timestamp(value.completedAt) ||
    Date.parse(value.completedAt) < Date.parse(value.startedAt) ||
    !finiteRange(value.elapsedSeconds, 0, 86_400) ||
    !object(value.answers)
  )
    return null;
  const entries = Object.entries(value.answers);
  if (
    entries.length > 500 ||
    entries.some(([id, answer]) => !identifier(id) || !choice(answer))
  )
    return null;
  return {
    id: value.id,
    examId: value.examId,
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    answers: Object.fromEntries(entries) as Record<string, number | null>,
    elapsedSeconds: value.elapsedSeconds,
  };
}

/** Validate imports and stored JSON before any data reaches the UI. */
export function validateState(value: unknown): StudyState | null {
  if (
    !object(value) ||
    value.version !== 1 ||
    !object(value.profile) ||
    !calendarDate(value.profile.testDate) ||
    (value.profile.targetScore !== undefined &&
      !baseline(value.profile.targetScore)) ||
    !baseline(value.profile.mathBaseline) ||
    !baseline(value.profile.scienceBaseline) ||
    (value.profile.readingBaseline !== undefined &&
      !baseline(value.profile.readingBaseline)) ||
    !finiteRange(value.profile.minutesPerDay, 15, 240) ||
    !Number.isInteger(value.profile.minutesPerDay) ||
    !Array.isArray(value.answers) ||
    value.answers.length > 100_000 ||
    !Array.isArray(value.attempts) ||
    value.attempts.length > 10_000 ||
    !Array.isArray(value.planChecks) ||
    value.planChecks.length > 10_000 ||
    value.planChecks.some((check) => !identifier(check))
  )
    return null;

  if (value.planStartDate !== undefined && !calendarDate(value.planStartDate))
    return null;
  const checkDates =
    value.planCheckDates === undefined ? {} : value.planCheckDates;
  if (!object(checkDates)) return null;
  const dateEntries = Object.entries(checkDates);
  const checkedIds = new Set(value.planChecks as string[]);
  if (
    dateEntries.length > 10_000 ||
    dateEntries.some(
      ([id, date]) =>
        !identifier(id) || !calendarDate(date) || !checkedIds.has(id),
    )
  )
    return null;

  const answers = value.answers.map(readAnswer);
  const attempts = value.attempts.map(readAttempt);
  if (
    answers.some((answer) => answer === null) ||
    attempts.some((attempt) => attempt === null)
  )
    return null;
  const validAnswers = answers as AnswerRecord[];
  const validAttempts = attempts as ExamAttempt[];
  if (
    new Set(validAnswers.map((answer) => answer.id)).size !==
      validAnswers.length ||
    new Set(validAttempts.map((attempt) => attempt.id)).size !==
      validAttempts.length ||
    checkedIds.size !== value.planChecks.length
  )
    return null;

  // Older backups identify tasks as YYYY-MM-DD:task-key. Keep any earlier
  // preparation history when inferring their previously unstored start date.
  const planStartDate =
    value.planStartDate ??
    (value.planChecks as string[]).reduce((start, id) => {
      const date = /^(\d{4}-\d{2}-\d{2}):.+$/.exec(id)?.[1];
      return calendarDate(date) && date < start ? date : start;
    }, DEFAULT_PLAN_START_DATE);

  return {
    version: 1,
    profile: {
      testDate: value.profile.testDate,
      ...(value.profile.targetScore === undefined
        ? {}
        : { targetScore: value.profile.targetScore as number }),
      mathBaseline: value.profile.mathBaseline,
      scienceBaseline: value.profile.scienceBaseline,
      ...(value.profile.readingBaseline !== undefined
        ? { readingBaseline: value.profile.readingBaseline as number | null }
        : {}),
      minutesPerDay: value.profile.minutesPerDay,
    },
    answers: validAnswers,
    attempts: validAttempts,
    planChecks: [...value.planChecks] as string[],
    planStartDate: planStartDate as string,
    planCheckDates: Object.fromEntries(dateEntries) as Record<string, string>,
  };
}

/** Save a task's actual completion day without changing its scheduled ID. */
export function setPlanTaskComplete(
  state: StudyState,
  id: string,
  complete: boolean,
  onDate: string,
): StudyState {
  if (!identifier(id) || !calendarDate(onDate))
    throw new Error("Invalid plan task completion");
  const checked = state.planChecks.includes(id);
  // Checking an existing task must not rewrite when it was first completed.
  if (checked === complete) return state;
  return {
    ...state,
    planChecks: complete
      ? [...state.planChecks, id]
      : state.planChecks.filter((checkedId) => checkedId !== id),
    planCheckDates: complete
      ? { ...state.planCheckDates, [id]: onDate }
      : Object.fromEntries(
          Object.entries(state.planCheckDates ?? {}).filter(
            ([checkedId]) => checkedId !== id,
          ),
        ),
  };
}

export function recordAnswer(
  state: StudyState,
  answer: AnswerRecord,
): StudyState {
  if (state.answers.some((saved) => saved.id === answer.id)) return state;
  const valid = readAnswer(answer);
  if (!valid) throw new Error("Invalid answer record");
  return { ...state, answers: [...state.answers, valid] };
}

/** Commit a submitted section and every answer in one state transition. */
export function recordExam(
  state: StudyState,
  attempt: ExamAttempt,
  questions: Question[],
): StudyState {
  if (state.attempts.some((saved) => saved.id === attempt.id)) return state;
  const valid = readAttempt(attempt);
  if (!valid) throw new Error("Invalid exam attempt");
  const uniqueQuestions = [
    ...new Map(questions.map((question) => [question.id, question])).values(),
  ];
  const answers = Object.fromEntries(
    uniqueQuestions.map((question) => {
      const chosen = valid.answers[question.id];
      return [
        question.id,
        typeof chosen === "number" && chosen < question.choices.length
          ? chosen
          : null,
      ];
    }),
  );
  const normalizedAttempt: ExamAttempt = { ...valid, answers };
  const records: AnswerRecord[] = uniqueQuestions.map((question) => ({
    id: `${valid.id}:${question.id}`,
    questionId: question.id,
    chosen: answers[question.id],
    // Section timing is in the attempt; individual times are not inferred.
    elapsedMs: 0,
    confidence: "low",
    cause: null,
    at: valid.completedAt,
    mode: "exam",
    attemptId: valid.id,
  }));
  const existingIds = new Set(state.answers.map((answer) => answer.id));
  return {
    ...state,
    attempts: [...state.attempts, normalizedAttempt],
    answers: [
      ...state.answers,
      ...records.filter((answer) => !existingIds.has(answer.id)),
    ],
  };
}

export interface TopicStats {
  attempted: number;
  correct: number;
  accuracy: number | null;
  unique: number;
  mastered: boolean;
  unresolvedIds: string[];
}

/** Latest answers prevent repeated easy questions from inflating mastery. */
export function getTopicStats(
  topicSlug: string,
  questions: Question[],
  answers: AnswerRecord[],
): TopicStats {
  const topicQuestions = new Map(
    questions
      .filter((question) => question.topic === topicSlug)
      .map((question) => [question.id, question]),
  );
  const relevant = answers.filter((answer) =>
    topicQuestions.has(answer.questionId),
  );
  const latest = new Map<string, AnswerRecord>();
  for (const answer of relevant) {
    const previous = latest.get(answer.questionId);
    if (!previous || Date.parse(answer.at) >= Date.parse(previous.at))
      latest.set(answer.questionId, answer);
  }
  let correct = 0;
  let hardCorrect = 0;
  let answered = 0;
  const unresolvedIds: string[] = [];
  for (const [id, answer] of latest) {
    const question = topicQuestions.get(id)!;
    if (answer.chosen !== null) answered += 1;
    if (answer.chosen === question.answer) {
      correct += 1;
      if (question.difficulty === "hard") hardCorrect += 1;
    } else unresolvedIds.push(id);
  }
  const accuracy = latest.size ? correct / latest.size : null;
  return {
    attempted: relevant.length,
    correct,
    accuracy,
    unique: answered,
    mastered:
      answered >= 6 && accuracy !== null && accuracy >= 0.9 && hardCorrect >= 2,
    unresolvedIds,
  };
}
