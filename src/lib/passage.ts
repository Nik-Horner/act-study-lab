/* Parses exam passage markup: prose text with inline [[N|replacement text]] markers.
   N is the matching ExamQuestion.number; replacement text may be empty (an
   insertion-point question with no underlined words, just a caret between words). */

export type PassageSegment =
  | { type: "text"; value: string }
  | { type: "blank"; number: number; text: string };

// [\s\S] instead of dotAll `.` — the "s" regex flag needs an es2018+ target.
const MARKER_RE = /\[\[(\d+)\|([\s\S]*?)\]\]/g;

export function parsePassage(html: string): PassageSegment[] {
  const segments: PassageSegment[] = [];
  let lastIndex = 0;

  for (const match of html.matchAll(MARKER_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: html.slice(lastIndex, index) });
    }
    segments.push({ type: "blank", number: Number(match[1]), text: match[2] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < html.length) {
    segments.push({ type: "text", value: html.slice(lastIndex) });
  }

  return segments;
}
