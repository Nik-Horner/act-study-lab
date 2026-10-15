export type FormulaReview = { remaining: number[]; revealed: boolean };
export type FormulaAction = "reveal" | "again" | "remembered";

export function startFormulaReview(count: number): FormulaReview {
  return {
    remaining: Array.from({ length: count }, (_, i) => i),
    revealed: false,
  };
}

export function reviewFormula(
  state: FormulaReview,
  action: FormulaAction,
): FormulaReview {
  if (action === "reveal") return { ...state, revealed: true };
  if (!state.revealed || !state.remaining.length) return state;
  const [current, ...rest] = state.remaining;
  return {
    remaining: action === "again" ? [...rest, current] : rest,
    revealed: false,
  };
}
