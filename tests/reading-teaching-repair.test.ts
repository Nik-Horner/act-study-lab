import { test } from "node:test";
import assert from "node:assert/strict";
import { getAllQuestions, getLesson } from "../src/lib/act/content";
import { focusLesson, getLearningSkills } from "../src/lib/learning-skills";
import { dailyScopes } from "../src/lib/daily-plan";
import englishLesson from "../src/content/lessons/redundancy.json";
import englishWords from "../src/content/lessons/misc-grammar.json";
import readingPractice from "../src/content/reading-practice.json";

const skills = getLearningSkills(undefined, "reading");
const words = (text: string) => text.trim().split(/\s+/).length;
const normalize = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

test("every Daily Reading skill teaches a short method, exact proof, and a separate try-it", () => {
  assert.equal(skills.length, 24);
  assert.deepEqual(
    new Set(dailyScopes("reading").map(({ scope }) => scope.skillId)),
    new Set(skills.map((skill) => skill.id)),
  );
  const questions = getAllQuestions().filter((q) => q.subject === "reading");
  const prompts = new Set<string>();
  for (const skill of skills) {
    const lesson = focusLesson(getLesson(skill.topic), skill);
    const body = lesson.sections.flatMap((section) => section.body);
    assert(body.length >= 2 && body.length <= 3, skill.id);
    assert(words(body.join(" ")) <= 50, `${skill.id}: keep the method brief`);
    assert(skill.tip && words(skill.tip) <= 24, `${skill.id}: actionable tip`);
    assert.equal(lesson.sections.at(-1)?.tip, skill.tip);
    const examples = lesson.sections.flatMap((section) => section.examples ?? []);
    assert.equal(examples.length, 1, `${skill.id}: one focused worked example`);
    assert.match(examples[0].text, /Reason: [\s\S]+\nTrap: [\s\S]+/);
    const activity = lesson.sections.at(-1)!.activity!;
    assert(activity, skill.id);
    assert(activity.evidenceText || activity.evidence, `${skill.id}: visible evidence`);
    assert(!prompts.has(activity.prompt), `${skill.id}: distinct task`);
    prompts.add(activity.prompt);
    assert.equal(new Set(activity.choices).size, activity.choices.length);
    assert(activity.choices[activity.answer], skill.id);
    assert(!examples[0].text.includes(activity.prompt), `${skill.id}: new application`);
    assert(!questions.some((q) => q.questionText === activity.prompt), skill.id);
    const evidence = normalize(activity.evidenceText ?? activity.evidence!.context);
    assert(
      !questions.some((q) => normalize(q.passage?.context ?? "") === evidence),
      `${skill.id}: try-it must not reveal an assessment passage`,
    );
  }
});

test("Reading count-versus-share visuals prove both the worked and independent answers", () => {
  const skill = skills.find((skill) => skill.id === "reading-integration-graphic")!;
  const lesson = focusLesson(getLesson(skill.topic), skill);
  const [before, after] = lesson.sections[0].evidence![0].table!.rows;
  assert.equal(Number(before[1]) / Number(before[2]), 0.5);
  assert.equal(Number(after[1]) / Number(after[2]), 0.3);
  const activity = lesson.sections[0].activity!;
  const [first, second] = activity.evidence!.table!.rows;
  assert.equal(Number(first[1]) / Number(first[2]), 0.6);
  assert.equal(Number(second[1]) / Number(second[2]), 0.5);
  assert(Number(second[1]) > Number(first[1]), "the count rises while the share falls");
  assert.match(activity.choices[activity.answer], /60% to 50%/);
  assert.match(activity.evidence!.context, /opening hours at the same time/);
  assert.match(activity.explanation, /prevent isolating/);
});

test("English concision check states the distinction among grammatical alternatives", () => {
  const check = englishLesson.check[1];
  assert.match(check.questionText, /most concise without changing the meaning/);
  assert.equal(check.choices[check.answer], "if");
});

test("Reading examples keep reported timing and observable actions within their evidence", () => {
  const combined = skills.find((skill) => skill.id === "reading-integration-combine")!.activity!;
  assert.match(combined.evidenceText!, /12 families received vegetables this month/);
  assert.match(combined.choices[combined.answer], /12 families this month/);
  const counterexample = getLesson("reading-inference").sections[4].examples![0].text;
  assert.match(counterexample, /claim that Leah abandoned the project/);
  assert.doesNotMatch(counterexample, /rules out.*wanted to abandon/);
  assert.match(counterexample, /enlarged the title, and asked to display/);
});

test("Reading feedback and mechanical context explain the questions actually shown", () => {
  const rope = readingPractice.find((question) => question.id === "RP-V3-01-2")!;
  assert.match(rope.explanation, /foot briefly hides the mistake/);
  assert.doesNotMatch(rope.explanation, /Not yet circling the post/);
  const mill = readingPractice.filter((question) => question.passage.id === "reading-practice-v3-p06");
  assert.equal(mill.length, 6);
  assert.equal(new Set(mill.map((question) => question.passage.context)).size, 1);
  assert.match(mill[0].passage.context, /disengaged the drive[\s\S]*disconnected indoor mechanism coast/);
});

test("Reading rhetorical choices all fit their stem grammatically without giving away the key", () => {
  const cue = readingPractice.find((question) => question.id === "RP-V3-08-5")!;
  assert.match(cue.questionText, /serves to:$/);
  for (const choice of cue.choices) assert.match(choice, /^(test|explain|show|demonstrate) /);
  const stamps = readingPractice.find((question) => question.id === "RP-V3-22-5")!;
  assert.match(stamps.questionText, /^The repeated references/);
  for (const choice of stamps.choices) assert.match(choice, /^(establish|give|turn|replace) /);
});

test("Reading methods cover their assigned narrative reasons, viewpoint shifts, and within-passage comparisons", () => {
  const body = (id: string) => skills.find((skill) => skill.id === id)!.body!.join(" ");
  assert.match(body("reading-details-sequence-cause"), /For order[\s\S]*For why[\s\S]*nearby clue/);
  assert.match(body("reading-craft-perspective"), /compare the opening view with the later one/);
  assert.match(body("reading-integration-combine"), /Within one passage, compare the two named moments/);
});

test("English contraction tip handles has contractions and nonpossessive there", () => {
  const tip = englishWords.sections[0].tip!;
  assert.match(tip, /it is or it has/);
  assert.match(tip, /who is or who has/);
  assert.match(tip, /plain word such as there/);
  assert.doesNotMatch(tip, /if not, you need the possessive/i);
});
