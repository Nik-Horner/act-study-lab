/* Scoring — official enhanced-ACT English raw(/40) -> scale(1-36) table.
   Source: ACT National Online Practice Test Scoring Key (enhanced ACT, 2025).
   On the real test 40 of the 50 English questions are scored (10 are unscored
   field-test items). Our practice exams score every question, so we map percent
   correct onto the official /40 curve and label the result an estimate. */
export const ENGLISH_RAW40_TO_SCALE: Record<number, number> = {
  40: 36, 39: 35, 38: 35, 37: 33, 36: 31, 35: 29, 34: 28, 33: 27, 32: 26,
  31: 25, 30: 24, 29: 23, 28: 22, 27: 22, 26: 21, 25: 20, 24: 20, 23: 19,
  22: 18, 21: 17, 20: 16, 19: 15, 18: 15, 17: 14, 16: 13, 15: 13, 14: 12,
  13: 11, 12: 11, 11: 10, 10: 10, 9: 10, 8: 9, 7: 8, 6: 7, 5: 7, 4: 6,
  3: 5, 2: 3, 1: 2, 0: 1
};

/* Estimate a 1-36 scale score from (correct, total). */
export function estimateScale(correct: number, total: number): number {
  if (!total) return 1;
  const raw40 = Math.round((correct / total) * 40);
  const clamped = Math.max(0, Math.min(40, raw40));
  return ENGLISH_RAW40_TO_SCALE[clamped];
}

/* What raw/40 (and rough # correct out of `total`) is needed to reach a target scale. */
export function neededForScale(target: number, total: number): { raw40: number; ofTotal: number } {
  for (let raw = 0; raw <= 40; raw++) {
    if (ENGLISH_RAW40_TO_SCALE[raw] >= target) {
      return { raw40: raw, ofTotal: Math.ceil((raw / 40) * total) };
    }
  }
  return { raw40: 40, ofTotal: total };
}
