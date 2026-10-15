import { test } from "node:test";
import assert from "node:assert/strict";
import cards from "../src/content/math-formula-cards.json";

function formula(id: string) {
  const card = cards.find((card) => card.id === id);
  assert(card, `Missing formula card: ${id}`);
  return card.formula;
}
const close = (actual: number, expected: number) =>
  assert(Math.abs(actual - expected) < 1e-10, `${actual} ≠ ${expected}`);

test("double-angle card notation and equivalent forms agree at positive and negative angles", () => {
  assert.equal(
    formula("sin-double"),
    String.raw`\sin(2\theta)=2\sin\theta\cos\theta`,
  );
  assert.equal(
    formula("tan-double"),
    String.raw`\tan(2\theta)=\frac{2\tan\theta}{1-\tan^2\theta}`,
  );
  for (const text of [
    String.raw`\cos^2\theta-\sin^2\theta`,
    String.raw`2\cos^2\theta-1`,
    String.raw`1-2\sin^2\theta`,
  ])
    assert(formula("cos-double").includes(text));
  for (const t of [-2.4, -0.7, 0, 0.4, 1.1, 2.1]) {
    close(Math.sin(2 * t), 2 * Math.sin(t) * Math.cos(t));
    close(Math.cos(2 * t), Math.cos(t) ** 2 - Math.sin(t) ** 2);
    close(Math.cos(2 * t), 2 * Math.cos(t) ** 2 - 1);
    close(Math.cos(2 * t), 1 - 2 * Math.sin(t) ** 2);
    close(Math.tan(2 * t), (2 * Math.tan(t)) / (1 - Math.tan(t) ** 2));
  }
});

test("sum/difference cards keep the sine sign and reverse the cosine/tangent denominator sign", () => {
  assert(formula("sin-sum-difference").includes(String.raw`\pm\cos u\sin v`));
  assert(formula("cos-sum-difference").includes(String.raw`\mp\sin u\sin v`));
  assert(formula("tan-sum-difference").includes(String.raw`1\mp\tan u\tan v`));
  for (const u of [-1.1, 0.2, 1.3])
    for (const v of [-0.3, 0.6])
      for (const sign of [-1, 1]) {
        close(
          Math.sin(u + sign * v),
          Math.sin(u) * Math.cos(v) + sign * Math.cos(u) * Math.sin(v),
        );
        close(
          Math.cos(u + sign * v),
          Math.cos(u) * Math.cos(v) - sign * Math.sin(u) * Math.sin(v),
        );
        close(
          Math.tan(u + sign * v),
          (Math.tan(u) + sign * Math.tan(v)) /
            (1 - sign * Math.tan(u) * Math.tan(v)),
        );
      }
});

test("half-angle and power-reduction cards retain sign and denominator conditions", () => {
  assert(
    formula("sin-half").includes(String.raw`\pm\sqrt{\frac{1-\cos\theta}{2}}`),
  );
  assert(
    formula("cos-half").includes(String.raw`\pm\sqrt{\frac{1+\cos\theta}{2}}`),
  );
  assert(
    cards.find((card) => card.id === "tan-half")!.note.includes("nonzero"),
  );
  for (const t of [-5.1, -1, 0.7, 2.6, 4.1, 7.2]) {
    close(Math.abs(Math.sin(t / 2)), Math.sqrt((1 - Math.cos(t)) / 2));
    close(Math.abs(Math.cos(t / 2)), Math.sqrt((1 + Math.cos(t)) / 2));
    close(Math.tan(t / 2), Math.sin(t) / (1 + Math.cos(t)));
    close(Math.tan(t / 2), (1 - Math.cos(t)) / Math.sin(t));
    close(Math.sin(t) ** 2, (1 - Math.cos(2 * t)) / 2);
    close(Math.cos(t) ** 2, (1 + Math.cos(2 * t)) / 2);
  }
});

test("geometry and triangle-law cards include the missing families with correct dimensions", () => {
  const required = [
    "law-sines",
    "law-cosines",
    "triangle-sine-area",
    "equilateral-area",
    "heron",
    "polygon-angles",
    "similarity-ratios",
    "regular-polygon-area",
    "box-surface",
    "cylinder-surface",
    "cone-volume",
    "cone-surface",
    "pyramid-volume",
    "sphere-volume",
    "sphere-surface",
    "radian-circle",
    "inscribed-angle",
    "chord-products",
    "tangent-secant",
  ];
  required.forEach(formula);
  assert.equal(formula("law-cosines"), String.raw`c^2=a^2+b^2-2ab\cos C`);
  assert.equal(formula("sphere-volume"), String.raw`V=\frac43\pi r^3`);
  assert.equal(formula("sphere-surface"), String.raw`SA=4\pi r^2`);
  assert.equal(formula("cone-volume"), String.raw`V=\frac13\pi r^2h`);
  const C = Math.PI / 3,
    a = 6,
    b = 10,
    c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(C));
  close(c, Math.sqrt(76));
  close((a * b * Math.sin(C)) / 2, 15 * Math.sqrt(3));
  const s = (5 + 5 + 6) / 2;
  close(Math.sqrt(s * (s - 5) * (s - 5) * (s - 6)), 12);
  close((Math.PI * 3 ** 2 * 4) / 3, 12 * Math.PI);
  close(Math.PI * 3 ** 2 + Math.PI * 3 * Math.hypot(3, 4), 24 * Math.PI);
});
