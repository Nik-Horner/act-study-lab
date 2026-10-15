import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMathText } from "../src/lib/math-text";
import katex from "katex";
import { readFileSync } from "node:fs";
import skills from "../src/content/math-skill-lessons.json";
import skillQuestions from "../src/content/math-skill-questions.json";

test("authored equations render accessible fractions, radicals and powers", () => {
  const html = renderMathText(
    String.raw`Use \(x = \frac{\sqrt{b^2-4ac}}{2a}\).`,
  );
  assert.match(html, /class="katex"/);
  assert.match(html, /<math /);
  assert.match(html, /<mfrac>/);
  assert.match(html, /<msqrt>/);
  assert.match(html, /<msup>/);
  assert.match(html, /^Use /);
  assert.match(html, /\.$/);
});

test("currency, ordinary prose, underlines and unmatched delimiters remain text", () => {
  assert.equal(
    renderMathText("Pay $5 for [[two]] items; then $10."),
    'Pay $5 for <span class="ul">two</span> items; then $10.',
  );
  assert.equal(
    renderMathText(String.raw`Use \(x + 2 tomorrow.`),
    String.raw`Use \(x + 2 tomorrow.`,
  );
  assert.equal(
    renderMathText("The x-intercept is 2."),
    "The x-intercept is 2.",
  );
});

test("untrusted markup and TeX links cannot inject HTML or scripts", () => {
  const html = renderMathText(
    String.raw`<img src=x onerror=alert(1)> \(\href{javascript:alert(1)}{x}\)`,
  );
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|<a\b|<script/);
  assert.doesNotThrow(() => renderMathText(String.raw`\(\frac{1}{\)`));
});

test("display equations have display layout without changing surrounding prose", () => {
  assert.match(
    renderMathText(String.raw`Then \[A=\pi r^2\] continue.`),
    /katex-display/,
  );
});

test("all authored math in the curriculum parses without errors", () => {
  let expressions = 0;
  function inspect(value: unknown, path: string) {
    if (typeof value === "string") {
      const matches = [
        ...value.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g),
      ];
      const remainder = value.replace(
        /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g,
        "",
      );
      assert.doesNotMatch(
        remainder,
        /\\[()[\]]/,
        `${path}: unmatched math delimiter`,
      );
      if (
        !/\.(?:title|heading)$/.test(path) &&
        (!path.startsWith("lesson-activities.") ||
          path.startsWith("lesson-activities.math-"))
      )
        assert.doesNotMatch(
          remainder,
          /[√∛^_²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ₙ]/,
          `${path}: unformatted formula`,
        );
      for (const match of matches) {
        assert.doesNotThrow(
          () =>
            katex.renderToString(match[1] ?? match[2], {
              throwOnError: true,
              strict: "error",
              trust: false,
            }),
          `${path}: ${match[0]}`,
        );
        expressions++;
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => inspect(item, `${path}[${i}]`));
    } else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value))
        inspect(item, `${path}.${key}`);
    }
  }
  for (const file of [
    "math-lessons",
    "math-extra-lessons",
    "lesson-activities",
    "math-questions",
    "math-extra-questions",
    "math-exams",
    "math-reference",
    "math-method-questions",
    "math-skill-lessons",
    "math-skill-questions",
  ]) {
    inspect(
      JSON.parse(
        readFileSync(
          new URL(`../src/content/${file}.json`, import.meta.url),
          "utf8",
        ),
      ),
      file,
    );
  }
  assert(
    expressions >= 3000,
    "Math lessons need authored equations, not just a renderer",
  );
});

test("focused Math teaching and practice cannot leave raw equation notation in prose", () => {
  function inspect(value: unknown, path: string) {
    if (typeof value === "string") {
      const prose = value.replace(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g, "");
      assert.doesNotMatch(
        prose,
        /[=√∛^≤≥≠π²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ₙθσμ±]|\d\s*\/\s*\d/,
        `${path}: author equations with TeX delimiters`,
      );
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => inspect(item, `${path}[${i}]`));
    } else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value))
        if (!["diagram", "graph", "table", "title", "heading"].includes(key))
          inspect(item, `${path}.${key}`);
    }
  }
  inspect(skills, "skills");
  inspect(skillQuestions, "skillQuestions");
});

test("the Heron lesson renders the formula, worked radicals, and practice explanation", () => {
  const section = skills.find(
    (skill) => skill.id === "math-geometry-heron-area",
  )!.section;
  const formula = renderMathText(section.body.join(" "));
  assert.match(formula, /<mfrac>/);
  assert.match(formula, /<msqrt>/);
  const example = renderMathText(section.examples[0].text);
  assert.equal((example.match(/<msqrt>/g) ?? []).length, 3);
  assert.match(example, /<msup>/);
  assert.match(renderMathText(section.activity.explanation), /<msqrt>/);
});

test("function arguments remain inside fraction denominators", () => {
  const identity = skills.find(
    (skill) => skill.id === "math-trigonometry-identity-rewrites",
  )!;
  assert(identity);
  const html = renderMathText(identity.section.activity.prompt);
  assert.match(html, /<mfrac>[\s\S]*<msup>[\s\S]*<mi>θ<\/mi>/);
  assert.doesNotMatch(
    identity.section.activity.prompt,
    /\{\\sin\s*\^\{2\}\}\s*\\theta/,
  );
});
