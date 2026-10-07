/** Keep authored reasoning intact while removing repeated answer-key boilerplate. */
export function explanationSteps(explanation: string) {
  const cleaned = explanation
    .replace(
      /\s*The supported answer is [\s\S]*?Reject choices that change the stated facts, exceed the evidence, or answer a different question\.\s*$/,
      "",
    )
    .trim();
  return cleaned.split(/(?<=[.!?])\s+(?=[A-Z“"])/).filter(Boolean);
}
