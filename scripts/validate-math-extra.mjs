import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = async (name) =>
  JSON.parse(await readFile(path.join(root, "src/content", name), "utf8"));
const [questions, lessons] = await Promise.all(
  ["math-extra-questions.json", "math-extra-lessons.json"].map(read),
);
const proofs = [
  {
    id: "math-functions-d7",
    key: "1",
    calculation: "2*(-2)+5",
    result: 1,
    skill: "piecewise evaluation",
  },
  {
    id: "math-functions-d8",
    key: "5",
    calculation: "(18+7)/5",
    result: 5,
    skill: "linear inverse",
  },
  {
    id: "math-functions-d9",
    key: "45",
    calculation: "(3*2+1)**2-4",
    result: 45,
    skill: "composition",
  },
  {
    id: "math-functions-d10",
    key: "\\(x>2\\) and \\(x \\ne  5\\)",
    calculation: "[2,3,4,5,6].map(x=>x-2>0&&x-5!==0)",
    result: [false, true, true, false, true],
    skill: "domain intersections",
  },
  {
    id: "math-functions-d11",
    key: "\\(y \\le  7\\)",
    calculation: "[-3,-1,0,2].map(x=>-2*(x+1)**2+7)",
    result: [-1, 7, 5, -11],
    skill: "quadratic range",
  },
  {
    id: "math-functions-d12",
    key: "(3, 6)",
    calculation: "[3+3,(4**2-9)/(4-3)]",
    result: [6, 7],
    skill: "removable discontinuity",
  },
  {
    id: "math-functions-d13",
    key: "\\(x = 4\\)",
    calculation: "[4-4,2*4+1]",
    result: [0, 9],
    skill: "rational asymptotes",
  },
  {
    id: "math-functions-d14",
    key: "6",
    calculation: "(12+6)/3",
    result: 6,
    skill: "input transformations",
  },
  {
    id: "math-functions-d15",
    key: "\\(80(1.25)^{t}\\)",
    calculation: "[0,1,2].map(t=>80*1.25**t)",
    result: [80, 100, 125],
    skill: "exponential recognition",
  },
  {
    id: "math-functions-d16",
    key: "9",
    calculation: "2**3+1",
    result: 9,
    skill: "logarithmic equations",
  },
  {
    id: "math-functions-d17",
    key: "\\(-1\\)",
    calculation: "[(-1-2)**2+1,(-1<=2),(5<=2)]",
    result: [10, true, false],
    skill: "restricted quadratic inverse",
  },
  {
    id: "math-functions-d18",
    key: "4",
    calculation: "((5**2-3*5)-(2**2-3*2))/(5-2)",
    result: 4,
    skill: "average rate of change",
  },
  {
    id: "math-functions-d19",
    key: "\\(2<x<4\\)",
    calculation: "[1,2,3,4,5].map(x=>x*x-6*x+8<0)",
    result: [false, false, true, false, false],
    skill: "graph sign intervals",
  },
  {
    id: "math-functions-d20",
    key: "25",
    calculation: "(4+1)**2",
    result: 25,
    skill: "finite differences",
  },
  {
    id: "math-functions-d21",
    key: "(4, 5)",
    calculation: "[(8/2),-3*Math.abs(2*4-8)+5]",
    result: [4, 5],
    skill: "absolute-value transformations",
  },
  {
    id: "math-functions-d22",
    key: "\\(3x^{4} - 2x^{2} + 7\\)",
    calculation:
      "[-2,-1,0,1,2].every(x=>3*(-x)**4-2*(-x)**2+7===3*x**4-2*x**2+7)",
    result: true,
    skill: "function symmetry",
  },
  {
    id: "math-functions-d23",
    key: "23",
    calculation: "(11-3)/4*10+3",
    result: 23,
    skill: "linear reconstruction",
  },
  {
    id: "math-functions-d24",
    key: "2",
    calculation: "3+(-1)",
    result: 2,
    skill: "graph intersections",
  },
  {
    id: "math-functions-d25",
    key: "5",
    calculation: "Math.log((3**2)*(3**3))/Math.log(3)",
    result: 5,
    skill: "logarithm laws",
  },
  {
    id: "math-functions-d26",
    key: "32",
    calculation: "256*(.5)**(12/4)",
    result: 32,
    skill: "exponential decay",
  },
  {
    id: "math-functions-d27",
    key: "1",
    calculation: "[0,-2,3].map(y=>{const x=(y+2)/(y-1);return (x+2)/(x-1);})",
    result: [0, -2, 3],
    skill: "rational range",
  },
  {
    id: "math-functions-d28",
    key: "2",
    calculation: "0+2",
    result: 2,
    skill: "equal outputs and lost roots",
  },
  {
    id: "math-functions-d29",
    key: "\\(x \\ge  1\\) and \\(x \\ne  10\\)",
    calculation: "[0,1,3,10,11].map(x=>x>=1&&Math.sqrt(x-1)!==3)",
    result: [false, true, true, false, true],
    skill: "composition domains",
  },
  {
    id: "math-functions-d30",
    key: "3",
    calculation: "12/(Math.cbrt(96/12)**2)",
    result: 3,
    skill: "exponential reconstruction",
  },
  {
    id: "math-functions-d31",
    key: "\\(2x + h\\)",
    calculation:
      "[[1,2],[-3,4],[0,5]].every(([x,h])=>(((x+h)**2+1)-(x*x+1))/h===2*x+h)",
    result: true,
    skill: "difference quotients",
  },
  {
    id: "math-functions-d32",
    key: "17",
    calculation: "3*((11-5)/3+2)+5",
    result: 17,
    skill: "nested inverse composition",
  },
  {
    id: "math-geometry-d7",
    key: "30",
    calculation: "18*Math.sqrt(25/9)",
    result: 30,
    skill: "similarity and area",
  },
  {
    id: "math-geometry-d8",
    key: "2:3",
    calculation: "Math.cbrt(8/27)",
    result: 0.6666666666666666,
    skill: "solid scaling",
  },
  {
    id: "math-geometry-d9",
    key: "\\(4\\pi\\)",
    calculation: "(80/360)*2*9",
    result: 4,
    skill: "arc length",
  },
  {
    id: "math-geometry-d10",
    key: "12",
    calculation: "Math.sqrt(13**2-5**2)",
    result: 12,
    skill: "tangent-radius triangle",
  },
  {
    id: "math-geometry-d11",
    key: "48",
    calculation: "6*Math.sqrt(10**2-6**2)",
    result: 48,
    skill: "inscribed rectangle",
  },
  {
    id: "math-geometry-d12",
    key: "24",
    calculation: "2*Math.sqrt(13**2-5**2)",
    result: 24,
    skill: "chord distance",
  },
  {
    id: "math-geometry-d13",
    key: "6",
    calculation: "Math.sqrt(3*12)",
    result: 6,
    skill: "tangent-secant power",
  },
  {
    id: "math-geometry-d14",
    key: "\\(144^\\circ\\)",
    calculation: "(10-2)*180/10",
    result: 144,
    skill: "polygon angles",
  },
  {
    id: "math-geometry-d15",
    key: "6",
    calculation: "360/60",
    result: 6,
    skill: "exterior-angle recognition",
  },
  {
    id: "math-geometry-d16",
    key: "\\(16\\pi\\)",
    calculation: "5**2-3**2",
    result: 16,
    skill: "annulus area",
  },
  {
    id: "math-geometry-d17",
    key: "216",
    calculation: "(6*8/2)*9",
    result: 216,
    skill: "prism volume",
  },
  {
    id: "math-geometry-d18",
    key: "\\(36\\pi\\)",
    calculation: "3**2*12/3",
    result: 36,
    skill: "cone volume",
  },
  {
    id: "math-geometry-d19",
    key: "\\(64\\pi\\)",
    calculation: "4*4**2",
    result: 64,
    skill: "sphere surface area",
  },
  {
    id: "math-geometry-d20",
    key: "12",
    calculation: "(4-(-2))*(5-1)/2",
    result: 12,
    skill: "coordinate area",
  },
  {
    id: "math-geometry-d21",
    key: "5",
    calculation: "Math.sqrt(25)",
    result: 5,
    skill: "circle equations",
  },
  {
    id: "math-geometry-d22",
    key: "\\((6, -3)\\)",
    calculation: "[2*1-(-4),2*2-7]",
    result: [6, -3],
    skill: "midpoint reversal",
  },
  {
    id: "math-geometry-d23",
    key: "\\(\\frac{4}{3}\\)",
    calculation: "-1/(-3/4)",
    result: 1.3333333333333333,
    skill: "perpendicular slopes",
  },
  {
    id: "math-geometry-d24",
    key: "12",
    calculation: "Math.abs(4*3-0*2)",
    result: 12,
    skill: "vector area",
  },
  {
    id: "math-geometry-d25",
    key: "\\(48 - \\pi\\)",
    calculation: "8*6-Math.PI*2**2/4",
    result: 44.8584073464102,
    skill: "composite area",
  },
  {
    id: "math-geometry-d26",
    key: "\\(25\\sqrt{3}\\)",
    calculation: "10**2*Math.sqrt(3)/4",
    result: 43.30127018922193,
    skill: "equilateral area",
  },
  {
    id: "math-geometry-d27",
    key: "6",
    calculation: "14*9/(9+12)",
    result: 6,
    skill: "angle bisector theorem",
  },
  {
    id: "math-geometry-d28",
    key: "\\(70^\\circ\\)",
    calculation: "140/2",
    result: 70,
    skill: "inscribed arcs",
  },
  {
    id: "math-geometry-d29",
    key: "12",
    calculation: "2*18/3",
    result: 12,
    skill: "secant-secant power",
  },
  {
    id: "math-geometry-d30",
    key: "128",
    calculation: "(2*Math.sqrt(64))**2/2",
    result: 128,
    skill: "square circumcircle",
  },
  {
    id: "math-geometry-d31",
    key: "500",
    calculation: "32*(10/4)**3",
    result: 500,
    skill: "volume scaling reversal",
  },
  {
    id: "math-geometry-d32",
    key: "7",
    calculation:
      "Array.from({length:20},(_,x)=>x).filter(x=>4+x>9&&4+9>x&&9+x>4).length",
    result: 7,
    skill: "triangle inequality counting",
  },
  {
    id: "math-trigonometry-d7",
    key: "\\(\\frac{12}{13}\\)",
    calculation: "Math.sqrt(1-(5/13)**2)",
    result: 0.9230769230769231,
    skill: "quadrant signs",
  },
  {
    id: "math-trigonometry-d8",
    key: "\\(\\frac{5}{3}\\)",
    calculation: "1/(3/5)",
    result: 1.6666666666666667,
    skill: "reciprocal ratios",
  },
  {
    id: "math-trigonometry-d9",
    key: "\\(\\sin  \\theta\\)",
    calculation:
      "[.3,.8,1.2].every(t=>Math.abs((1-Math.cos(t)**2)/Math.sin(t)-Math.sin(t))<1e-10)",
    result: true,
    skill: "identity simplification",
  },
  {
    id: "math-trigonometry-d10",
    key: "\\(\\frac{5\\pi}{4}\\)",
    calculation: "225/180",
    result: 1.25,
    skill: "angle conversion",
  },
  {
    id: "math-trigonometry-d11",
    key: "\\(\\frac{-1}{2}\\)",
    calculation: "Math.sin(7*Math.PI/6)",
    result: -0.5,
    skill: "unit-circle exact values",
  },
  {
    id: "math-trigonometry-d12",
    key: "\\(\\frac{1}{2}\\)",
    calculation: "Math.cos(-Math.PI/3)",
    result: 0.5,
    skill: "negative-angle symmetry",
  },
  {
    id: "math-trigonometry-d13",
    key: "\\(\\frac{\\pi}{3}\\)",
    calculation: "Math.PI/3/Math.PI",
    result: 0.3333333333333333,
    skill: "tangent periods",
  },
  {
    id: "math-trigonometry-d14",
    key: "\\(\\frac{\\pi}{4}\\) to the right",
    calculation: "Math.PI/4/Math.PI",
    result: 0.25,
    skill: "phase shifts",
  },
  {
    id: "math-trigonometry-d15",
    key: "8",
    calculation: "-3*(-1)+5",
    result: 8,
    skill: "amplitude and vertical shift",
  },
  {
    id: "math-trigonometry-d16",
    key: "\\(\\sqrt{109}\\)",
    calculation: "5**2+7**2-2*5*7*Math.cos(120*Math.PI/180)",
    result: 109,
    skill: "law of cosines with obtuse angles",
  },
  {
    id: "math-trigonometry-d17",
    key: "20",
    calculation: "8*10*Math.sin(Math.PI/6)/2",
    result: 20,
    skill: "trigonometric area",
  },
  {
    id: "math-trigonometry-d18",
    key: "\\(10\\sqrt{2}\\)",
    calculation: "10*Math.sin(Math.PI/4)/Math.sin(Math.PI/6)",
    result: 14.142135623730951,
    skill: "law of sines",
  },
  {
    id: "math-trigonometry-d19",
    key: "\\(30^\\circ\\)",
    calculation: "Math.atan(30/(30*Math.sqrt(3)))*180/Math.PI",
    result: 30,
    skill: "elevation recognition",
  },
  {
    id: "math-trigonometry-d20",
    key: "\\(2\\pi\\)",
    calculation: "(Math.PI/3+5*Math.PI/3)/Math.PI",
    result: 2,
    skill: "trig-equation intervals",
  },
  {
    id: "math-trigonometry-d21",
    key: "3",
    calculation:
      "[-Math.PI,0,Math.PI].filter(x=>Math.abs(Math.sin(x))<1e-10).length",
    result: 3,
    skill: "endpoint counting",
  },
  {
    id: "math-trigonometry-d22",
    key: "\\(\\frac{-7}{25}\\)",
    calculation: "2*(3/5)**2-1",
    result: -0.28,
    skill: "double-angle cosine",
  },
  {
    id: "math-trigonometry-d23",
    key: "\\(150^\\circ\\)",
    calculation: "Math.atan2(.5,-Math.sqrt(3)/2)*180/Math.PI",
    result: 150,
    skill: "unit-circle coordinates",
  },
  {
    id: "math-trigonometry-d24",
    key: "\\(\\frac{5}{4}\\)",
    calculation: "1/(4/5)",
    result: 1.25,
    skill: "secant signs",
  },
  {
    id: "math-trigonometry-d25",
    key: "\\(5\\sqrt{3}\\) meters",
    calculation: "10*Math.sin(Math.PI/3)",
    result: 8.660254037844386,
    skill: "right-triangle modeling",
  },
  {
    id: "math-trigonometry-d26",
    key: "\\(4\\pi\\)",
    calculation: "6*(2/3)",
    result: 4,
    skill: "radian arc formula",
  },
  {
    id: "math-trigonometry-d27",
    key: "\\(\\frac{8}{5}\\)",
    calculation: "1+3/5",
    result: 1.6,
    skill: "identities and cross terms",
  },
  {
    id: "math-trigonometry-d28",
    key: "\\(\\frac{3}{5}\\)",
    calculation: "Math.sqrt(1-(4/5)**2)",
    result: 0.6,
    skill: "cofunction identities",
  },
  {
    id: "math-trigonometry-d29",
    key: "4",
    calculation:
      "[0,1,2,3,4].map(k=>k*Math.PI/2).filter(x=>x<2*Math.PI).length",
    result: 4,
    skill: "periodic zero counting",
  },
  {
    id: "math-trigonometry-d30",
    key: "2",
    calculation:
      "(()=>{const B=Math.asin(12*Math.sin(Math.PI/6)/8);return [B,Math.PI-B].filter(b=>b+Math.PI/6<Math.PI).length;})()",
    result: 2,
    skill: "ambiguous sine-law case",
  },
  {
    id: "math-trigonometry-d31",
    key: "\\(\\frac{-3}{2}\\)",
    calculation: "1/(-2/3)",
    result: -1.5,
    skill: "cotangent",
  },
  {
    id: "math-trigonometry-d32",
    key: "\\(\\frac{-120}{169}\\)",
    calculation: "2*(5/13)*(-Math.sqrt(1-(5/13)**2))",
    result: -0.7100591715976331,
    skill: "double-angle sine with signs",
  },
  {
    id: "math-statistics-probability-d7",
    key: "86",
    calculation: "(10*80+15*90)/25",
    result: 86,
    skill: "weighted mean",
  },
  {
    id: "math-statistics-probability-d8",
    key: "\\(\\frac{140}{11}\\)",
    calculation: "(10*12+20)/11",
    result: 12.727272727272727,
    skill: "mean after adding data",
  },
  {
    id: "math-statistics-probability-d9",
    key: "8",
    calculation: "(7+9)/2",
    result: 8,
    skill: "median positions",
  },
  {
    id: "math-statistics-probability-d10",
    key: "\\(\\frac{6}{11}\\)",
    calculation: "12/(12+10)",
    result: 0.5454545454545454,
    skill: "conditional sample spaces",
  },
  {
    id: "math-statistics-probability-d11",
    key: "They are independent but not disjoint.",
    calculation: "[.4*.3===.12,.12===0]",
    result: [true, false],
    skill: "independent versus disjoint",
  },
  {
    id: "math-statistics-probability-d12",
    key: "0.7",
    calculation: ".5+.4-.2",
    result: 0.7,
    skill: "union probabilities",
  },
  {
    id: "math-statistics-probability-d13",
    key: "\\(\\frac{37}{64}\\)",
    calculation: "1-(3/4)**3",
    result: 0.578125,
    skill: "complement strategy",
  },
  {
    id: "math-statistics-probability-d14",
    key: "\\(\\frac{3}{8}\\)",
    calculation: "(3*2/2)*(.5)**2*(.5)",
    result: 0.375,
    skill: "binomial exact counts",
  },
  {
    id: "math-statistics-probability-d15",
    key: "60",
    calculation: "5*4*3",
    result: 60,
    skill: "ordered counting",
  },
  {
    id: "math-statistics-probability-d16",
    key: "126",
    calculation: "9*8*7*6/(4*3*2*1)",
    result: 126,
    skill: "unordered combinations",
  },
  {
    id: "math-statistics-probability-d17",
    key: "$0.50",
    calculation: "8/4-2*3/4",
    result: 0.5,
    skill: "expected net value",
  },
  {
    id: "math-statistics-probability-d18",
    key: "36",
    calculation: "(-2)**2*9",
    result: 36,
    skill: "variance transformations",
  },
  {
    id: "math-statistics-probability-d19",
    key: "They are equal.",
    calculation:
      "[1,2,3].map(x=>(x-2)**2).reduce((a,b)=>a+b,0)===[10,11,12].map(x=>(x-11)**2).reduce((a,b)=>a+b,0)",
    result: true,
    skill: "shift versus spread",
  },
  {
    id: "math-statistics-probability-d20",
    key: "(20, 4)",
    calculation: "[(5*4+100)/6,(4+4)/2]",
    result: [20, 4],
    skill: "outlier sensitivity",
  },
  {
    id: "math-statistics-probability-d21",
    key: "2",
    calculation: "(1*2+2*3+4)/(2+3+1)",
    result: 2,
    skill: "frequency-table mean",
  },
  {
    id: "math-statistics-probability-d22",
    key: "Volunteers may differ from the whole student population.",
    calculation:
      "(()=>{const interestedVolunteers=80/100,interestedOthers=20/100;return [interestedVolunteers,(80+20)/(100+100)];})()",
    result: [0.8, 0.5],
    skill: "sampling bias",
  },
  {
    id: "math-statistics-probability-d23",
    key: "12",
    calculation: "20-8",
    result: 12,
    skill: "interquartile range",
  },
  {
    id: "math-statistics-probability-d24",
    key: "2",
    calculation: "(76-60)/8",
    result: 2,
    skill: "standardized distances",
  },
  {
    id: "math-statistics-probability-d25",
    key: "\\(\\frac{2}{15}\\)",
    calculation: "4/10*3/9",
    result: 0.13333333333333333,
    skill: "dependent sequential probability",
  },
  {
    id: "math-statistics-probability-d26",
    key: "0.128",
    calculation: ".8*.8*.2",
    result: 0.128,
    skill: "first-success distributions",
  },
  {
    id: "math-statistics-probability-d27",
    key: "\\(\\frac{11}{36}\\)",
    calculation: "1-(5/6)**2",
    result: 0.3055555555555556,
    skill: "overlap and complements",
  },
  {
    id: "math-statistics-probability-d28",
    key: "\\(\\frac{5}{9}\\)",
    calculation: "(5*5)/(10*9/2)",
    result: 0.5555555555555556,
    skill: "parity sample spaces",
  },
  {
    id: "math-statistics-probability-d29",
    key: "\\(\\frac{2}{3}\\)",
    calculation: "4/(3+4-1)",
    result: 0.6666666666666666,
    skill: "updated conditional counts",
  },
  {
    id: "math-statistics-probability-d30",
    key: "43",
    calculation: "3*15-2",
    result: 43,
    skill: "mean transformations",
  },
  {
    id: "math-statistics-probability-d31",
    key: "\\(\\frac{1}{5}\\)",
    calculation: "2/(2+3+5)",
    result: 0.2,
    skill: "cumulative frequency wording",
  },
  {
    id: "math-statistics-probability-d32",
    key: "\\(\\frac{7}{15}\\)",
    calculation:
      "Array.from({length:30},(_,i)=>i+1).filter(x=>x%3===0||x%5===0).length/30",
    result: 0.4666666666666667,
    skill: "inclusion-exclusion counting",
  },
  {
    id: "check-math-functions-3",
    key: "4",
    calculation: "[4, (4-1)**2+4,4>=1]",
    result: [4, 13, true],
    skill: "restricted inverse check",
  },
  {
    id: "check-math-geometry-3",
    key: "\\(270 \\pi\\)",
    calculation: "10*(6/2)**3",
    result: 270,
    skill: "solid scaling check",
  },
  {
    id: "check-math-trigonometry-3",
    key: "\\(\\frac{7}{25}\\)",
    calculation: "1-2*(-3/5)**2",
    result: 0.28,
    skill: "double-angle check",
  },
  {
    id: "check-math-statistics-probability-3",
    key: "\\(\\frac{7}{10}\\)",
    calculation: "1-(3/5)*(2/4)",
    result: 0.7,
    skill: "complement without replacement check",
  },
];
const close = (a, b) =>
  typeof a === "number" && typeof b === "number"
    ? Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
    : Array.isArray(a) && Array.isArray(b)
      ? a.length === b.length && a.every((v, i) => close(v, b[i]))
      : a === b;
