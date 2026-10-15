import { test } from "node:test";
import assert from "node:assert/strict";
import { questionMethod } from "../src/lib/act/question-method";
import {
  getQuestions,
  getExamQuestions,
  getLesson,
} from "../src/lib/act/content";
import { getLearningSkill, getLearningSkillById, skillHref } from "../src/lib/learning-skills";
test("feedback links every active problem to an existing lesson and actual method section", () => {
  for (const q of getQuestions()) {
    const m = questionMethod(q)!;
    assert(m, q.id);
    assert(m.label.length, q.id);
    const url = new URL(m.href, "https://study.invalid");
    const skillId = url.searchParams.get("skill");
    if (skillId) {
      const skill = getLearningSkill(q.topic, skillId) ?? getLearningSkillById(skillId);
      assert(skill, `${q.id}: linked skill exists`);
      assert.equal(skillId, q.skillId, `${q.id}: feedback selects the assigned primary method`);
      assert.equal(m.href, skillHref(skill));
      assert.equal(m.label, skill.title);
      assert(skill.sections.every((i) => getLesson(skill.topic).sections[i]), q.id);
    }
    const index = m.href.match(/lesson-section-(\d+)$/)?.[1];
    if (index !== undefined)
      assert(getLesson(q.topic).sections[Number(index)], q.id);
  }
});
test("feedback targets the precise taught skill for advanced, held-out, and Reading tasks", () => {
  const q = getQuestions("math-algebra").find(
    (q) => q.id === "math-algebra-m1",
  )!;
  assert.equal(questionMethod(q)?.href, "/learn/math-algebra?skill=math-algebra-quadratic-formula");
  assert.match(questionMethod(q)!.label, /discriminant.*quadratic formula/i);
  const exam = getExamQuestions("reading-1")[0];
  assert.equal(questionMethod(exam)?.href, "/learn/reading-main-idea?skill=reading-main-idea-narrative-change");
  assert.match(questionMethod(exam)!.label, /narrative change/);
  assert.equal(
    questionMethod(getQuestions("reading-inference")[0])?.href,
    "/learn/reading-inference?skill=reading-inference-attitude",
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
