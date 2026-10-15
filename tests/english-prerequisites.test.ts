import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getLesson, getQuestions, getTopics } from "../src/lib/content";
import foundations from "../src/content/english-foundation-drills.json";
import additions from "../src/content/english-skill-questions.json";
import source from "../src/content/english-prerequisites.json";
import review from "../docs/english-content-review.json";

type Skill = {
  title: string;
  reportingCategory: string;
  sections: number[];
  workedExamples: { section: number; example: number }[];
  activity: {
    evidenceText?: string;
    prompt: string;
    choices: string[];
    answer: number;
    explanation: string;
  };
};
const contract = source as unknown as {
  counts: { topics: number; skills: number; questions: number; checks: number };
  topics: Record<
    string,
    {
      skills: Record<string, Skill>;
      questionSkills: Record<string, string[]>;
      checkSkills: Record<string, string[]>;
    }
  >;
};
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\[\[([\s\S]*?)\]\]/g, "$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sorted(nested)]),
    );
  return value;
}
function hash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(sorted(value)))
    .digest("hex");
}

test("every English drill, foundation question and check has explicit authored subskill prerequisites", () => {
  assert.deepEqual(contract.counts, {
    topics: 15,
    skills: 106,
    questions: 613,
    checks: 45,
  });
  for (const topic of getTopics()) {
    const requirements = contract.topics[topic.slug];
    assert(requirements, topic.slug);
    const questions = [
      ...getQuestions(topic.slug),
      ...foundations.filter((q) => q.topic === topic.slug),
    ];
    assert.deepEqual(
      Object.keys(requirements.questionSkills).sort(),
      questions.map((q) => q.id).sort(),
      topic.slug,
    );
    const lesson = getLesson(topic.slug);
    assert.deepEqual(
      Object.keys(requirements.checkSkills).sort(),
      lesson.check.map((_, i) => `${topic.slug}-daily-check-${i + 1}`).sort(),
    );
    for (const [id, skills] of Object.entries({
      ...requirements.questionSkills,
      ...requirements.checkSkills,
    })) {
      assert(skills.length > 0, id);
      for (const key of skills)
        assert(requirements.skills[key], `${id}: unknown skill ${key}`);
    }
    for (const [key, skill] of Object.entries(requirements.skills)) {
      assert(skill.title.length > 8, key);
      assert(["CSE", "POW", "KLA"].includes(skill.reportingCategory), key);
      assert(
        skill.sections.length > 0 &&
          new Set(skill.sections).size === skill.sections.length,
        key,
      );
      for (const index of skill.sections)
        assert(lesson.sections[index], `${topic.slug}:${key}:${index}`);
      assert(skill.workedExamples.length > 0, `${key}: no worked method`);
      for (const pointer of skill.workedExamples) {
        assert(
          skill.sections.includes(pointer.section),
          `${key}: example outside prerequisites`,
        );
        const example =
          lesson.sections[pointer.section].examples?.[pointer.example];
        assert(
          example?.text && example.label,
          `${key}: missing worked reasoning`,
        );
      }
    }
  }
});

test("each English subskill has independent try-it and at least three distinct active drills", () => {
  for (const topic of getTopics()) {
    const requirements = contract.topics[topic.slug];
    const lesson = getLesson(topic.slug);
    const bank = [
      ...getQuestions(topic.slug),
      ...foundations.filter((q) => q.topic === topic.slug),
    ];
    for (const [key, skill] of Object.entries(requirements.skills)) {
      const drills = bank.filter(
        (q) => requirements.questionSkills[q.id][0] === key,
      );
      assert(drills.length >= 3, `${topic.slug}:${key}: thin practice pool`);
      assert.equal(
        new Set(drills.map((q) => normalize(q.stem + " " + q.questionText)))
          .size,
        drills.length,
        key,
      );
      const a = skill.activity;
      assert(a.prompt.trim() && a.explanation.length > 35, key);
      assert(
        a.choices.length >= 3 && new Set(a.choices).size === a.choices.length,
        key,
      );
      assert(
        Number.isInteger(a.answer) &&
          a.answer >= 0 &&
          a.answer < a.choices.length,
        key,
      );
      const worked = skill.workedExamples.map((p) =>
        normalize(lesson.sections[p.section].examples![p.example].text),
      );
      assert(
        !worked.includes(normalize(a.evidenceText ?? a.prompt)),
        `${key}: copied try-it`,
      );
      for (const q of drills) {
        assert(
          !worked.includes(normalize(q.stem)),
          `${q.id}: copied worked example`,
        );
        assert.notEqual(
          normalize(q.stem),
          normalize(a.evidenceText ?? a.prompt),
          `${q.id}: copied try-it stimulus`,
        );
      }
      if (
        skill.sections.some((i) =>
          lesson.sections[i].heading.startsWith("Advanced transfer:"),
        )
      )
        assert(
          drills.some((q) => q.difficulty === "hard"),
          `${key}: no advanced transfer question`,
        );
    }
  }
  assert.equal(additions.length, 93);
  for (const q of additions) {
    assert.equal(new Set(q.choices).size, 4, q.id);
    assert(q.answer >= 0 && q.answer < 4, q.id);
    assert(q.explanation.length > 50, q.id);
  }
});