const all = [
  ...questions,
  ...lessons.flatMap((l) => l.check.filter((q) => q.id.endsWith("-3"))),
];
assert.equal(questions.length, 104);
assert.equal(lessons.length, 4);
assert.equal(all.length, 108);
const map = new Map(all.map((q) => [q.id, q]));
assert.equal(map.size, 108);
for (const topic of [
  "functions",
  "geometry",
  "trigonometry",
  "statistics-probability",
]) {
  const group = questions.filter((q) => q.topic === "math-" + topic);
  assert.equal(group.length, 26);
  for (let n = 7; n <= 32; n++) assert.ok(map.has("math-" + topic + "-d" + n));
  const skills = new Set(
    proofs
      .filter((p) => map.get(p.id)?.topic === "math-" + topic)
      .map((p) => p.skill),
  );
  assert.ok(skills.size >= 8);
  const lesson = lessons.find((l) => l.slug === "math-" + topic);
  assert.ok(lesson);
  assert.ok(lesson.sections.length >= 6 && lesson.sections.length <= 8);
  assert.equal(lesson.check.length, 3);
  for (const section of lesson.sections) {
    assert.ok(section.body.length >= 2, topic + ": teach the rule and its use");
    assert.ok(section.body.every((text) => text.trim().length > 0));
    assert.ok(
      section.examples.length >= 1,
      topic + ": worked example per concept",
    );
    assert.ok(
      section.examples.every((example) => example.text.trim().length > 0),
    );
  }
  assert.ok(lesson.sections.flatMap((s) => s.examples).length >= 6);
}
assert.equal(proofs.length, all.length);
for (const proof of proofs) {
  const q = map.get(proof.id);
  assert.ok(q, proof.id);
  assert.equal(q.choices.length, 4);
  assert.equal(new Set(q.choices).size, 4);
  assert.ok(q.answer >= 0 && q.answer < 4);
  assert.equal(
    q.choices[q.answer],
    proof.key,
    proof.id + ": selected textual conclusion",
  );
  assert.ok(q.explanation.length >= 120, proof.id + ": explanation depth");
  // These expressions are checked-in mathematical derivations, never user input.
  const actual = Function("return (" + proof.calculation + ")")();
  assert.ok(
    close(actual, proof.result),
    proof.id +
      ": independent numerical/symbolic derivation " +
      JSON.stringify(actual),
  );
}

