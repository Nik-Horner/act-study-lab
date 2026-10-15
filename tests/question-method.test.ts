import { test } from "node:test";
import assert from "node:assert/strict";
import { questionMethod } from "../src/lib/act/question-method";
import {
  getQuestions,
  getExamQuestions,
  getLesson,
} from "../src/lib/act/content";
test("feedback links every active problem to an existing lesson and actual method section", () => {
  for (const q of getQuestions()) {
    const m = questionMethod(q)!;
    assert(m, q.id);
    assert(m.label.length, q.id);
    const index = m.href.match(/lesson-section-(\d+)$/)?.[1];
    if (index !== undefined)
      assert(getLesson(q.topic).sections[Number(index)], q.id);
  }
});
test("authored advanced prerequisites win and held-out review has a safe full-lesson fallback", () => {
  const q = getQuestions("math-algebra").find(
    (q) => q.id === "math-algebra-m1",
  )!;
  assert.equal(questionMethod(q)?.href, "/learn/math-algebra#lesson-section-2");
  const exam = getExamQuestions("reading-1")[0];
  assert.equal(questionMethod(exam)?.href, `/learn/${exam.topic}`);
  assert.equal(
    questionMethod(getQuestions("reading-inference")[0])?.href,
    "/learn/reading-inference#lesson-section-1",
  );
});

test("mistake repair targets the actual prerequisite method and offers fresh transfer problems", async () => {
  const { practiceForMisses } = await import("../src/lib/act/question-method");
  const { getAllQuestions } = await import("../src/lib/act/content");
  const active = getQuestions("math-algebra"),
    missed = active.find((q) => q.id === "math-algebra-m1")!;
  const set = practiceForMisses(
    active,
    getAllQuestions(),
    new Set([missed.id]),
  );
  assert(set.length > 1);
  assert(set.some((q) => q.id !== missed.id));
  assert(!set.some((q) => q.id === "math-algebra-d1"));
});
