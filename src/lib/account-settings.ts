export const SUBJECTS = ["english", "math", "reading", "science"] as const;
export type AccountSubject = (typeof SUBJECTS)[number];
export const DESMOS_TOPICS = [
  "math-algebra",
  "math-functions",
  "math-essential-skills",
  "math-modeling",
] as const;
export interface StudySettings {
  scores: Record<AccountSubject, number | null>;
  minutesPerDay: number;
  mathFocus?: "geometry-trig" | "all";
  mathCoveredTopics?: string[];
  scienceScoreRepresentative?: boolean;
  includeScience?: boolean;
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
    ...(raw?.mathFocus === "all" || raw?.mathFocus === "geometry-trig"
      ? { mathFocus: raw.mathFocus }
      : {}),
    ...(Array.isArray(raw?.mathCoveredTopics)
      ? {
          mathCoveredTopics: [
            ...new Set(
              raw.mathCoveredTopics.filter((topic) =>
                DESMOS_TOPICS.includes(topic as (typeof DESMOS_TOPICS)[number]),
              ),
            ),
          ],
        }
      : {}),
    ...(typeof raw?.scienceScoreRepresentative === "boolean"
      ? { scienceScoreRepresentative: raw.scienceScoreRepresentative }
      : {}),
    ...(typeof raw?.includeScience === "boolean"
      ? { includeScience: raw.includeScience }
      : {}),
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
  if (
    raw.mathFocus !== undefined &&
    !["geometry-trig", "all"].includes(raw.mathFocus)
  )
    return null;
  if (
    raw.scienceScoreRepresentative !== undefined &&
    typeof raw.scienceScoreRepresentative !== "boolean"
  )
    return null;
  if (
    raw.includeScience !== undefined &&
    typeof raw.includeScience !== "boolean"
  )
    return null;
  if (
    raw.mathCoveredTopics !== undefined &&
    (!Array.isArray(raw.mathCoveredTopics) ||
      raw.mathCoveredTopics.length > DESMOS_TOPICS.length ||
      raw.mathCoveredTopics.some(
        (topic) =>
          !DESMOS_TOPICS.includes(topic as (typeof DESMOS_TOPICS)[number]),
      ) ||
      new Set(raw.mathCoveredTopics).size !== raw.mathCoveredTopics.length)
  )
    return null;
  return {
    scores: Object.fromEntries(
      SUBJECTS.map((s) => [s, raw.scores[s]]),
    ) as StudySettings["scores"],
    minutesPerDay: raw.minutesPerDay,
    ...(raw.mathFocus === undefined ? {} : { mathFocus: raw.mathFocus }),
    ...(raw.mathCoveredTopics === undefined
      ? {}
      : { mathCoveredTopics: [...raw.mathCoveredTopics] }),
    ...(raw.scienceScoreRepresentative === undefined
      ? {}
      : { scienceScoreRepresentative: raw.scienceScoreRepresentative }),
    ...(raw.includeScience === undefined
      ? {}
      : { includeScience: raw.includeScience }),
  };
}

export function geometryFirst(settings: StudySettings) {
  return settings.mathFocus
    ? settings.mathFocus === "geometry-trig"
    : (settings.scores.math ?? 0) >= 32;
}

export function planningScores(
  settings: StudySettings,
): StudySettings["scores"] {
  if (settings.scienceScoreRepresentative !== false) return settings.scores;
  const otherScores = [
    settings.scores.english,
    settings.scores.math,
    settings.scores.reading,
  ].filter((score): score is number => score !== null);
  // A low-effort Science result supplies no evidence of a larger knowledge gap.
  return {
    ...settings.scores,
    science: otherScores.length
      ? Math.round(
          otherScores.reduce((sum, score) => sum + score, 0) /
            otherScores.length,
        )
      : null,
  };
}