test("every English skill activity and focused teaching selection has current editorial evidence", () => {
  assert.equal(review.alignmentReview.skillProofs.length, 106);
  for (const proof of review.alignmentReview.skillProofs) {
    const skill = contract.topics[proof.topic].skills[proof.skill];
    const lesson = getLesson(proof.topic);
    assert.equal(
      hash(skill.activity),
      proof.activitySha256,
      `${proof.skill}: activity changed after review`,
    );
    assert.equal(
      hash(
        skill.sections.map((index) => ({
          index,
          section: lesson.sections[index],
        })),
      ),
      proof.teachingSha256,
      `${proof.skill}: method changed after review`,
    );
    assert.equal(
      hash(
        skill.workedExamples.map(
          (p) => lesson.sections[p.section].examples![p.example],
        ),
      ),
      proof.workedSha256,
      `${proof.skill}: example changed after review`,
    );
    assert.equal(
      skill.activity.choices[skill.activity.answer],
      proof.activityAnswer,
    );
  }
});

test("reason and concession have their own worked method rather than the nested-main-clause example", () => {
  const skills = contract.topics["sentence-structure"].skills;
  const reason = skills["reason-versus-concession"];
  const nested = skills["nested-main-clause"];
  const lesson = getLesson("sentence-structure");
  assert.deepEqual(reason.sections, [2, 6]);
  assert.deepEqual(nested.sections, [0, 1, 5]);
  assert(
    reason.workedExamples.every(
      (ref) => !nested.workedExamples.some(
        (other) => ref.section === other.section && ref.example === other.example,
      ),
    ),
  );
  const worked = reason.workedExamples.map(
    (ref) => lesson.sections[ref.section].examples![ref.example],
  );
  assert(worked.some((example) => /Because/.test(example.text)));
  assert(worked.some((example) => /Although/.test(example.text)));
  assert(worked.every((example) => !/catalogue|main subject/.test(example.text)));
  const method = lesson.sections[6] as (typeof lesson.sections)[number] & {
    teachingRevision?: number;
  };
  assert((method.teachingRevision ?? 0) >= 3);
  assert.match(method.body.join(" "), /explains why[\s\S]*despite/);
  assert.equal(reason.activity.answer, 0);
  assert.match(reason.activity.choices[0], /because they preserved evidence/);
});

test("the reported English near copies require different contexts or diagnostic operations", () => {
  const q = (topic: string, id: string) =>
    getQuestions(topic).find((q) => q.id === id)!;
  assert.doesNotMatch(
    q("sentence-structure", "sentence-structure-029").stem,
    /redwood|350/i,
  );
  assert.doesNotMatch(
    q("sentence-structure", "sentence-structure-030").stem,
    /pyramid|4,?000/i,
  );
  assert.doesNotMatch(
    q("modifiers", "modifiers-006").stem,
    /accountant|budget/i,
  );
  assert.doesNotMatch(
    q("modifiers", "modifiers-001").stem,
    /devon|nap|exhausted/i,
  );
  assert.doesNotMatch(
    q("parallel-structure", "parallel-structure-001").stem,
    /weekend|hik|swim|bike/i,
  );
  assert.doesNotMatch(
    q("punctuation", "punctuation-013").stem,
    /trail|view at the top/i,
  );
  assert.doesNotMatch(
    getLesson("test-patterns").check[0].stem,
    /telescope|roof/i,
  );
  assert.match(
    getLesson("sentence-structure").sections[0].tip!,
    /subject.*finite verb/i,
  );
  const all = getTopics()
    .map((t) => JSON.stringify(getLesson(t.slug)))
    .join(" ");
  assert.doesNotMatch(
    all,
    /If you can stop talking|Your ear will catch|Synonyms cancel|right bucket usually has only one|it is probably the trap/,
  );
});

test("two-part English evidence supports the named subgroup rather than an unspecified help-desk population", () => {
  const question = additions.find(
    (q) => q.id === "english-skill-which-choice-qualified-dual-evidence-01",
  )!;
  assert.match(question.stem, /residents who lack home internet/);
  const evidence = question.choices[question.answer];
  assert.match(evidence, /Errors fell/);
  assert.match(evidence, /residents without home internet/);
  assert.match(evidence, /remained at their previous level/);
});
