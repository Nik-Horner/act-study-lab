/** Authored teaching scopes and matching practice-bank positions (zero based).
 * These are deliberately explicit: topic membership alone does not prove that
 * a question's prerequisites were taught in this particular daily lesson.
 * Full topic lessons remain available; later scopes continue the curriculum.
 */
export interface DailyScope {
  title?: string;
  sections: number[];
  practice: number[];
}
const scope = (
  sections: number[],
  practice: number[],
  title?: string,
): DailyScope => ({
  ...(title ? { title } : {}),
  sections,
  practice,
});
export const DAILY_CURRICULUM: Record<string, DailyScope[]> = {
  "math-algebra": [
    scope([0], [0, 1, 6, 7], "Linear equations and systems"),
    scope(
      [1, 4],
      [2, 3, 13, 14, 15, 16, 17],
      "Restrictions, radicals, and absolute values",
    ),
    scope(
      [2, 3],
      [4, 5, 9, 10, 11, 12],
      "Polynomials, roots, and inequalities",
    ),
    scope([5, 6], [8, 19, 22, 23, 25], "Parameters, identities, and exponents"),
  ],
  "math-functions": [
    scope(
      [0, 1],
      [0, 1, 6, 8, 9, 10],
      "Function inputs, composition, and domain",
    ),
    scope([2, 3], [2, 3, 7, 13, 16], "Transformations and inverses"),
    scope([4], [11, 12, 17], "Zeros, holes, asymptotes, and rates"),
    scope(
      [5, 6],
      [4, 5, 14, 15],
      "Linear, exponential, and logarithmic models",
    ),
  ],
  "math-geometry": [
    scope([0, 1], [0, 2, 13, 14], "Areas, triangles, and polygon angles"),
    scope([2], [6, 7, 30], "Similarity: lengths, areas, and volumes"),
    scope(
      [3],
      [3, 4, 8, 9, 11, 12],
      "Circle angles, arcs, chords, and tangents",
    ),
    scope(
      [4, 5, 6],
      [1, 5, 10, 15, 16, 17],
      "Coordinate distance, solids, and inscribed shapes",
    ),
  ],
  "math-trigonometry": [
    scope(
      [0, 2],
      [0, 2, 6, 7],
      "Right-triangle ratios, signs, and reciprocals",
    ),
    scope(
      [1, 3],
      [4, 8, 9, 10, 11],
      "Radians, exact values, and trig identities",
    ),
    scope([4], [3, 12, 13, 14], "Trig graphs: period, shift, and range"),
    scope([5, 6], [1, 5, 15, 16, 17], "Triangle laws and elevation models"),
  ],
  "math-statistics-probability": [
    scope([0, 1], [0, 6, 7, 8], "Means, medians, and weighted totals"),
    scope(
      [2, 3],
      [1, 5, 9, 17],
      "Spread, sample spaces, and conditional probability",
    ),
    scope([4], [3, 10, 11, 12, 26], "And, or, independence, and complements"),
    scope(
      [5, 6],
      [2, 4, 13, 14, 15, 16],
      "Counting, exact outcomes, and expected value",
    ),
  ],
  "math-number-quantity": [
    scope([0, 3], [4, 6, 14], "Exponents and radicals"),
    scope([1, 5], [1, 2, 15, 16, 17], "Vectors and matrices"),
    scope(
      [2, 6],
      [3, 9, 10, 11, 12, 13],
      "Sequences, sums, and scientific notation",
    ),
    scope([4], [0, 7, 8], "Complex multiplication, division, and magnitude"),
  ],
  "math-essential-skills": [
    scope([0, 3], [0, 1, 6, 7, 8, 9], "Ratios, percent bases, and discounts"),
    scope(
      [1, 4],
      [2, 4, 10, 11, 15, 16, 17],
      "Unit conversions and average rates",
    ),
    scope(
      [2, 5, 6],
      [3, 5, 12, 13, 14],
      "Mixtures, work rates, and weighted averages",
    ),
  ],
  "math-modeling": [
    scope(
      [0, 3],
      [0, 4, 5, 6, 7, 11, 13, 17],
      "Word equations and whole-number thresholds",
    ),
    scope([1, 5], [1, 14, 15, 16], "Growth, decay, and model parameters"),
    scope(
      [2, 4, 6],
      [2, 3, 8, 9, 10, 12],
      "Quadratic models and constrained maxima",
    ),
  ],
  "science-data-reading": [
    scope([0, 1], [0, 1, 7, 8, 9, 10, 11]),
    scope([2, 3], [2, 12, 13, 14, 15, 16, 17]),
    scope([4], [3, 4, 18, 19, 20, 21, 22]),
    scope([5, 6], [28, 29, 30, 31]),
  ],
  "science-trends-interpolation": [
    scope([0, 1], [0, 1, 2, 5]),
    scope([2], [3, 4, 12]),
    scope([3, 4], [7, 8, 9, 10, 11, 17, 18, 19, 20, 21]),
    scope([1, 5, 6], [12, 13, 14, 15, 16, 27, 28, 29, 30, 31]),
  ],
  "science-experimental-design": [
    scope([0, 1], [0, 1, 2, 3, 4]),
    scope([2, 3], [5, 6, 7, 8, 9, 10, 12, 13, 14, 15]),
    scope([4, 5], [11, 18, 19]),
    scope([6], [16, 17, 20, 21, 22]),
  ],
  "science-conflicting-viewpoints": [
    scope([0, 1], [0, 1, 2, 3, 4]),
    scope([2, 3], [5, 6, 7, 8, 9, 10, 11]),
    scope([4], [12, 13, 14, 15, 16]),
    scope([5, 6], [17, 18, 19, 20, 21]),
  ],
  "science-models-evidence": [
    scope([0, 1], [0, 1, 2, 3, 4, 5, 6]),
    scope([2, 3], [17, 18, 19, 20, 21]),
    scope([4, 5], [12, 13, 14, 15, 16, 22, 23, 24, 25, 26]),
    scope([0, 6], [7, 8, 9, 10, 11, 27, 28, 29, 30, 31]),
  ],
  "science-scientific-foundations": [
    scope([0, 1], [0, 1, 2, 3, 4, 12, 13, 14, 15, 16]),
    scope([2, 6], [5, 6, 24, 25]),
    scope([3], [7, 8, 9, 10, 11]),
    scope([4, 5], [17, 18, 19, 20, 21, 27, 28, 29, 30, 31]),
  ],
};
for (const topic of [
  "main-idea",
  "details",
  "inference",
  "vocabulary",
  "craft",
  "integration",
]) {
  DAILY_CURRICULUM[`reading-${topic}`] = [
    scope([0, 1], [0, 1, 2, 3, 4, 5, 6, 7]),
    scope([2, 3], [8, 9, 10, 11, 12, 13, 14, 15]),
    scope([4, 5, 6], [16, 17, 18, 19, 20, 21, 22, 23]),
  ];
}
