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
  assert.equal(ids.length, 71);
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
  assert.equal(methods.length, 32);
  assert.equal(new Set(methods.map((q) => q.id)).size, methods.length);
  const originalIds = new Set(allOriginal.map((q) => q.id));
  const task = (q: { stem: string; questionText: string }) =>
    `${q.stem}\n${q.questionText}`.toLowerCase().replace(/\s+/g, " ");
  const existing = new Set(allOriginal.map(task));
  const tasks = new Set<string>();
  for (const group of reference)
    assert.equal(methods.filter((q) => q.topic === group.topic).length, 4);
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

test("all 32 new answer keys have independent arithmetic or solution-set checks", () => {
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
