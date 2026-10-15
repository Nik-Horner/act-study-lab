import { test } from "node:test";
import assert from "node:assert/strict";
import activities from "../src/content/lesson-activities.json";
import { getLesson, getTopics } from "../src/lib/act/content";
import {
  geometryFirst,
  planningScores,
  readStudySettings,
  validateStudySettings,
  type StudySettings,
} from "../src/lib/account-settings";
import {
  makeDailyPlan,
  dailyScopes,
  dailyCoverage,
  estimateDailyBlock,
  refreshDailyContent,
} from "../src/lib/daily-plan";
import { blockUnits } from "../src/lib/daily-flow";
import { getLearningSkills } from "../src/lib/learning-skills";
const settings: StudySettings = {
  scores: { english: 34, math: 34, reading: 33, science: 27 },
  minutesPerDay: 75,
  scienceScoreRepresentative: false,
  mathCoveredTopics: [
    "math-algebra",
    "math-functions",
    "math-essential-skills",
    "math-modeling",
  ],
};
test("every non-English concept has an authored prediction, valid feedback, and usable evidence", () => {
  let count = 0;
  for (const topic of getTopics()) {
    const lesson = getLesson(topic.slug);
    const original = activities[topic.slug as keyof typeof activities];
    const focused = getLearningSkills(topic.slug).filter((skill) => skill.subject === "math");
    assert.equal(
      lesson.sections.length,
      original.length + focused.length,
      `${topic.slug}: retain historical concepts and append exact Math methods`,
    );
    assert.deepEqual(lesson.sections.slice(0, original.length).map((section) => section.activity), original);
    for (const section of lesson.sections) {
      const activity = section.activity!;
      assert(activity, `${topic.slug}: ${section.heading}`);
      assert(activity.prompt.trim(), `${topic.slug}: missing prediction task`);
      assert(activity.explanation.length > 30);
      assert(activity.choices.length >= 2);
      assert.equal(new Set(activity.choices).size, activity.choices.length);
      assert(
        Number.isInteger(activity.answer) &&
          activity.answer >= 0 &&
          activity.answer < activity.choices.length,
      );
      if (activity.evidence?.table) {
        const { columns, rows } = activity.evidence.table;
        assert(columns.length >= 2 && rows.length > 0);
        assert(rows.every((row) => row.length === columns.length));
      }
      count++;
    }
  }
  assert.equal(count, 284, "141 retained concepts and 143 focused Math methods");
});
test("worked predictions use correct geometry, trig, weighting, and interpolation", () => {
  const answer = (slug: keyof typeof activities, i: number) =>
    activities[slug][i].choices[activities[slug][i].answer];
  assert.equal(answer("math-geometry", 2), String(16 * 1.5 ** 3));
  assert.equal(answer("math-geometry", 3), `${96 / 2}°`);
  assert.equal(answer("math-trigonometry", 2), String.raw`\(-\frac45\)`);
  assert.equal(
    answer("science-data-reading", 5),
    `${(12 * 2 + 4 * 10) / (12 + 4)} mg/L`,
  );
  assert.equal(answer("science-trends-interpolation", 1), `${(46 + 34) / 2}°C`);
  assert.equal(answer("science-scientific-foundations", 3), String(9 + 4));
  assert.equal(answer("math-essential-skills", 4), String(2 * 12 ** 2));
});
test("low-effort Science stays on record without becoming a remedial baseline", () => {
  assert.equal(settings.scores.science, 27);
  assert.equal(planningScores(settings).science, 34);
  assert.equal(
    planningScores({ ...settings, scienceScoreRepresentative: true }).science,
    27,
  );
  assert.equal(
    planningScores({
      ...settings,
      scores: { english: null, math: null, reading: null, science: 27 },
    }).science,
    null,
  );
});
test("focus settings are account-safe, backward compatible, and reject arbitrary topic IDs", () => {
  assert.deepEqual(validateStudySettings(settings), settings);
  assert.deepEqual(
    readStudySettings({ act_study_settings: settings }, 34),
    settings,
  );
  assert(geometryFirst(settings));
  assert(!geometryFirst({ ...settings, mathFocus: "all" }));
  for (const patch of [
    { mathFocus: "bogus" },
    { scienceScoreRepresentative: "false" },
    { mathCoveredTopics: ["math-geometry"] },
    { mathCoveredTopics: ["math-algebra", "math-algebra"] },
    { mathCoveredTopics: "math-algebra" },
  ])
    assert.equal(validateStudySettings({ ...settings, ...patch }), null);
  assert.deepEqual(readStudySettings({}, 34).scores, {
    english: 34,
    math: null,
    reading: null,
    science: null,
  });
});
test("high-score daily Math starts with geometry, skips declared Desmos topics, and retains matching practice", () => {
  const course = { testDate: "2026-10-17", coveredUnits: [] as string[] };
  const plan = makeDailyPlan(
    "qa",
    "2026-10-09",
    settings,
    2,
    undefined,
    [],
    {},
    course,
  );
  const math = plan.blocks.find((block) => block.subject === "math")!;
  assert.equal(math.topic, "math-geometry");
  for (const unit of blockUnits(math)) {
    assert(!settings.mathCoveredTopics!.includes(unit.topic));
    assert(
      unit.questions.every((question) =>
        unit.practiceIds!.includes(question.id),
      ),
    );
    assert(unit.lesson.sections.every((section) => section.activity));
  }
  assert(
    dailyScopes("math").some((scope) => scope.topic.slug === "math-algebra"),
  );
  assert(
    !dailyScopes("math", settings).some((scope) =>
      settings.mathCoveredTopics!.includes(scope.topic.slug),
    ),
  );
  const coverage = dailyCoverage(plan, settings, course, plan.date);
  assert.equal(
    coverage.total,
    ["english", "math", "reading", "science"].flatMap((subject) =>
      dailyScopes(subject as "math", settings),
    ).length,
  );
  const answered = { [math.questions[0].id]: math.questions[0].answer };
  const refreshed = refreshDailyContent(plan, answered);
  assert.equal(refreshed.id, plan.id);
  assert.equal(refreshed.minutes, plan.minutes);
  assert(
    refreshed.blocks.every(
      (block) => estimateDailyBlock(block, answered) <= block.minutes,
    ),
  );
  assert(
    refreshed.blocks.some((block) =>
      [...block.questions, ...(block.historicalQuestions ?? [])].some(
        (q) => q.id === math.questions[0].id,
      ),
    ),
  );
});
test("saved feedback focus returns ahead of unrelated unread math", () => {
  const plan = makeDailyPlan(
    "qa",
    "2026-10-09",
    settings,
    1,
    { math: ["math:math-trigonometry:scope:2"] },
    [],
    {},
    { testDate: "2026-10-17", coveredUnits: [] },
  );
  assert.equal(
    blockUnits(plan.blocks.find((b) => b.subject === "math")!)[0].courseId,
    "math:math-trigonometry:skill:math-trigonometry-wave-features",
  );
  assert(blockUnits(plan.blocks.find((b) => b.subject === "math")!)[0].questions.every((q) => q.skillId === "math-trigonometry-wave-features"));
});
