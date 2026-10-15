import { test } from "node:test";
import assert from "node:assert/strict";
import reference from "../src/content/math-reference.json";
import methods from "../src/content/math-method-questions.json";
import lessons from "../src/content/math-lessons.json";
import extraLessons from "../src/content/math-extra-lessons.json";
import original from "../src/content/math-questions.json";
import extraQuestions from "../src/content/math-extra-questions.json";
import { renderMathText } from "../src/lib/math-text";

const activeLessons = new Map(
  [...lessons, ...extraLessons].map((lesson) => [lesson.slug, lesson]),
);
const allOriginal = [
  ...original,
  ...extraQuestions,
  ...[...activeLessons.values()].flatMap((lesson) => lesson.check),
];
const close = (actual: number, expected: number) =>
  assert(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("all eight math topics have formula, condition, and worked-example references", () => {
  assert.equal(reference.length, 8);
  assert.equal(new Set(reference.map((group) => group.topic)).size, 8);
  const ids = reference.flatMap((group) =>
    group.items.map((item) => `${group.topic}:${item.id}`),
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 75);
  for (const group of reference) {
    assert(activeLessons.has(group.topic));
    for (const item of group.items) {
      assert(item.formula.includes("\\("), item.id);
      assert(item.when.length >= 60, `${item.id}: conditions and limitations`);
      assert(
        item.example.length >= 45,
        `${item.id}: a concrete worked example`,
      );
    }
  }
  const topics = Object.fromEntries(
    reference.map((group) => [group.topic, group.items.map((item) => item.id)]),
  );
  for (const [topic, required] of Object.entries({
    "math-algebra": [
      "quadratic",
      "vertex",
      "remainder",
      "absolute",
      "radical",
      "rational",
    ],
    "math-functions": ["domain", "inverse", "log", "variation", "transform"],
    "math-geometry": [
      "coordinatecircle",
      "transformations",
      "conesphere",
      "prisms",
      "circleangles",
    ],
    "math-trigonometry": ["exact", "doubleangle", "triggraphs", "trianglelaws"],
    "math-statistics-probability": [
      "counting",
      "conditional",
      "spread",
      "design",
    ],
    "math-number-quantity": [
      "matrixinverse",
      "vectors",
      "geometric",
      "arithmetic",
      "integers",
    ],
  }))
    for (const id of required)
      assert(topics[topic].includes(id), `${topic}: ${id}`);
});

test("added practice is independent, has plausible distinct choices, and names its taught sections", () => {
  assert.equal(methods.length, 48);
  assert.equal(new Set(methods.map((q) => q.id)).size, methods.length);
  const originalIds = new Set(allOriginal.map((q) => q.id));
  const task = (q: { stem: string; questionText: string }) =>
    `${q.stem}\n${q.questionText}`.toLowerCase().replace(/\s+/g, " ");
  const existing = new Set(allOriginal.map(task));
  const tasks = new Set<string>();
  for (const group of reference)
    assert.equal(methods.filter((q) => q.topic === group.topic).length, 6);
  for (const q of methods) {
    assert(!originalIds.has(q.id));
    assert(!existing.has(task(q)), `${q.id}: do not copy an existing task`);
    assert(!tasks.has(task(q)), q.id);
    tasks.add(task(q));
    assert.equal(q.subject, "math");
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
    assert(q.explanation.length >= 120, q.id);
    assert(q.lessonSections.length > 0);
    const lesson = activeLessons.get(q.topic)!;
    assert(
      q.lessonSections.every(
        (index) => Number.isInteger(index) && lesson.sections[index],
      ),
      q.id,
    );
  }
});

test("all 48 method answer keys have independent arithmetic or solution-set checks", () => {
  const proofs: Record<string, [string, () => void]> = {
    "math-algebra-m1": [
      String.raw`\(-1\pm\sqrt7\)`,
      () => {
        for (const root of [-1 + Math.sqrt(7), -1 - Math.sqrt(7)])
          close(root * root + 2 * root - 6, 0);
      },
    ],
    "math-algebra-m2": [
      "8",
      () => {
        close(8 ** 2 - 4 * 2 * 8, 0);
        close(2 * (-2) ** 2 + 8 * -2 + 8, 0);
      },
    ],
    "math-algebra-m3": [
      "−23",
      () => close(2 * (-2) ** 3 - 3 * (-2) ** 2 + 5, -23),
    ],
    "math-algebra-m4": [
      String.raw`\(x<-2\text{ or }x\ge3\)`,
      () => {
        for (const x of [-10, -3, -2, -1, 0, 2, 3, 4, 10])
          assert.equal(x !== -2 && (x - 3) / (x + 2) >= 0, x < -2 || x >= 3);
      },
    ],
    "math-functions-m1": [
      "(3, −7)",
      () => {
        for (const x of [-1, 0, 3, 5])
          close(2 * x * x - 12 * x + 11, 2 * (x - 3) ** 2 - 7);
      },
    ],
    "math-functions-m2": [
      String.raw`\(\frac{17}{7}\)`,
      () => {
        const x = 17 / 7;
        assert(x > 2);
        close(
          Math.log(2 * x - 1) / Math.log(3) - Math.log(x - 2) / Math.log(3),
          2,
        );
      },
    ],
    "math-functions-m3": [
      String.raw`\(-4+2\sqrt3\)`,
      () => {
        const x = -4 + 2 * Math.sqrt(3);
        assert(x >= -4);
        close((x + 4) ** 2 - 2, 10);
      },
    ],
    "math-functions-m4": ["3", () => close(10 * 3, 2 * 15)],
    "math-geometry-m1": [
      "Center (3,−4), radius 5",
      () => {
        for (const [x, y] of [
          [8, -4],
          [-2, -4],
          [3, 1],
          [3, -9],
        ])
          close(x * x + y * y - 6 * x + 8 * y, 0);
      },
    ],
    "math-geometry-m2": [
      "(−1,1)",
      () => {
        const dx = 4 - 1,
          dy = 0 - -2;
        close(-dy + 1, -1);
        close(dx - 2, 1);
        close(dx * dx + dy * dy, (-1 - 1) ** 2 + (1 + 2) ** 2);
      },
    ],
    "math-geometry-m3": [
      String.raw`\(90\pi\)`,
      () => close(5 * Math.hypot(5, 12) + 25, 90),
    ],
    "math-geometry-m4": [
      "72",
      () =>
        close(
          [2 * 3, 2 * 3, 2 * 6, 2 * 6, 3 * 6, 3 * 6].reduce((a, b) => a + b),
          72,
        ),
    ],
    "math-trigonometry-m1": [
      String.raw`\(-\frac{\sqrt3}2\)`,
      () => close(Math.sin((5 * Math.PI) / 3), -Math.sqrt(3) / 2),
    ],
    "math-trigonometry-m2": [
      String.raw`\(7/25\)`,
      () => close(Math.cos(2 * (Math.PI - Math.asin(3 / 5))), 7 / 25),
    ],
    "math-trigonometry-m3": [
      String.raw`\(3\pi\)`,
      () => {
        const solutions = [1 / 6, 1 / 3, 7 / 6, 4 / 3].map((x) => x * Math.PI);
        solutions.forEach((x) => {
          assert(x >= 0 && x < 2 * Math.PI);
          close(Math.sin(2 * x), Math.sqrt(3) / 2);
        });
        close(
          solutions.reduce((a, b) => a + b),
          3 * Math.PI,
        );
      },
    ],
    "math-trigonometry-m4": [
      String.raw`\(\sqrt{93}\)`,
      () =>
        close(4 ** 2 + 7 ** 2 - 2 * 4 * 7 * Math.cos((2 * Math.PI) / 3), 93),
    ],
    "math-statistics-probability-m1": ["5/9", () => close(10 / 18, 5 / 9)],
    "math-statistics-probability-m2": [
      "30",
      () => {
        const permutations = (letters: string[]): string[] =>
          letters.length
            ? letters.flatMap((letter, index) =>
                permutations(letters.filter((_, i) => i !== index)).map(
                  (tail) => letter + tail,
                ),
              )
            : [""];
        assert.equal(new Set(permutations([..."LEVEL"])).size, 30);
      },
    ],
    "math-statistics-probability-m3": [
      "9",
      () => {
        const data = [2, 2, 8, 8].map((x) => -3 * x + 4);
        const mean = data.reduce((a, b) => a + b) / data.length;
        close(
          Math.sqrt(
            data.reduce((a, x) => a + (x - mean) ** 2, 0) / data.length,
          ),
          9,
        );
      },
    ],
    "math-statistics-probability-m4": [
      "−$0.60",
      () => close((12 - 3) * 0.2 + -3 * 0.8, -0.6),
    ],
    "math-number-quantity-m1": [
      "−2",
      () => {
        assert.deepEqual(
          [
            [3 * 1 + 1 * -2, 3 * -1 + 1 * 3],
            [2 * 1 + 1 * -2, 2 * -1 + 1 * 3],
          ],
          [
            [1, 0],
            [0, 1],
          ],
        );
      },
    ],
    "math-number-quantity-m2": [
      String.raw`\(\sqrt{37}\)`,
      () => close((2 * 2 - 3) ** 2 + (2 * -1 - 4) ** 2, 37),
    ],
    "math-number-quantity-m3": [
      "282",
      () =>
        close(
          Array.from({ length: 12 }, (_, i) => 7 + 3 * i).reduce(
            (a, b) => a + b,
          ),
          282,
        ),
    ],
    "math-number-quantity-m4": [
      "252",
      () => {
        const multiples = Array.from({ length: 126 }, (_, i) => 84 * (i + 1));
        assert.equal(
          multiples.find((x) => x % 126 === 0),
          252,
        );
      },
    ],
    "math-essential-skills-m1": ["$200", () => close(200 * 1.2 * 0.85, 204)],
    "math-essential-skills-m2": [
      "300/7 mph",
      () => close((60 + 90) / (60 / 30 + 90 / 60), 300 / 7),
    ],
    "math-essential-skills-m3": [
      "27/5",
      () => close(3 / 12 + 27 / 5 / 12 + 27 / 5 / 18, 1),
    ],
    "math-essential-skills-m4": [
      "8",
      () => close((12 * 0.25) / (12 + 8), 0.15),
    ],
    "math-modeling-m1": [
      String.raw`\(1000(1.025)^8\)`,
      () => {
        let amount = 1000;
        for (let quarter = 0; quarter < 8; quarter++)
          amount += (amount * 0.1) / 4;
        close(amount, 1000 * 1.025 ** 8);
      },
    ],
    "math-modeling-m2": [
      "44",
      () =>
        close(
          Math.max(
            ...Array.from({ length: 61 }, (_, i) => i / 10).map(
              (q) => -2 * q * q + 36 * q - 100,
            ),
          ),
          44,
        ),
    ],
    "math-modeling-m3": [
      "13",
      () =>
        assert.equal(
          Array.from({ length: 30 }, (_, i) => i).find(
            (n) => 18 + 4 * n > 42 + 2 * n,
          ),
          13,
        ),
    ],
    "math-modeling-m4": [
      "−2",
      () =>
        close(
          [5, 9, 14].reduce(
            (sum, observed, i) => sum + observed - (2 + 4 * (i + 1)),
            0,
          ),
          -2,
        ),
    ],
    "math-algebra-m5": [
      "28",
      () => {
        const sums = [];
        for (let a = 1; a * a < 12; a++)
          if (12 % a === 0) sums.push(a + 12 / a);
        assert.deepEqual(sums, [13, 8, 7]);
        assert.equal(
          sums.reduce((a, b) => a + b),
          28,
        );
      },
    ],
    "math-algebra-m6": [
      String.raw`\(-3\le x<-2\)`,
      () => {
        for (const x of [-9, -3.01, -3, -2.5, -2.01, -2, 0, 2.99, 3, 3.01, 10])
          assert.equal(
            x !== -2 && x !== 3 && (x * x - 9) / (x * x - x - 6) <= 0,
            x >= -3 && x < -2,
          );
      },
    ],
    "math-functions-m5": [
      "(5/2,2)",
      () => {
        const f = (x: number) => ((x - 1) * (x - 7)) / 3;
        close(f(4), -3);
        close(f(2 * (5 / 2) - 1) + 5, 2);
        for (const x of [-10, 0, 2, 3, 8]) assert(f(2 * x - 1) + 5 >= 2);
      },
    ],
    "math-functions-m6": [
      "3",
      () => {
        let term = 1;
        const terms = [];
        for (let next = 1; next <= 3; next++) {
          term = term ** 2 - 2 * next;
          terms.push(term);
        }
        assert.deepEqual(terms, [-1, -3, 3]);
      },
    ],
    "math-geometry-m5": [
      "160",
      () => {
        const halfChord = 8;
        const chordOffset = Math.sqrt(10 ** 2 - halfChord ** 2);
        // Coordinates A=(6,8), B=(6,-8), P=(26,0); use a determinant.
        close(Math.abs((6 - 26) * (-8 - 0) - (6 - 26) * (8 - 0)) / 2, 160);
        close(chordOffset, 6);
      },
    ],
    "math-geometry-m6": [
      "2/5",
      () => {
        const c = Math.hypot(12, 9);
        const area = (12 * 9) / 2;
        const r = area / ((12 + 9 + c) / 2);
        close(r / (c / 2), 2 / 5);
      },
    ],
    "math-trigonometry-m5": [
      String.raw`\(2\pi/9\)`,
      () => {
        const amplitude = (8 - -4) / 2;
        const midline = (8 + -4) / 2;
        const inputScale = (2 * Math.PI) / ((2 * Math.PI) / 3);
        close(
          Math.acos((-1 - midline) / amplitude) / inputScale,
          (2 * Math.PI) / 9,
        );
        close(
          amplitude * Math.cos(inputScale * ((2 * Math.PI) / 9)) + midline,
          -1,
        );
      },
    ],
    "math-trigonometry-m6": [
      "17/9",
      () => {
        const angles = [
          Math.PI / 4 + Math.asin(1 / (3 * Math.SQRT2)),
          Math.PI / 4 + Math.PI - Math.asin(1 / (3 * Math.SQRT2)),
        ];
        for (const theta of angles) {
          close(Math.sin(theta) - Math.cos(theta), 1 / 3);
          close((Math.sin(theta) + Math.cos(theta)) ** 2, 17 / 9);
        }
      },
    ],
    "math-statistics-probability-m5": [
      "5/18",
      () => {
        const k = (4 * 5 - (3 * 4 + 2 * 8)) / (2 - 4);
        assert.equal(k, 4);
        const values = [2, 2, 2, 2, 4, 4, 4, 8, 8];
        let same = 0,
          count = 0;
        values.forEach((a, i) =>
          values.slice(i + 1).forEach((b) => {
            count++;
            if (a === b) same++;
          }),
        );
        close(same / count, 5 / 18);
      },
    ],
    "math-statistics-probability-m6": [
      "$0.00",
      () => {
        const colors = ["r", "r", "r", "b", "b"];
        const payouts = colors.flatMap((a, i) =>
          colors.slice(i + 1).map((b) => (a === b ? 6 : 1) - 3),
        );
        close(payouts.reduce((a, b) => a + b) / payouts.length, 0);
      },
    ],
    "math-number-quantity-m5": [
      "41",
      () => {
        let matrix = [
          [1, 0],
          [0, 1],
        ];
        for (let exponent = 1; exponent <= 39; exponent++) {
          const [[a, b], [c, d]] = matrix;
          matrix = [
            [a, a + b],
            [c, c + d],
          ];
          if (exponent === 37)
            assert.deepEqual(matrix, [
              [1, 37],
              [0, 1],
            ]);
        }
        assert.equal(
          matrix.flat().reduce((a, b) => a + b),
          41,
        );
      },
    ],
    "math-number-quantity-m6": [
      "No such positive integer exists",
      () => {
        const exponentOfTwo = (n: number) => {
          let power = 0;
          while (n % 2 === 0) {
            n /= 2;
            power++;
          }
          return power;
        };
        assert.equal(exponentOfTwo(12) % 2, 0);
        assert.equal(exponentOfTwo(18) % 2, 1);
        // Every positive integer n has either an even or odd 2-adic exponent.
        for (const parity of [0, 1])
          assert(
            !(
              (exponentOfTwo(12) + parity) % 2 === 0 &&
              (exponentOfTwo(18) + parity) % 2 === 0
            ),
          );
      },
    ],
    "math-essential-skills-m5": [
      "50",
      () => {
        const k = (3 * 12 + 4 * 6) / (4 * 3 - 3 * 2);
        close(k, 10);
        close((2 * k + 12) / (3 * k - 6), 4 / 3);
        close(5 * k, 50);
      },
    ],
    "math-essential-skills-m6": [
      "$792.00",
      () => {
        const needed = (6 * 15) / (30 / 100) ** 2;
        const packs = Math.ceil((needed * 1.08) / 25);
        assert.equal(packs, 44);
        assert(43 * 25 < needed * 1.08);
        close(18 * packs, 792);
      },
    ],
    "math-modeling-m5": [
      "$50",
      () => {
        let best = 0;
        for (let x = 0; x <= 17; x++)
          for (let y = 0; y <= 17; y++)
            if (2 * x + y <= 17 && x + 2 * y <= 17)
              best = Math.max(best, 5 * x + 4 * y);
        assert.equal(best, 50);
      },
    ],
    "math-modeling-m6": [
      "5",
      () => {
        assert.equal(
          Array.from({ length: 21 }, (_, t) => t).find(
            (t) => 400 * 1.2 ** t > 600 * 1.1 ** t,
          ),
          5,
        );
        const crossing = Math.log(1.5) / Math.log(12 / 11);
        assert(crossing > 4 && crossing < 5);
      },
    ],
  };
  assert.equal(Object.keys(proofs).length, methods.length);
  for (const q of methods) {
    const [choice, verify] = proofs[q.id];
    assert.equal(q.choices[q.answer], choice, q.id);
    verify();
  }
});

test("matrix lessons and checks use accessible math rendering with intact brackets", () => {
  const data = JSON.stringify([
    ...lessons,
    ...extraLessons,
    ...original,
    ...extraQuestions,
    ...methods,
  ]);
  assert.doesNotMatch(data, /\[\[/);
  const check = lessons
    .find((lesson) => lesson.slug === "math-number-quantity")!
    .check.find((q) => q.id === "check-math-number-quantity-2")!;
  const html = renderMathText(check.choices[check.answer]);
  assert.match(html, /<mtable/);
  assert.match(html, /<mo fence="true">\[/);
  assert.doesNotMatch(html, /class="ul"|katex-error/);
});
