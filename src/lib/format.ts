/* Pure formatting/DOM-free helpers ported from js/data.js. */

/* Turn "text [[underlined]] more" into HTML with the underlined span. */
export function renderStem(stem: string): string {
  return escapeHTML(stem).replace(
    /\[\[([^\[\]]+?)\]\]/g,
    '<span class="ul">$1</span>',
  );
}

export function escapeHTML(s: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  };
  return String(s).replace(/[&<>"]/g, (c) => map[c]);
}

export const LETTERS = ["A", "B", "C", "D"] as const;

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function daysUntil(
  dateStr: string,
  now = new Date(),
  timeZone = "America/Chicago",
): number {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const today = new Date(date + "T12:00:00");
  const target = new Date(dateStr + "T12:00:00");
  return Math.max(
    0,
    Math.round((target.getTime() - today.getTime()) / 86400000),
  );
}
