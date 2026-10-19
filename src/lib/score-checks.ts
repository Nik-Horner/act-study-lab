import {
  SUBJECTS,
  type AccountSubject,
  type StudySettings,
} from "./account-settings";
import { dailyDate } from "./daily-date";

export const SCORE_CHECK_EXAM_ID = "readiness:score";

export interface ScoreCheckInput {
  subject: AccountSubject;
  score: number;
  formName: string;
  date: string;
  official: boolean;
  timed: boolean;
  firstAttempt: boolean;
}

export interface ScoreCheck extends ScoreCheckInput {
  id: string;
  recordedAt: string;
}

export function validateScoreCheck(
  value: unknown,
  today = dailyDate(),
): ScoreCheckInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as ScoreCheckInput;
  if (
    !SUBJECTS.includes(raw.subject) ||
    !Number.isInteger(raw.score) ||
    raw.score < 1 ||
    raw.score > 36 ||
    typeof raw.formName !== "string" ||
    typeof raw.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(raw.date) ||
    !Number.isFinite(Date.parse(`${raw.date}T00:00:00Z`)) ||
    new Date(`${raw.date}T00:00:00Z`).toISOString().slice(0, 10) !== raw.date ||
    raw.date > today ||
    typeof raw.official !== "boolean" ||
    typeof raw.timed !== "boolean" ||
    typeof raw.firstAttempt !== "boolean"
  )
    return null;
  const formName = raw.formName.trim().replace(/\s+/g, " ");
  if (!/[a-z0-9]/i.test(formName) || formName.length > 100) return null;
  return {
    subject: raw.subject,
    score: raw.score,
    formName,
    date: raw.date,
    official: raw.official,
    timed: raw.timed,
    firstAttempt: raw.firstAttempt,
  };
}

export function readScoreCheck(
  value: unknown,
  today = dailyDate(),
): ScoreCheck | null {
  const input = validateScoreCheck(value, today);
  if (!input) return null;
  const raw = value as ScoreCheck;
  if (
    typeof raw.id !== "string" ||
    !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(
      raw.id,
    ) ||
    typeof raw.recordedAt !== "string" ||
    !Number.isFinite(Date.parse(raw.recordedAt)) ||
    new Date(raw.recordedAt).toISOString() !== raw.recordedAt
  )
    return null;
  return { ...input, id: raw.id, recordedAt: raw.recordedAt };
}

function formKey(formName: string) {
  return formName.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function scoreCheckId(
  userId: string,
  subject: AccountSubject,
  formName: string,
) {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        JSON.stringify([
          SCORE_CHECK_EXAM_ID,
          userId,
          subject,
          formKey(formName),
        ]),
      ),
    ),
  );
  // The primary key makes correcting a form atomic, including simultaneous saves.
  digest[6] = (digest[6] & 0x0f) | 0x80;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = [...digest.slice(0, 16)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function scoreCheckEvidence(
  checks: ScoreCheck[],
  target: number,
  today = dailyDate(),
) {
  const sorted = [...checks].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt),
  );
  return Object.fromEntries(
    SUBJECTS.map((subject) => {
      const forms = new Set<string>();
      const recent = sorted
        .filter((check) => {
          if (check.subject !== subject) return false;
          const key = formKey(check.formName);
          if (forms.has(key)) return false;
          forms.add(key);
          const age = (Date.parse(today) - Date.parse(check.date)) / 86_400_000;
          return (
            check.official &&
            check.timed &&
            check.firstAttempt &&
            age >= 0 &&
            age < 30
          );
        })
        .slice(0, 2);
      return [
        subject,
        {
          checks: recent,
          targetHits:
            Number.isInteger(target) && target >= 1 && target <= 36
              ? recent.filter((check) => check.score >= target).length
              : 0,
        },
      ];
    }),
  ) as Record<AccountSubject, { checks: ScoreCheck[]; targetHits: number }>;
}

/** The latest eligible score remains the baseline; recency gates readiness, not learning. */
export function scoreCheckPlanning(
  settings: StudySettings,
  checks: ScoreCheck[],
  today = dailyDate(),
): StudySettings {
  const eligible = checks
    .filter(
      (check) =>
        check.official &&
        check.timed &&
        check.firstAttempt &&
        check.date <= today,
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.recordedAt.localeCompare(a.recordedAt),
    );
  return {
    ...settings,
    scores: Object.fromEntries(
      SUBJECTS.map((subject) => [
        subject,
        eligible.find((check) => check.subject === subject)?.score ??
          settings.scores[subject],
      ]),
    ) as StudySettings["scores"],
  };
}
