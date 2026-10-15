import cards from "../content/math-formula-cards.json";

export interface FormulaDay {
  date: string;
  ids: string[];
  remaining: string[];
  recalled: number;
  total: number;
  minutes: number;
  daysLeft: number;
}

/** Keep a new lesson plus its complete formula packet within two hours. */
export function lessonMinutesWithFormulas(
  lessonMinutes: number,
  formulaMinutes: number,
) {
  return Math.min(lessonMinutes, 120 - formulaMinutes);
}

export function formulaDay(
  keys: string[],
  today: string,
  testDate: string,
  savedIds?: string[],
): FormulaDay {
  const marks = new Set(keys);
  const progress = cards.map((card) => {
    const prefix = `formula:${card.id}:`;
    const misses = keys
      .filter((key) => key.startsWith(`${prefix}miss:`))
      .map((key) => key.slice(`${prefix}miss:`.length))
      .filter((date) => date <= today)
      .sort();
    const lastMiss = misses.at(-1) ?? "";
    const recalls = [
      ...new Set(
        keys
          .filter((key) => key.startsWith(`${prefix}recall:`))
          .map((key) => key.slice(`${prefix}recall:`.length))
          .filter((date) => date <= today),
      ),
    ].sort();
    return {
      id: card.id,
      introduced: recalls.length > 0 || misses.length > 0,
      last: recalls.at(-1) ?? "",
      known: recalls.filter((date) => date > lastMiss).length >= 2,
    };
  });
  const daysLeft = Math.max(
    0,
    Math.ceil((Date.parse(testDate) - Date.parse(today)) / 86400000),
  );
  const unseen = progress.filter((card) => !card.introduced);
  // Finish introducing cards halfway to test day, leaving days for recall.
  const newCount = Math.ceil(
    unseen.length / Math.max(1, Math.floor(daysLeft / 2)),
  );
  const review = progress
    .filter(
      (card) =>
        card.introduced && !marks.has(`formula:${card.id}:recall:${today}`),
    )
    .sort(
      (a, b) =>
        Number(a.known) - Number(b.known) || a.last.localeCompare(b.last),
    );
  const reviewCount = Math.max(
    6,
    Math.ceil(
      review.filter((card) => !card.known).length / Math.max(1, daysLeft - 1),
    ),
  );
  const ids = savedIds ?? [
    ...unseen.slice(0, newCount).map((card) => card.id),
    ...review.slice(0, reviewCount).map((card) => card.id),
  ];
  return {
    date: today,
    ids,
    remaining: ids.filter((id) => !marks.has(`formula:${id}:recall:${today}`)),
    recalled: progress.filter((card) => card.known).length,
    total: cards.length,
    minutes: Math.ceil(ids.length / 2),
    daysLeft,
  };
}

export function validFormulaPacket(
  value: unknown,
  today: string,
): value is { date: string; ids: string[] } {
  if (!value || typeof value !== "object") return false;
  const packet = value as { date?: unknown; ids?: unknown };
  return (
    packet.date === today &&
    Array.isArray(packet.ids) &&
    packet.ids.length <= cards.length &&
    new Set(packet.ids).size === packet.ids.length &&
    packet.ids.every((id) => cards.some((card) => card.id === id))
  );
}
