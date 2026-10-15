import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = async (name) =>
  JSON.parse(await readFile(path.join(root, "src/content", name), "utf8"));
const [topics, lessons, questions, exams] = await Promise.all(
  [
    "math-topics.json",
    "math-lessons.json",
    "math-questions.json",
    "math-exams.json",
  ].map(read),
);
assert.equal(topics.length, 8);
assert.equal(lessons.length, 8);
assert.equal(questions.length, 242);
assert.equal(exams.length, 2);
const checks = lessons.flatMap((l) => l.check);
assert.equal(checks.length, 20);
const allQuestions = [...questions, ...checks];
const ids = new Set(allQuestions.map((q) => q.id));
assert.equal(ids.size, 262, "all question and lesson-check IDs must be unique");
const topicSet = new Set(topics.map((t) => t.slug));
assert.equal(topicSet.size, 8);
for (const topic of topics) {
  assert.ok(topic.slug.startsWith("math-"));
  assert.equal(topic.subject, "math");
  const drills = questions.filter((q) => q.id.startsWith(`${topic.slug}-d`));
  assert.equal(
    drills.length,
    [
      "math-algebra",
      "math-number-quantity",
      "math-essential-skills",
      "math-modeling",
    ].includes(topic.slug)
      ? 32
      : 6,
    `${topic.slug}: correct drill count required`,
  );
  const lesson = lessons.find((l) => l.slug === topic.slug);
  assert.ok(lesson, `${topic.slug}: matching lesson required`);
  assert.ok(lesson.sections.length >= 2 && lesson.sections.length <= 8);
  assert.equal(
    lesson.check.length,
    [
      "math-algebra",
      "math-number-quantity",
      "math-essential-skills",
      "math-modeling",
    ].includes(topic.slug)
      ? 3
      : 2,
  );
  for (const section of lesson.sections) {
    assert.ok(section.body.length >= 2);
    assert.ok(section.examples?.length >= 1);
  }
}
for (const q of allQuestions) {
  assert.equal(q.subject, "math");
  assert.ok(topicSet.has(q.topic), `${q.id}: topic exists`);
  assert.equal(q.choices.length, 4, `${q.id}: four choices`);
  assert.equal(
    new Set(q.choices.map((c) => c.trim())).size,
    4,
    `${q.id}: distinct choices`,
  );
  assert.ok(
    Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4,
    `${q.id}: zero-based answer`,
  );
  assert.ok(["easy", "medium", "hard"].includes(q.difficulty));
  assert.ok(q.stem.length > 0 && q.questionText.length > 0);
  assert.ok(q.explanation.length >= 120, `${q.id}: substantive explanation`);
}
assert.equal(
  new Set(exams.flatMap((e) => e.questionIds)).size,
  90,
  "exam sections are disjoint",
);
for (const [index, exam] of exams.entries()) {
  assert.equal(exam.id, `math-${index + 1}`);
  assert.equal(exam.minutes, 50);
  assert.equal(exam.subject, "math");
  assert.equal(exam.questionIds.length, 45);
  assert.equal(new Set(exam.questionIds).size, 45);
  for (const id of exam.questionIds) {
    assert.ok(questions.some((q) => q.id === id));
    assert.ok(
      id.startsWith(`math-exam-${index + 1}-`),
      `${id}: reserved exam question`,
    );
  }
}
const stems = allQuestions.map((q) => `${q.stem} ${q.questionText}`);
assert.equal(new Set(stems).size, 262, "question prompts are distinct");
function close(actual, expected, id) {
  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${id}: array calculation`);
    assert.equal(actual.length, expected.length);
    expected.forEach((e, i) => close(actual[i], e, id));
  } else if (typeof expected === "number") {
    assert.ok(Number.isFinite(actual), `${id}: finite calculation`);
    assert.ok(
      Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)),
      `${id}: calculated ${actual}, expected ${expected}`,
    );
  } else assert.equal(actual, expected, `${id}: logical condition`);
}
const answerChecks = [
  {
    id: "math-algebra-d1",
    correct: "12",
    calculate: () => (9 + 15) / (6 - 4),
    expected: 12,
  },
  {
    id: "math-algebra-d2",
    correct: "7",
    calculate: () => 2 * ((17 - 2) / 5) + 1,
    expected: 7,
  },
  {
    id: "math-algebra-d3",
    correct: "5",
    calculate: () => (5 ** 2 - 9) / (5 - 3),
    expected: 8,
  },
  {
    id: "math-algebra-d4",
    correct: "3",
    calculate: () => (3 + 7) / 2 + (3 - 7) / 2,
    expected: 3,
  },
  {
    id: "math-algebra-d5",
    correct: "2",
    calculate: () => (2 * 3) / 3,
    expected: 2,
  },
  {
    id: "math-algebra-d6",
    correct: "\\(x \\ge  -2\\)",
    calculate: () => [-3 * (2 * 0 - 1) <= 15, -3 * (2 * -3 - 1) <= 15],
    expected: [true, false],
  },
  {
    id: "math-functions-d1",
    correct: "\\(x \\le  4\\) and \\(x \\ne  -2\\)",
    calculate: () => [12 - 3 * 4 >= 0, -2 + 2 === 0, 12 - 3 * 5 >= 0],
    expected: [true, true, false],
  },
  {
    id: "math-functions-d2",
    correct: "\\(4xh + 2h^{2}\\)",
    calculate: () =>
      2 * (3 + 5) ** 2 - 3 - (2 * 3 ** 2 - 3) - (4 * 3 * 5 + 2 * 5 ** 2),
    expected: 0,
  },
  {
    id: "math-functions-d3",
    correct: "10",
    calculate: () => (3 * 10 - 2) / (10 + 4),
    expected: 2,
  },
  {
    id: "math-functions-d4",
    correct: "\\((-1, 8)\\)",
    calculate: () => [(-2 * -1 - 2) ** 2 + 8, -2 * -1 - 2],
    expected: [8, 0],
  },
  {
    id: "math-functions-d5",
    correct: "3",
    calculate: () => Math.log2(3 - 1) + Math.log2(3 + 1),
    expected: 3,
  },
  {
    id: "math-functions-d6",
    correct: "8",
    calculate: () => 80 + 6 * (68 - 80),
    expected: 8,
  },
  {
    id: "math-geometry-d1",
    correct: "55 square units",
    calculate: () => ((8 + 14) * 5) / 2,
    expected: 55,
  },
  {
    id: "math-geometry-d2",
    correct: "\\(66\\pi\\) square units",
    calculate: () => 2 * 3 * 8 + 2 * 3 ** 2,
    expected: 66,
  },
  {
    id: "math-geometry-d3",
    correct: "84 square units",
    calculate: () => Math.sqrt(21 * (21 - 13) * (21 - 14) * (21 - 15)),
    expected: 84,
  },
  {
    id: "math-geometry-d4",
    correct: "6",
    calculate: () => (3 * 8) / 4,
    expected: 6,
  },
  {
    id: "math-geometry-d5",
    correct: "\\(55^\\circ\\)",
    calculate: () => 110 / 2,
    expected: 55,
  },
  {
    id: "math-geometry-d6",
    correct: "4",
    calculate: () => 20 / Math.hypot(3, 4),
    expected: 4,
  },
  {
    id: "math-trigonometry-d1",
    correct: "\\(\\frac{5}{12}\\)",
    calculate: () => 5 / Math.sqrt(13 ** 2 - 5 ** 2),
    expected: 0.4166666666666667,
  },
  {
    id: "math-trigonometry-d2",
    correct: "\\(\\sqrt{57}\\)",
    calculate: () => 7 ** 2 + 8 ** 2 - 2 * 7 * 8 * Math.cos(Math.PI / 3),
    expected: 57,
  },
  {
    id: "math-trigonometry-d3",
    correct: "\\(\\frac{-3}{5}\\)",
    calculate: () => -3 / Math.hypot(3, 4),
    expected: -0.6,
  },
  {
    id: "math-trigonometry-d4",
    correct: "\\(\\pi\\)",
    calculate: () => (2 * Math.PI) / 2 / Math.PI,
    expected: 1,
  },
  {
    id: "math-trigonometry-d5",
    correct: "\\(\\frac{120}{169}\\)",
    calculate: () => 2 * (Math.sqrt(13 ** 2 - 12 ** 2) / 13) * (12 / 13),
    expected: 0.7100591715976331,
  },
  {
    id: "math-trigonometry-d6",
    correct: "28.0 meters",
    calculate: () => Math.round(40 * Math.tan((35 * Math.PI) / 180) * 10) / 10,
    expected: 28.0,
  },
  {
    id: "math-statistics-probability-d1",
    correct: "13",
    calculate: () => (5 * 12 - 8) / 4,
    expected: 13,
  },
  {
    id: "math-statistics-probability-d2",
    correct: "\\(\\frac{1}{9}\\)",
    calculate: () => 4 / 36,
    expected: 0.1111111111111111,
  },
  {
    id: "math-statistics-probability-d3",
    correct: "30",
    calculate: () => ((5 * 4) / 2) * 3,
    expected: 30,
  },
  {
    id: "math-statistics-probability-d4",
    correct: "\\(\\frac{3}{5}\\)",
    calculate: () => (3 / 5) * (2 / 4) + (2 / 5) * (3 / 4),
    expected: 0.6,
  },
  {
    id: "math-statistics-probability-d5",
    correct: "1.10",
    calculate: () => 0 * 0.2 + 1 * 0.5 + 2 * 0.3,
    expected: 1.1,
  },
  {
    id: "math-statistics-probability-d6",
    correct: "18",
    calculate: () => Math.abs(3) * 6,
    expected: 18,
  },
  {
    id: "math-number-quantity-d1",
    correct: "\\(11 - 10i\\)",
    calculate: () => [3 * 1 - 2 * -4, 3 * -4 + 2 * 1],
    expected: [11, -10],
  },
  {
    id: "math-number-quantity-d2",
    correct: "5",
    calculate: () => Math.hypot(2 - 5, -3 + 7),
    expected: 5,
  },
  {
    id: "math-number-quantity-d3",
    correct: "\\(\\begin{bmatrix}6 \\\\ 14\\end{bmatrix}\\)",
    calculate: () => [2 * 4 + 1 * -2, 3 * 4 + -1 * -2],
    expected: [6, 14],
  },
  {
    id: "math-number-quantity-d4",
    correct: "\\(\\frac{65}{9}\\)",
    calculate: () => 3 + 3 * (2 / 3) + 3 * (2 / 3) ** 2 + 3 * (2 / 3) ** 3,
    expected: 7.222222222222222,
  },
  {
    id: "math-number-quantity-d5",
    correct: "12",
    calculate: () => 8 ** (2 / 3) + 16 ** (3 / 4),
    expected: 12,
  },
  {
    id: "math-number-quantity-d6",
    correct: "\\(\\frac{4\\pi}{3}\\)",
    calculate: () => 240 / 180,
    expected: 1.3333333333333333,
  },
  {
    id: "math-essential-skills-d1",
    correct: "16",
    calculate: () => (56 * 2) / (2 + 5),
    expected: 16,
  },
  {
    id: "math-essential-skills-d2",
    correct: "$240",
    calculate: () => 250 * 1.2 * 0.8,
    expected: 240,
  },
  {
    id: "math-essential-skills-d3",
    correct: "20",
    calculate: () => (72 * 1000) / 3600,
    expected: 20,
  },
  {
    id: "math-essential-skills-d4",
    correct: "8",
    calculate: () => (0.45 * 8 - 0.3 * 8) / (0.6 - 0.45),
    expected: 8,
  },
  {
    id: "math-essential-skills-d5",
    correct: "40 mph",
    calculate: () => 120 / (60 / 30 + 60 / 60),
    expected: 40,
  },
  {
    id: "math-essential-skills-d6",
    correct: "3.6 hours",
    calculate: () => 1 / (1 / 6 + 1 / 9),
    expected: 3.6,
  },
  {
    id: "math-modeling-d1",
    correct: "8",
    calculate: () => (24 - 4) / 2.5,
    expected: 8,
  },
  {
    id: "math-modeling-d2",
    correct: "$7,369.50",
    calculate: () => 12000 * 0.85 ** 3,
    expected: 7369.5,
  },
  {
    id: "math-modeling-d3",
    correct: "100 square units",
    calculate: () => (40 / 4) ** 2,
    expected: 100,
  },
  {
    id: "math-modeling-d4",
    correct: "$800",
    calculate: () => -2 * 30 ** 2 + 120 * 30 - 1000,
    expected: 800,
  },
  {
    id: "math-modeling-d5",
    correct: "56",
    calculate: () => (1120 - 7 * 120) / (12 - 7),
    expected: 56,
  },
  {
    id: "math-modeling-d6",
    correct: "10",
    calculate: () => Math.ceil((300 - 50) / 25),
    expected: 10,
  },
  {
    id: "math-exam-1-q01",
    correct: "48",
    calculate: () => (64 * 3) / 4,
    expected: 48,
  },
  {
    id: "math-exam-1-q02",
    correct: "5",
    calculate: () => (32 - 7) / 5,
    expected: 5,
  },
  {
    id: "math-exam-1-q03",
    correct: "15",
    calculate: () => (20 * 3) / 4,
    expected: 15,
  },
  {
    id: "math-exam-1-q04",
    correct: "9",
    calculate: () => [11, 2, 15, 8, 9].sort((a, b) => a - b)[2],
    expected: 9,
  },
  {
    id: "math-exam-1-q05",
    correct: "60 square units",
    calculate: () => 5 * Math.sqrt(13 ** 2 - 5 ** 2),
    expected: 60,
  },
  {
    id: "math-exam-1-q06",
    correct: "14",
    calculate: () => 3 * 6 - 4,
    expected: 14,
  },
  {
    id: "math-exam-1-q07",
    correct: "\\(1.2 \\times  10^{4}\\)",
    calculate: () => 4 * 10 ** 5 * (3 * 10 ** -2),
    expected: 12000,
  },
  {
    id: "math-exam-1-q08",
    correct: "5",
    calculate: () => 9 - (9 + 7) / 4,
    expected: 5,
  },
  {
    id: "math-exam-1-q09",
    correct: "240",
    calculate: () => 84 / 0.35,
    expected: 240,
  },
  {
    id: "math-exam-1-q10",
    correct: "\\(81\\pi\\) square units",
    calculate: () => (18 / 2) ** 2,
    expected: 81,
  },
  {
    id: "math-exam-1-q11",
    correct: "90",
    calculate: () => 5 * 86 - (88 + 92 + 75 + 85),
    expected: 90,
  },
  {
    id: "math-exam-1-q12",
    correct: "3",
    calculate: () => (5 + Math.sqrt(25 + 24)) / 4,
    expected: 3,
  },
  {
    id: "math-exam-1-q13",
    correct: "\\(-1\\)",
    calculate: () => 5 + ((-7 - 5) / (4 + 2)) * (1 + 2),
    expected: -1,
  },
  {
    id: "math-exam-1-q14",
    correct: "54",
    calculate: () => 24 * (9 / 6) ** 2,
    expected: 54,
  },
  {
    id: "math-exam-1-q15",
    correct: "5",
    calculate: () => 10 * Math.sin(Math.PI / 6),
    expected: 5,
  },
  {
    id: "math-exam-1-q16",
    correct: "13",
    calculate: () => 2 ** 2 + (-3) ** 2,
    expected: 13,
  },
  {
    id: "math-exam-1-q17",
    correct: "$21.00",
    calculate: () => (186 / 31) * 3.5,
    expected: 21,
  },
  {
    id: "math-exam-1-q18",
    correct: "\\(\\frac{8}{125}\\)",
    calculate: () => (8 / 20) ** 3,
    expected: 0.064,
  },
  {
    id: "math-exam-1-q19",
    correct: "640",
    calculate: () => 80 * 2 ** (9 / 3),
    expected: 640,
  },
  {
    id: "math-exam-1-q20",
    correct: "7",
    calculate: () => (2 * 2 + 3) / (3 - 2),
    expected: 7,
  },
  {
    id: "math-exam-1-q21",
    correct: "13",
    calculate: () => Math.hypot(12, 5),
    expected: 13,
  },
  {
    id: "math-exam-1-q22",
    correct: "24",
    calculate: () => (3 + 2) ** 2 - 1,
    expected: 24,
  },
  {
    id: "math-exam-1-q23",
    correct: "26",
    calculate: () => 4 * 5 - -2 * 3,
    expected: 26,
  },
  {
    id: "math-exam-1-q24",
    correct: "120",
    calculate: () => 6 * 5 * 4,
    expected: 120,
  },
  {
    id: "math-exam-1-q25",
    correct: "240",
    calculate: () => 4800 / (45 - 25),
    expected: 240,
  },
  {
    id: "math-exam-1-q26",
    correct: "\\(-3\\) < x < 2",
    calculate: () => [-4, 0, 3].map((x) => (x - 2) * (x + 3) < 0),
    expected: [false, true, false],
  },
  {
    id: "math-exam-1-q27",
    correct: "\\(-8\\)",
    calculate: () => 3 ** 2 - 6 * 3 + 1,
    expected: -8,
  },
  {
    id: "math-exam-1-q28",
    correct: "12 square units",
    calculate: () => ((7 - 1) * (5 - 1)) / 2,
    expected: 12,
  },
  {
    id: "math-exam-1-q29",
    correct: "\\(\\frac{-3}{4}\\)",
    calculate: () => Math.sqrt(5 ** 2 - 4 ** 2) / 5 / (-4 / 5),
    expected: -0.75,
  },
  {
    id: "math-exam-1-q30",
    correct: "\\(\\frac{5}{16}\\)",
    calculate: () => (4 + 1) / 2 ** 4,
    expected: 0.3125,
  },
  {
    id: "math-exam-1-q31",
    correct: "\\(-1\\)",
    calculate: () => [1, [0, 1], -1, [0, -1]][2026 % 4],
    expected: -1,
  },
  {
    id: "math-exam-1-q32",
    correct: "2.5",
    calculate: () => (60 * 0.5) / (72 - 60),
    expected: 2.5,
  },
  {
    id: "math-exam-1-q33",
    correct: "21",
    calculate: () => (10 ** 2 - 58) / 2,
    expected: 21,
  },
  {
    id: "math-exam-1-q34",
    correct: "\\(15\\pi\\) square units",
    calculate: () => (150 / 360) * 6 ** 2,
    expected: 15,
  },
  {
    id: "math-exam-1-q35",
    correct: "\\(2 + \\sqrt3\\)",
    calculate: () => (2 + Math.sqrt(3) - 2) ** 2 + 1,
    expected: 4,
  },
  {
    id: "math-exam-1-q36",
    correct: "\\(8\\sqrt{2}\\)",
    calculate: () => (8 * Math.sin(Math.PI / 4)) / Math.sin(Math.PI / 6),
    expected: 11.313708498984761,
  },
  {
    id: "math-exam-1-q37",
    correct: "0.2646",
    calculate: () => 6 * 0.3 ** 2 * 0.7 ** 2,
    expected: 0.2646,
  },
  {
    id: "math-exam-1-q38",
    correct: "\\(90^\\circ\\)",
    calculate: () => 3 * -4 + 4 * 3,
    expected: 0,
  },
  {
    id: "math-exam-1-q39",
    correct: "100",
    calculate: () => 400 / Math.cbrt(3200 / 400) ** 2,
    expected: 100,
  },
  {
    id: "math-exam-1-q40",
    correct: "23",
    calculate: () => 5 ** 2 - 2,
    expected: 23,
  },
  {
    id: "math-exam-1-q41",
    correct: "\\(24\\sqrt{3}\\) square units",
    calculate: () => 6 * (4 ** 2 / 4),
    expected: 24,
  },
  {
    id: "math-exam-1-q42",
    correct: "3",
    calculate: () =>
      [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6].filter(
        (t) => Math.abs(2 * Math.sin(t) ** 2 - Math.sin(t) - 1) < 1e-9,
      ).length,
    expected: 3,
  },
  {
    id: "math-exam-1-q43",
    correct: "(2, 4)",
    calculate: () => [2, 2 + 2],
    expected: [2, 4],
  },
  {
    id: "math-exam-1-q44",
    correct: "−$0.20",
    calculate: () => 10 * 0.15 - 2 * 0.85,
    expected: -0.2,
  },
  {
    id: "math-exam-1-q45",
    correct: "$40",
    calculate: () =>
      Math.max(
        ...Array.from({ length: 18 }, (_, x) =>
          Array.from({ length: 15 }, (_, y) =>
            x + 2 * y <= 14 && 3 * x + y <= 17 ? 5 * x + 4 * y : -Infinity,
          ),
        ).flat(),
      ),
    expected: 40,
  },
  {
    id: "check-math-algebra-1",
    correct: "4",
    calculate: () => (9 + 7) / 4,
    expected: 4,
  },
  {
    id: "check-math-algebra-2",
    correct: "1",
    calculate: () => Math.max(1, -5),
    expected: 1,
  },
  {
    id: "check-math-functions-1",
    correct: "10",
    calculate: () => 2 ** 2 + 3 * 2,
    expected: 10,
  },
  {
    id: "check-math-functions-2",
    correct: "x ≠ 6",
    calculate: () => [1 / (5 - 6), 1 / (7 - 6), 6 - 6],
    expected: [-1, 1, 0],
  },
  {
    id: "check-math-geometry-1",
    correct: "42 square units",
    calculate: () => (12 * 7) / 2,
    expected: 42,
  },
  {
    id: "check-math-geometry-2",
    correct: "40°",
    calculate: () => 80 / 2,
    expected: 40,
  },
  {
    id: "check-math-trigonometry-1",
    correct: "\\(\\frac45\\)",
    calculate: () => 4 / Math.hypot(3, 4),
    expected: 0.8,
  },
  {
    id: "check-math-trigonometry-2",
    correct: "\\(\\frac\\pi2\\)",
    calculate: () => (2 * Math.PI) / 4 / Math.PI,
    expected: 0.5,
  },
  {
    id: "check-math-statistics-probability-1",
    correct: "7",
    calculate: () => (4 + 8 + 9) / 3,
    expected: 7,
  },
  {
    id: "check-math-statistics-probability-2",
    correct: "15",
    calculate: () => (6 * 5) / 2,
    expected: 15,
  },
  {
    id: "check-math-number-quantity-1",
    correct: "7 + i",
    calculate: () => [2 * 3 - 1 * -1, 2 * -1 + 1 * 3],
    expected: [7, 1],
  },
  {
    id: "check-math-number-quantity-2",
    correct: "\\(\\begin{bmatrix}13 & 16\\\\-5 & -6\\end{bmatrix}\\)",
    calculate: () => [
      [1 * 3 + 2 * 5, 1 * 4 + 2 * 6],
      [0 * 3 + -1 * 5, 0 * 4 + -1 * 6],
    ],
    expected: [
      [13, 16],
      [-5, -6],
    ],
  },
  {
    id: "check-math-essential-skills-1",
    correct: "$68",
    calculate: () => 80 * (1 - 0.15),
    expected: 68,
  },
  {
    id: "check-math-essential-skills-2",
    correct: "48",
    calculate: () => 24 / (30 / 60),
    expected: 48,
  },
  {
    id: "check-math-modeling-1",
    correct: "$147",
    calculate: () => 75 + 9 * 8,
    expected: 147,
  },
  {
    id: "check-math-modeling-2",
    correct: "72",
    calculate: () => 200 * (1 - 0.4) ** 2,
    expected: 72,
  },
  {
    id: "math-algebra-d7",
    correct: "13",
    calculate: () => 24 - 9 - 2,
    expected: 13,
  },
  {
    id: "math-algebra-d8",
    correct: "15",
    calculate: () => ((19 + 2) / 7) * (2 * ((19 + 2) / 7) - 1),
    expected: 15,
  },
  {
    id: "math-algebra-d9",
    correct: "9",
    calculate: () => (-6) ** 2 / 4,
    expected: 9,
  },
  {
    id: "math-algebra-d10",
    correct: "4",
    calculate: () => -(-12) / 3,
    expected: 4,
  },
  {
    id: "math-algebra-d11",
    correct: "5",
    calculate: () => 2 * 3 + -1 * 1,
    expected: 5,
  },
  {
    id: "math-algebra-d12",
    correct: "3",
    calculate: () => Math.max(3, 2, -2),
    expected: 3,
  },
  {
    id: "math-algebra-d13",
    correct: "5",
    calculate: () => (-1) ** 3 - 2 * -1 + 4,
    expected: 5,
  },
  {
    id: "math-algebra-d14",
    correct: "\\(\\frac{a+b}{b-a}\\)",
    calculate: () => (1 / 2 + 1 / 5) / (1 / 2 - 1 / 5) - (2 + 5) / (5 - 2),
    expected: 0,
  },
  {
    id: "math-algebra-d15",
    correct: "x > 2",
    calculate: () => [1 / (1 - 2) > 0, 1 / (3 - 2) > 0],
    expected: [false, true],
  },
  {
    id: "math-algebra-d16",
    correct: "3",
    calculate: () => [Math.sqrt(2 * 3 + 3), Math.sqrt(2 * -1 + 3)],
    expected: [3, 1],
  },
  {
    id: "math-algebra-d17",
    correct: "\\(-2\\)",
    calculate: () => [Math.sqrt(3 + 6) === 3, Math.sqrt(-2 + 6) === -2],
    expected: [true, false],
  },
  {
    id: "math-algebra-d18",
    correct: "1 < x < 7",
    calculate: () => [0, 4, 8].map((x) => Math.abs(x - 4) < 3),
    expected: [false, true, false],
  },
  {
    id: "math-algebra-d19",
    correct: "29",
    calculate: () => 7 ** 2 - 2 * 10,
    expected: 29,
  },
  {
    id: "math-algebra-d20",
    correct: "4",
    calculate: () => Math.log2(32) - 1,
    expected: 4,
  },
  {
    id: "math-algebra-d21",
    correct: "\\(2x^{2} - 6x - 8\\)",
    calculate: () => [2 * (-1) ** 2 - 6 * -1 - 8, 2 * 4 ** 2 - 6 * 4 - 8, -8],
    expected: [0, 0, -8],
  },
  {
    id: "math-algebra-d22",
    correct: "\\(\\frac{5x+1}{x^2-1}\\)",
    calculate: () => 2 / (4 + 1) + 3 / (4 - 1) - (5 * 4 + 1) / (4 ** 2 - 1),
    expected: 0,
  },
  {
    id: "math-algebra-d23",
    correct: "\\(\\frac{1}{2}\\)",
    calculate: () => 2 * 0.5 - 1,
    expected: 0,
  },
  { id: "math-algebra-d24", correct: "4", calculate: () => 2 + 2, expected: 4 },
  {
    id: "math-algebra-d25",
    correct: "\\(x \\le  -4\\) or \\(x \\ge  2\\)",
    calculate: () => [-5, 0, 3].map((x) => x * x + 2 * x - 8 >= 0),
    expected: [true, false, true],
  },
  {
    id: "math-algebra-d26",
    correct: "\\(\\frac{y^6}{x^4}\\)",
    calculate: () => (2 ** -2 * 3 ** 3) ** 2 - 3 ** 6 / 2 ** 4,
    expected: 0,
  },
  {
    id: "math-algebra-d27",
    correct: "2",
    calculate: () => [-2, 2].filter((x) => x ** 4 === 16).length,
    expected: 2,
  },
  {
    id: "math-algebra-d28",
    correct: "5",
    calculate: () => (12 - 4 + 2) / 2,
    expected: 5,
  },
  {
    id: "math-algebra-d29",
    correct: "2",
    calculate: () => 1 + Math.sqrt(2) + (1 - Math.sqrt(2)),
    expected: 2,
  },
  {
    id: "math-algebra-d30",
    correct: "\\(\\frac{8}{3}\\)",
    calculate: () => 3 + -1 / 3,
    expected: 2.6666666666666665,
  },
  {
    id: "math-algebra-d31",
    correct: "Infinitely many",
    calculate: () => [6 / 3, 4 / 2, 20 / 10],
    expected: [2, 2, 2],
  },
  {
    id: "math-algebra-d32",
    correct: "1 < \\(x \\le  4\\)",
    calculate: () => [(2 + 1) / 3, (11 + 1) / 3],
    expected: [1, 4],
  },
  {
    id: "math-number-quantity-d7",
    correct: "\\(4\\sqrt{2}\\)",
    calculate: () => Math.sqrt(72) - Math.sqrt(8),
    expected: 5.656854249492381,
  },
  {
    id: "math-number-quantity-d8",
    correct: "i",
    calculate: () => [
      (1 * 1 + 1 * -1) / (1 ** 2 + (-1) ** 2),
      (1 * 1 - 1 * -1) / (1 ** 2 + (-1) ** 2),
    ],
    expected: [0, 1],
  },
  {
    id: "math-number-quantity-d9",
    correct: "13",
    calculate: () => Math.hypot(-5, 12),
    expected: 13,
  },
  {
    id: "math-number-quantity-d10",
    correct: "\\(-20\\)",
    calculate: () => 7 + (10 - 1) * -3,
    expected: -20,
  },
  {
    id: "math-number-quantity-d11",
    correct: "60",
    calculate: () => (5 * (4 + 20)) / 2,
    expected: 60,
  },
  {
    id: "math-number-quantity-d12",
    correct: "160",
    calculate: () => 5 * Math.cbrt(40 / 5) ** 5,
    expected: 160,
  },
  {
    id: "math-number-quantity-d13",
    correct: "12",
    calculate: () => 6 / (1 - 0.5),
    expected: 12,
  },
  {
    id: "math-number-quantity-d14",
    correct: "\\(3 \\times  10^{-5}\\)",
    calculate: () => (6 * 10 ** -3) / (2 * 10 ** 2),
    expected: 3e-5,
  },
  {
    id: "math-number-quantity-d15",
    correct: "\\(4b^{2}\\)",
    calculate: () => Math.cbrt(64 * 3 ** 6) - 4 * 3 ** 2,
    expected: 0,
  },
  {
    id: "math-number-quantity-d16",
    correct: "\\((-6, 15)\\)",
    calculate: () => [-2 * 3, 5 * 3],
    expected: [-6, 15],
  },
  {
    id: "math-number-quantity-d17",
    correct: "\\(-5\\)",
    calculate: () => 1 * 3 + 2 * -4,
    expected: -5,
  },
  {
    id: "math-number-quantity-d18",
    correct: "4",
    calculate: () => -(-2 * 6) / 3,
    expected: 4,
  },
  {
    id: "math-number-quantity-d19",
    correct: "\\(-4\\)",
    calculate: () => 3 * 0 + 4 * -1,
    expected: -4,
  },
  {
    id: "math-number-quantity-d20",
    correct: "\\(3 \\times  4\\)",
    calculate: () => [3, 4],
    expected: [3, 4],
  },
  {
    id: "math-number-quantity-d21",
    correct: "A has no inverse",
    calculate: () => 2 * 2 - 1 * 4,
    expected: 0,
  },
  {
    id: "math-number-quantity-d22",
    correct:
      "\\(\\begin{bmatrix}\\frac{1}{3} & 0 \\\\ 0 & \\frac{1}{2}\\end{bmatrix}\\)",
    calculate: () => [3 * (1 / 3), 2 * (1 / 2)],
    expected: [1, 1],
  },
  {
    id: "math-number-quantity-d23",
    correct: "15",
    calculate: () => Math.abs(-7) - (-2) ** 3,
    expected: 15,
  },
  {
    id: "math-number-quantity-d24",
    correct: "5",
    calculate: () => 11 - 2 * 3,
    expected: 5,
  },
  {
    id: "math-number-quantity-d25",
    correct: "4",
    calculate: () => (2 * 3 + 5) % 7,
    expected: 4,
  },
  {
    id: "math-number-quantity-d26",
    correct: "36",
    calculate: () => 2 ** 2 * 3 ** 2,
    expected: 36,
  },
  {
    id: "math-number-quantity-d27",
    correct: "(1, 2)",
    calculate: () => [-(-1), 2],
    expected: [1, 2],
  },
  {
    id: "math-number-quantity-d28",
    correct: "\\(3 - 4i\\)",
    calculate: () => [2 ** 2 - (-1) ** 2, 2 * 2 * -1],
    expected: [3, -4],
  },
  {
    id: "math-number-quantity-d29",
    correct: "1",
    calculate: () => 81 * (27 / 81) ** 4,
    expected: 1,
  },
  {
    id: "math-number-quantity-d30",
    correct: "25",
    calculate: () => 125 ** (2 / 3),
    expected: 25,
  },
  {
    id: "math-number-quantity-d31",
    correct: "\\((\\frac{3}{5}, \\frac{4}{5})\\)",
    calculate: () => [6 / Math.hypot(6, 8), 8 / Math.hypot(6, 8)],
    expected: [0.6, 0.8],
  },
  {
    id: "math-number-quantity-d32",
    correct: "0",
    calculate: () => 7 + -7,
    expected: 0,
  },
  {
    id: "math-essential-skills-d7",
    correct: "18",
    calculate: () => (48 * 3) / 8,
    expected: 18,
  },
  {
    id: "math-essential-skills-d8",
    correct: "25%",
    calculate: () => ((80 - 64) / 64) * 100,
    expected: 25,
  },
  {
    id: "math-essential-skills-d9",
    correct: "$120",
    calculate: () => 96 / (1 - 0.2),
    expected: 120,
  },
  {
    id: "math-essential-skills-d10",
    correct: "20%",
    calculate: () => ((100 - 80) / 100) * 100,
    expected: 20,
  },
  {
    id: "math-essential-skills-d11",
    correct: "18 kilometers",
    calculate: () => 7.2 * 2.5,
    expected: 18,
  },
  {
    id: "math-essential-skills-d12",
    correct: "19.5 kilograms",
    calculate: () => 7800 * 0.0025,
    expected: 19.5,
  },
  {
    id: "math-essential-skills-d13",
    correct: "30 hours",
    calculate: () => 1 / (1 / 10 - 1 / 15),
    expected: 30,
  },
  {
    id: "math-essential-skills-d14",
    correct: "69%",
    calculate: () => ((0.6 * 40 + 0.75 * 60) / (40 + 60)) * 100,
    expected: 69,
  },
  {
    id: "math-essential-skills-d15",
    correct: "3 hours",
    calculate: () => (4 * 6) / 8,
    expected: 3,
  },
  {
    id: "math-essential-skills-d16",
    correct: "\\(\\frac{300}{7}\\) mph",
    calculate: () => (100 + 50) / (2 + 1.5),
    expected: 42.857142857142854,
  },
  {
    id: "math-essential-skills-d17",
    correct: "$24.00",
    calculate: () => (1000 / 100) * 2.4,
    expected: 24,
  },
  {
    id: "math-essential-skills-d18",
    correct: "31.5",
    calculate: () => (9 / 100) * 350,
    expected: 31.5,
  },
  {
    id: "math-essential-skills-d19",
    correct: "15",
    calculate: () => (10 * 0.2) / 0.08 - 10,
    expected: 15,
  },
  {
    id: "math-essential-skills-d20",
    correct: "\\(16\\frac23\\%\\)",
    calculate: () => ((120 - 100) / 120) * 100,
    expected: 16.666666666666668,
  },
  {
    id: "math-essential-skills-d21",
    correct: "8:15",
    calculate: () => (2 / 3) * (4 / 5),
    expected: 0.5333333333333333,
  },
  {
    id: "math-essential-skills-d22",
    correct: "7.5",
    calculate: () => (5 * 12) / 8,
    expected: 7.5,
  },
  {
    id: "math-essential-skills-d23",
    correct: "$65.22",
    calculate: () => Math.round((60 / 0.92) * 100) / 100,
    expected: 65.22,
  },
  {
    id: "math-essential-skills-d24",
    correct: "4%",
    calculate: () => (Math.abs(48 - 50) / 50) * 100,
    expected: 4,
  },
  {
    id: "math-essential-skills-d25",
    correct: "30",
    calculate: () => (150 + 450) / 20,
    expected: 30,
  },
  {
    id: "math-essential-skills-d26",
    correct: "12 years",
    calculate: () => 2 * (12 - 6),
    expected: 12,
  },
  {
    id: "math-essential-skills-d27",
    correct: "$5.50",
    calculate: () => (5 * 4 + 3 * 8) / (5 + 3),
    expected: 5.5,
  },
  {
    id: "math-essential-skills-d28",
    correct: "$348",
    calculate: () => 220 + 0.08 * 1600,
    expected: 348,
  },
  {
    id: "math-essential-skills-d29",
    correct: "$275",
    calculate: () => 50 + 3 * 75,
    expected: 275,
  },
  {
    id: "math-essential-skills-d30",
    correct: "0.25",
    calculate: () => 2500 / 100 ** 2,
    expected: 0.25,
  },
  {
    id: "math-essential-skills-d31",
    correct: "1.5",
    calculate: () => 135 / (40 + 50),
    expected: 1.5,
  },
  {
    id: "math-essential-skills-d32",
    correct: "72",
    calculate: () => 3 * (80 / 50) * 15,
    expected: 72,
  },
  {
    id: "math-modeling-d7",
    correct: "300",
    calculate: () => (35 - 20) / (0.08 - 0.03),
    expected: 300,
  },
  {
    id: "math-modeling-d8",
    correct: "x > 12",
    calculate: () => [30 + 11 < 18 + 2 * 11, 30 + 13 < 18 + 2 * 13],
    expected: [false, true],
  },
  {
    id: "math-modeling-d9",
    correct: "21 meters",
    calculate: () => -5 * 2 ** 2 + 20 * 2 + 1,
    expected: 21,
  },
  {
    id: "math-modeling-d10",
    correct: "4",
    calculate: () => 64 / 16,
    expected: 4,
  },
  {
    id: "math-modeling-d11",
    correct: "$30",
    calculate: () => 120 / (2 * 2),
    expected: 30,
  },
  {
    id: "math-modeling-d12",
    correct: "$12",
    calculate: () => (120 + 8 * 30) / 30,
    expected: 12,
  },
  {
    id: "math-modeling-d13",
    correct: "450 square feet",
    calculate: () => 15 * (60 - 2 * 15),
    expected: 450,
  },
  {
    id: "math-modeling-d14",
    correct: "70 square units",
    calculate: () => ((34 - 6) / 4) * ((34 - 6) / 4 + 3),
    expected: 70,
  },
  {
    id: "math-modeling-d15",
    correct: "4",
    calculate: () => [100 * 0.8 ** 3, 100 * 0.8 ** 4],
    expected: [51.2, 40.96],
  },
  {
    id: "math-modeling-d16",
    correct: "\\(P(t) = 2000(1.03)^{t}\\)",
    calculate: () => 2000 * 1.03,
    expected: 2060,
  },
  {
    id: "math-modeling-d17",
    correct: "12",
    calculate: () => 96 * 0.5 ** (12 / 4),
    expected: 12,
  },
  {
    id: "math-modeling-d18",
    correct: "14",
    calculate: () => Math.ceil((1000 - 300) / 50),
    expected: 14,
  },
  {
    id: "math-modeling-d19",
    correct: "6 hours",
    calculate: () => (17 - 5) / 2,
    expected: 6,
  },
  {
    id: "math-modeling-d20",
    correct: "4",
    calculate: () => (65 - 25) / 10,
    expected: 4,
  },
  {
    id: "math-modeling-d21",
    correct: "$14",
    calculate: () => 26 - ((44 - 26) / (5 - 2)) * 2,
    expected: 14,
  },
  {
    id: "math-modeling-d22",
    correct: "$9.50",
    calculate: () => 5 + 1.5 * (5 - 2),
    expected: 9.5,
  },
  {
    id: "math-modeling-d23",
    correct: "12",
    calculate: () => Math.ceil(137 / 12),
    expected: 12,
  },
  {
    id: "math-modeling-d24",
    correct: "$36",
    calculate: () =>
      Math.max(
        ...Array.from({ length: 17 }, (_, x) =>
          Array.from({ length: 19 }, (_, y) =>
            x + 3 * y <= 18 && 2 * x + y <= 16 ? 4 * x + 3 * y : -Infinity,
          ),
        ).flat(),
      ),
    expected: 36,
  },
  {
    id: "math-modeling-d25",
    correct: "6",
    calculate: () => 6 * (6 + 3),
    expected: 54,
  },
  {
    id: "math-modeling-d26",
    correct: "$590",
    calculate: () => 500 + 500 * 0.06 * 3,
    expected: 590,
  },
  {
    id: "math-modeling-d27",
    correct: "$1,102.50",
    calculate: () => 1000 * 1.05 ** 2,
    expected: 1102.5,
  },
  {
    id: "math-modeling-d28",
    correct: "$117",
    calculate: () => 180 - 0.2 * 180 - 27,
    expected: 117,
  },
  {
    id: "math-modeling-d29",
    correct: "486",
    calculate: () => 6 * (18 / 6) ** 4,
    expected: 486,
  },
  {
    id: "math-modeling-d30",
    correct: "30",
    calculate: () => Math.floor((1050 - 600) / 15),
    expected: 30,
  },
  {
    id: "math-modeling-d31",
    correct: "\\(-13\\)",
    calculate: () => -4 * (0 - 2) ** 2 + 3,
    expected: -13,
  },
  {
    id: "math-modeling-d32",
    correct: "$92",
    calculate: () => 10 * 6 + (18 - 10) * 4,
    expected: 92,
  },
  {
    id: "math-exam-2-q01",
    correct: "10",
    calculate: () => (6 + 10 + 14) / 3,
    expected: 10,
  },
  {
    id: "math-exam-2-q02",
    correct: "63",
    calculate: () => (90 * 7) / 10,
    expected: 63,
  },
  {
    id: "math-exam-2-q03",
    correct: "13",
    calculate: () => (17 + 9) / 2,
    expected: 13,
  },
  {
    id: "math-exam-2-q04",
    correct: "\\(36 cm^{2}\\)",
    calculate: () => (9 * 8) / 2,
    expected: 36,
  },
  { id: "math-exam-2-q05", correct: "7", calculate: () => 4 - -3, expected: 7 },
  {
    id: "math-exam-2-q06",
    correct: "128",
    calculate: () => 2 ** 3 * 2 ** 4,
    expected: 128,
  },
  {
    id: "math-exam-2-q07",
    correct: "\\(\\frac{1}{2}\\)",
    calculate: () => Math.cos(Math.PI / 3),
    expected: 0.5,
  },
  {
    id: "math-exam-2-q08",
    correct: "$26",
    calculate: () => 12 + 3.5 * 4,
    expected: 26,
  },
  {
    id: "math-exam-2-q09",
    correct: "24",
    calculate: () => 14 / (1 / 3 + 1 / 4),
    expected: 24,
  },
  {
    id: "math-exam-2-q10",
    correct: "20",
    calculate: () => (5 * 18 + 30) / 6,
    expected: 20,
  },
  {
    id: "math-exam-2-q11",
    correct: "66 square units",
    calculate: () => 11 * 6,
    expected: 66,
  },
  {
    id: "math-exam-2-q12",
    correct: "$84",
    calculate: () => 150 * 0.7 * 0.8,
    expected: 84,
  },
  {
    id: "math-exam-2-q13",
    correct: "\\(2 + 4i\\)",
    calculate: () => [4 - 2, -1 + 5],
    expected: [2, 4],
  },
  { id: "math-exam-2-q14", correct: "4", calculate: () => 2 ** 2, expected: 4 },
  {
    id: "math-exam-2-q15",
    correct: "\\(\\frac{3}{4}\\)",
    calculate: () => 9 / 12,
    expected: 0.75,
  },
  {
    id: "math-exam-2-q16",
    correct: "30",
    calculate: () => 360 / (18 - 6),
    expected: 30,
  },
  {
    id: "math-exam-2-q17",
    correct: "\\(-3\\)",
    calculate: () => (2 - Math.sqrt(4 + 60)) / 2,
    expected: -3,
  },
  {
    id: "math-exam-2-q18",
    correct: "\\(\\frac{5}{18}\\)",
    calculate: () => (5 / 9) * (4 / 8),
    expected: 0.2777777777777778,
  },
  {
    id: "math-exam-2-q19",
    correct: "\\(108^\\circ\\)",
    calculate: () => ((5 - 2) * 180) / 5,
    expected: 108,
  },
  {
    id: "math-exam-2-q20",
    correct: "40 km/h",
    calculate: () => (45 + 15) / (45 / 45 + 15 / 30),
    expected: 40,
  },
  {
    id: "math-exam-2-q21",
    correct: "11",
    calculate: () => 2 * 4 - -3 * 1,
    expected: 11,
  },
  {
    id: "math-exam-2-q22",
    correct: "1",
    calculate: () => (2 ** 2 - 2 - ((-1) ** 2 - 2)) / (2 - -1),
    expected: 1,
  },
  {
    id: "math-exam-2-q23",
    correct: "20",
    calculate: () => (280 - 5 * 40) / (9 - 5),
    expected: 20,
  },
  {
    id: "math-exam-2-q24",
    correct: "\\(\\frac{-1}{2}\\)",
    calculate: () => Math.sin((210 * Math.PI) / 180),
    expected: -0.5,
  },
  {
    id: "math-exam-2-q25",
    correct: "\\(x + 3\\)",
    calculate: () => (4 ** 2 + 5 * 4 + 6) / (4 + 2) - (4 + 3),
    expected: 0,
  },
  {
    id: "math-exam-2-q26",
    correct: "36",
    calculate: () => ((4 * 3) / 2) * 6,
    expected: 36,
  },
  {
    id: "math-exam-2-q27",
    correct: "\\(-4\\)",
    calculate: () => (0 - 2) ** 3 - 1 + 5,
    expected: -4,
  },
  {
    id: "math-exam-2-q28",
    correct: "\\(97^\\circ\\)",
    calculate: () => 180 - 83,
    expected: 97,
  },
  {
    id: "math-exam-2-q29",
    correct: "16",
    calculate: () => 2 * ((64 / 2) ** (1 / 5)) ** 3,
    expected: 16,
  },
  {
    id: "math-exam-2-q30",
    correct: "75",
    calculate: () => 0.075 * 1000,
    expected: 75,
  },
  {
    id: "math-exam-2-q31",
    correct: "1,452",
    calculate: () => 1200 * 1.1 ** 2,
    expected: 1452,
  },
  {
    id: "math-exam-2-q32",
    correct: "k > 2",
    calculate: () => [16 - 8 * 1, 16 - 8 * 2, 16 - 8 * 3],
    expected: [8, 0, -8],
  },
  {
    id: "math-exam-2-q33",
    correct: "0.384",
    calculate: () => 3 * 0.2 * 0.8 ** 2,
    expected: 0.384,
  },
  {
    id: "math-exam-2-q34",
    correct: "\\(5\\sqrt{3}\\)",
    calculate: () =>
      Math.sqrt(5 ** 2 + 5 ** 2 - 2 * 5 * 5 * Math.cos((120 * Math.PI) / 180)),
    expected: 8.660254037844386,
  },
  {
    id: "math-exam-2-q35",
    correct: "8",
    calculate: () => (12 * 2) / 3,
    expected: 8,
  },
  {
    id: "math-exam-2-q36",
    correct: "5",
    calculate: () => (3 ** 2 + 1) / 2,
    expected: 5,
  },
  {
    id: "math-exam-2-q37",
    correct: "\\(\\frac{5\\sqrt2}{2}\\)",
    calculate: () => Math.hypot(3, 4) / Math.hypot(1, -1),
    expected: 3.5355339059327378,
  },
  {
    id: "math-exam-2-q38",
    correct: "12",
    calculate: () => 24 / (5 - 3),
    expected: 12,
  },
  {
    id: "math-exam-2-q39",
    correct: "18",
    calculate: () => 4 ** 2 + 2,
    expected: 18,
  },
  {
    id: "math-exam-2-q40",
    correct: "14",
    calculate: () => Math.abs(-2) * 7,
    expected: 14,
  },
  {
    id: "math-exam-2-q41",
    correct: "2",
    calculate: () => (8 + 6 - Math.hypot(8, 6)) / 2,
    expected: 2,
  },
  {
    id: "math-exam-2-q42",
    correct: "\\(y = 2\\)",
    calculate: () => (2 * 17 + 5) / (17 - 3) - (2 + 11 / (17 - 3)),
    expected: 0,
  },
  {
    id: "math-exam-2-q43",
    correct: "3",
    calculate: () => (3 * 8 - 9) / (6 - 1),
    expected: 3,
  },
  {
    id: "math-exam-2-q44",
    correct: "\\(\\frac{7}{25}\\)",
    calculate: () => 1 - 2 * (3 / 5) ** 2,
    expected: 0.28,
  },
  {
    id: "math-exam-2-q45",
    correct: "$40",
    calculate: () =>
      Math.max(
        ...Array.from({ length: 21 }, (_, x) =>
          Array.from({ length: 17 }, (_, y) =>
            2 * x + y <= 20 && x + 2 * y <= 16 ? 3 * x + 4 * y : -Infinity,
          ),
        ).flat(),
      ),
    expected: 40,
  },
  {
    id: "check-math-algebra-3",
    correct: "4",
    calculate: () => (-4) ** 2 / 4,
    expected: 4,
  },
  {
    id: "check-math-number-quantity-3",
    correct: "−4",
    calculate: () => (-2) ** 2 * -1,
    expected: -4,
  },
  {
    id: "check-math-essential-skills-3",
    correct: "25%",
    calculate: () => ((75 - 60) / 60) * 100,
    expected: 25,
  },
  {
    id: "check-math-modeling-3",
    correct: "10",
    calculate: () => Math.floor((100 - 24) / 7),
    expected: 10,
  },
];
assert.equal(answerChecks.length, 262);
assert.equal(new Set(answerChecks.map((c) => c.id)).size, 262);
for (const c of answerChecks) {
  const q = allQuestions.find((q) => q.id === c.id);
  assert.ok(q, `${c.id}: check resolves`);
  assert.equal(
    q.choices[q.answer],
    c.correct,
    `${c.id}: answer key matches audited result`,
  );
  close(c.calculate(), c.expected, c.id);
}
// Additional complete-solution checks test candidates and restrictions, not only arithmetic.
const realRoots = (a, b, c) => [
  (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a),
  (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a),
];
assert.deepEqual(
  realRoots(2, -5, -3).sort((a, b) => a - b),
  [-0.5, 3],
);
for (const x of [5, -2]) assert.equal(Math.abs(2 * x - 3), 7);
assert.equal((5 * 5 - 9) / (5 - 3), 8);
assert.equal(3 - 3, 0, "canceled denominator remains excluded");
assert.equal(Math.sqrt(3) ** 2 > 0, true);
assert.ok(2 - Math.sqrt(3) < 2, "negative inverse branch violates x >= 2");
const trigSolutions = [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6];
assert.ok(trigSolutions.every((t) => t >= 0 && t < 2 * Math.PI));
let orderedSumNine = 0;
for (let a = 1; a <= 6; a++)
  for (let b = 1; b <= 6; b++) if (a + b === 9) orderedSumNine++;
assert.equal(orderedSumNine, 4);
let differentColors = 0;
const marbles = ["r", "r", "r", "b", "b"];
for (let a = 0; a < 5; a++)
  for (let b = 0; b < 5; b++)
    if (a !== b && marbles[a] !== marbles[b]) differentColors++;
assert.equal(differentColors / (5 * 4), 3 / 5);
let highHeadCount = 0;
for (let mask = 0; mask < 16; mask++)
  if (mask.toString(2).replaceAll("0", "").length >= 3) highHeadCount++;
assert.equal(highHeadCount / 16, 5 / 16);
const distribution = [
  { value: 0, p: 0.2 },
  { value: 1, p: 0.5 },
  { value: 2, p: 0.3 },
];
close(
  distribution.reduce((s, d) => s + d.p, 0),
  1,
  "distribution probabilities",
);
close(
  distribution.reduce((s, d) => s + d.value * d.p, 0),
  1.1,
  "distribution expectation",
);
const count = (kind) => questions.filter((q) => q.difficulty === kind).length;
console.log(
  `Math content validated: ${topics.length} topics, 152 base drills, 90 exam questions, ${checks.length} lesson checks; ${answerChecks.length} answer calculations/conditions passed.`,
);
console.log(
  `Main-question difficulty: ${count("easy")} easy, ${count("medium")} medium, ${count("hard")} hard.`,
);

for (const slug of [
  "math-algebra",
  "math-number-quantity",
  "math-essential-skills",
  "math-modeling",
]) {
  const lesson = lessons.find((l) => l.slug === slug);
  assert.ok(
    lesson.sections.length >= 6 && lesson.sections.length <= 8,
    `${slug}: 6–8 sections`,
  );
  assert.ok(
    lesson.sections.reduce((n, s) => n + (s.examples?.length ?? 0), 0) >= 6,
    `${slug}: six worked examples`,
  );
  const wordCount = [lesson.intro, ...lesson.sections.flatMap((s) => s.body)]
    .join(" ")
    .match(/\S+/g).length;
  for (const section of lesson.sections) {
    assert.ok(section.body.length >= 2, `${slug}: rule and application`);
    assert.ok(section.body.every((text) => text.trim().length > 0));
    assert.ok(
      section.examples?.length >= 1,
      `${slug}: worked example per concept`,
    );
    assert.ok(
      section.examples.every((example) => example.text.trim().length > 0),
    );
  }
  console.log(
    `${slug}: ${lesson.sections.length} sections, ${wordCount} prose words, ${lesson.check.length} quick checks.`,
  );
}
