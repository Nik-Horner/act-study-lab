import { test } from "node:test";
import assert from "node:assert/strict";
import { getExam } from "../src/lib/content";
import { renderStem } from "../src/lib/format";
function corrected(examId: "exam-1" | "exam-2", number: number) {
  const p = getExam(examId).passages.find((p) =>
    p.questions.some((q) => q.number === number),
  )!;
  const q = p.questions.find((q) => q.number === number)!;
  return p.html.replace(
    new RegExp(`\\[\\[${number}\\|(.*?)\\]\\]`),
    (_match, text) =>
      q.choices[q.answer] === "NO CHANGE" ? text : q.choices[q.answer],
  );
}
test("keyed English edits form complete sentences in their actual passage context", () => {
  assert.match(
    corrected("exam-1", 24),
    /scholars collected them and passed the volumes/,
  );
  assert.match(corrected("exam-2", 9), /When he died in 1963/);
  assert.doesNotMatch(corrected("exam-2", 9), /When when/);
  assert.match(
    corrected("exam-2", 36),
    /opened with one hand and refolded just as easily\./,
  );
  assert.match(corrected("exam-2", 16), /and stretches it with tongs\.\n/);
  assert.match(
    corrected("exam-1", 35),
    /Shaping metal required more than strength\. A blacksmith/,
  );
  assert.equal(
    corrected("exam-1", 35).match(/Shaping metal required more than strength/g)
      ?.length,
    1,
  );
});
test("English underline markup never consumes nested literal matrix brackets", () => {
  assert.equal(renderStem("A = [[1, 2], [0, −1]]"), "A = [[1, 2], [0, −1]]");
  assert.equal(
    renderStem("Choose [[this phrase]]."),
    'Choose <span class="ul">this phrase</span>.',
  );
});

test("other keyed clause and transition edits fit their marked context", () => {
  assert.match(
    corrected("exam-1", 7),
    /checked her data again; the valley appeared every time\. Eventually,/,
  );
  assert.match(corrected("exam-2", 17), /Finally, when the form is right/);
  assert.match(corrected("exam-2", 29), /In the end, the flood led/);
  assert.match(corrected("exam-2", 38), /Beyond space and medicine, origami/);
});
