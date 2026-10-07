import type { AccountSubject } from "./account-settings";
// Digital section averages, including passage reading: English 35/50,
// Math 50/45, Reading 40/36, Science 40/40. Targets guide practice, not grading.
export const QUESTION_TARGET_SECONDS: Record<AccountSubject, number> = {
  english: 42,
  math: 67,
  reading: 67,
  science: 60,
};
export function answerPacing(elapsedMs: number, subject: AccountSubject) {
  const seconds = Math.max(0, Math.round(elapsedMs / 1000));
  const target = QUESTION_TARGET_SECONDS[subject];
  return { seconds, target, onPace: seconds <= target };
}