// Independently connect numeric choice text to the calculation, and reject
// differently written distractors that are mathematically the same value.
function numericChoice(text) {
  let value = text
    .replace(/\\\(|\\\)/g, "")
    .replace(/\^\\circ\b/g, "")
    .replace(/\$/g, "")
    .replace(/°/g, "")
    .replace(/−/g, "-")
    .replace(/\s+(?:meters|square units|cubic units)$/, "")
    .replace(/:/g, "/")
    .trim();
  // Read only the authored numeric TeX subset; the same independent numeric
  // checks still apply after choices acquire display markup.
  let cursor = 0;
  const argument = () => {
    while (value[cursor] === " ") cursor++;
    if (value[cursor] === "{") {
      cursor++;
      let result = "";
      while (cursor < value.length && value[cursor] !== "}") result += atom();
      if (value[cursor++] !== "}") throw new Error("Unclosed numeric group");
      return result;
    }
    return atom();
  };
  const atom = () => {
    if (value[cursor] !== "\\") return value[cursor++] ?? "";
    const command = value.slice(cursor).match(/^\\([a-z]+)/)?.[1];
    if (!command) throw new Error("Unknown numeric notation");
    cursor += command.length + 1;
    if (command === "pi") return "π";
    if (command === "sqrt") return `√(${argument()})`;
    if (command === "frac") return `((${argument()})/(${argument()}))`;
    throw new Error("Not a numeric choice");
  };
  try {
    let numeric = "";
    while (cursor < value.length) numeric += atom();
    value = numeric;
  } catch {
    return null;
  }
  if (!/^[0-9.\-+*/()π√\s]+$/.test(value)) return null;
  value = value
    .replace(/√\(/g, "Math.sqrt(")
    .replace(/√(\d+(?:\.\d+)?)/g, "Math.sqrt($1)")
    .replace(/π/g, "Math.PI")
    .replace(/(\d|\))(?=Math\.)/g, "$1*");
  try {
    return Function("return (" + value + ")")();
  } catch {
    return null;
  }
}
assert.ok(
  close(
    numericChoice(String.raw`\(\frac{5\sqrt{2}}{2}\)`),
    (5 * Math.sqrt(2)) / 2,
  ),
);
assert.equal(numericChoice(String.raw`\(\frac{1}{\frac{2}{3}}\)`), 1.5);
assert.equal(numericChoice(String.raw`\(\frac{x}{2}\)`), null);
assert.equal(numericChoice(String.raw`\(\frac{1}{\)`), null);
let numericAudits = 0;
for (const proof of proofs) {
  const q = map.get(proof.id);
  let selected = numericChoice(q.choices[q.answer]);
  if (selected === null || typeof proof.result !== "number") continue;
  assert.equal(
    q.choices
      .map(numericChoice)
      .filter((value) => value !== null && close(value, selected)).length,
    1,
    proof.id + ": equivalent numeric distractors",
  );
  if (
    /π|\\pi/.test(proof.key) &&
    (!proof.calculation.includes("Math.PI") ||
      proof.calculation.trim().endsWith("/Math.PI"))
  )
    selected /= Math.PI;
  assert.ok(
    close(selected, proof.result) ||
      (/√|\\sqrt/.test(proof.key) && close(selected * selected, proof.result)),
    proof.id + ": numeric text agrees with derived conclusion",
  );
  numericAudits++;
}
assert.ok(numericAudits >= 80);
const phase = map.get("math-trigonometry-d14");
assert.ok(phase.choices.includes(String.raw`\(\frac{\pi}{8}\) to the left`));
assert.ok(
  !phase.choices.includes(String.raw`\(\frac{\pi}{4}\) to the left`),
  "a left π/4 shift is equivalent to the correct right π/4 shift",
);
for (const x of [0.02, 0.21, 0.43])
  assert.ok(
    close(2 * Math.sin(4 * x - Math.PI), 2 * Math.sin(4 * (x - Math.PI / 4))),
  );
assert.ok(
  [0.02, 0.21, 0.43].some(
    (x) =>
      !close(
        2 * Math.sin(4 * x - Math.PI),
        2 * Math.sin(4 * (x + Math.PI / 8)),
      ),
  ),
);
assert.equal(
  map.get("math-trigonometry-d13").questionText,
  "What is its least positive period?",
);
const evenCandidates = [
  (x) => 3 * x ** 4 - 2 * x ** 2 + 7,
  (x) => 3 * x ** 3 - 2 * x + 7,
  (x) => x * x + x,
  (x) => x ** 3 - x,
];
assert.equal(
  evenCandidates.filter((f) => [-2, -1, 0, 1, 2].every((x) => f(-x) === f(x)))
    .length,
  1,
);

console.log(
  "Audited all 104 supplemental Math drills and four new lesson checks; four lessons meet depth requirements.",
);
