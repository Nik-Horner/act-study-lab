export const SUBJECTS = ["english", "math", "reading", "science"] as const;
export type AccountSubject = (typeof SUBJECTS)[number];
export interface StudySettings {
  scores: Record<AccountSubject, number | null>;
  minutesPerDay: number;
}
export function readStudySettings(
  metadata: Record<string, unknown> = {},
  englishScore: number | null = null,
): StudySettings {
  const raw = metadata.act_study_settings as Partial<StudySettings> | undefined;
  const score = (value: unknown) =>
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 36
      ? value
      : null;
  return {
    scores: {
      english: score(englishScore),
      math: score(raw?.scores?.math),
      reading: score(raw?.scores?.reading),
      science: score(raw?.scores?.science),
    },
    minutesPerDay: [60, 75, 90].includes(raw?.minutesPerDay as number)
      ? raw!.minutesPerDay!
      : 75,
  };
}
export function validateStudySettings(value: unknown): StudySettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as StudySettings;
  if (
    !raw.scores ||
    typeof raw.scores !== "object" ||
    ![60, 75, 90].includes(raw.minutesPerDay)
  )
    return null;
  for (const subject of SUBJECTS) {
    const score = raw.scores[subject];
    if (
      score !== null &&
      (typeof score !== "number" ||
        !Number.isInteger(score) ||
        score < 1 ||
        score > 36)
    )
      return null;
  }
  return {
    scores: Object.fromEntries(
      SUBJECTS.map((s) => [s, raw.scores[s]]),
    ) as StudySettings["scores"],
    minutesPerDay: raw.minutesPerDay,
  };
}
