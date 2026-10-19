/** Keep authored reasoning intact while removing repeated answer-key boilerplate. */
export function explanationSteps(explanation: string) {
  const cleaned = explanation
    .replace(
      /\s*The supported answer is [\s\S]*?Reject choices that change the stated facts, exceed the evidence, or answer a different question\.\s*$/,
      "",
    )
    .trim();
  const steps: string[] = [];
  let quote: string | null = null;
  for (const part of cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z“"])/)
    .filter(Boolean)) {
    if (quote) steps[steps.length - 1] += ` ${part}`;
    else steps.push(part);
    for (let i = 0; i < part.length; i++) {
      const char = part[i];
      const apostrophe =
        (char === "'" || char === "’") &&
        /\w/.test(part[i - 1] ?? "") &&
        /\w/.test(part[i + 1] ?? "");
      if (apostrophe) continue;
      if (quote === char) quote = null;
      else if (!quote && !/\w/.test(part[i - 1] ?? "")) {
        if (char === "“") quote = "”";
        else if (char === "‘") quote = "’";
        else if (char === '"' || char === "'") quote = char;
      }
    }
  }
  return steps;
}
