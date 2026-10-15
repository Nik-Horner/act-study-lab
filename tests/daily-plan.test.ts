import format5Fixtures from "./fixtures/daily-format5.json";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeDailyPlan,
  dailyScopes,
  dailySubjects,
  dailyCoverage,
  dailyBudget,
  dailyComplete,
  dailyDate,
  dailyId,
  DAILY_SUBJECTS,
  selectDailyPlan,
  restoreDailyTeaching,
  refreshDailyContent,
  estimateDailyBlock,
  type DailyPlan,
} from "../src/lib/daily-plan";
import {
  getExamQuestions,
  getExams,
  getLesson,
  getQuestion,
  getQuestions,
} from "../src/lib/act/content";
import {
  blockUnits,
  dailyStep,
  dailyFocus,
  dailyReviewKey,
  readingConceptProgress,
  dailyConcepts,
} from "../src/lib/daily-flow";
import { getLesson as englishLesson } from "../src/lib/content";
import {
  focusLesson,
  getLearningSkill,
  getLearningSkills,
  getQuestionTeaching,
} from "../src/lib/learning-skills";
import { englishDailyQuestions } from "../src/lib/english-daily-content";
import legacyFixtures from "./fixtures/focused-curriculum-legacy.json";
import { validateStudySettings } from "../src/lib/account-settings";
const settings = {
  scores: { english: 32, math: 34, reading: null, science: 27 },
  minutesPerDay: 75,
};
function planAtSkill(
  subject: (typeof DAILY_SUBJECTS)[number],
  skillId: string,
  minutesPerDay = 90,
) {
  const position = dailyScopes(subject).findIndex(
    (s) => s.scope.skillId === skillId,
  );
  assert(position >= 0, skillId);
  return makeDailyPlan(
    "focused-fixture",
    "2026-10-14",
    {
      ...settings,
      minutesPerDay,
      scores: { ...settings.scores, [subject]: null },
    },
    0,
    undefined,
    [],
    { [subject]: position },
  );
}
const courseIds = () =>
  DAILY_SUBJECTS.flatMap((subject) =>
    dailyScopes(subject).map((scope) => scope.id),
  );
const addDays = (date: string, days: number) =>
  new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
test("larger-budget coverage preserves an already saved session on the final study day", () => {
  const original = { ...settings, minutesPerDay: 60 };
  const all = DAILY_SUBJECTS.flatMap((subject) =>
    dailyScopes(subject).map((scope) => scope.id),
  );
  const missing = dailyScopes("english")
    .filter((scope) =>
      ["sentence-structure", "commas"].includes(scope.topic.slug),
    )
    .map((scope) => scope.id);
  const course = {
    testDate: "2026-10-17",
    coveredUnits: all.filter((id) => !missing.includes(id)),
  };
  const saved = makeDailyPlan(
    "qa",
    "2026-10-16",
    original,
    0,
    undefined,
    [],
    {},
    course,
  );
  const before = dailyCoverage(saved, original, course, saved.date);
  assert.equal(before.onTrack, false);
  assert.equal(before.requiredMinutes, null);
  const changed = { ...original, minutesPerDay: 90 };
  assert.equal(
    selectDailyPlan(saved, "qa", saved.date, changed, false, course),
    saved,
  );
  assert.equal(
    dailyCoverage(saved, changed, course, saved.date).requiredMinutes,
    null,
  );
  assert.equal(
    dailyCoverage(saved, original, course, saved.date, false).requiredMinutes,
    90,
  );
});
test("Reading skills have distinct titles and explicitly matched Daily teaching", () => {
  const scopes = dailyScopes("reading");
  assert.equal(new Set(scopes.map((s) => s.id)).size, scopes.length);
  assert.equal(new Set(scopes.map((s) => s.scope.title)).size, scopes.length);
  for (const { topic, scope } of scopes) {
    const skill = getLearningSkill(topic.slug, scope.skillId!)!;
    assert.equal(scope.title, skill.title);
    assert(scope.practice.length >= 2);
    for (const position of scope.practice) {
      const q = getQuestions(topic.slug)[position];
      assert.equal(q.skillId, skill.id);
      assert(q.teachingSections!.every((i) => scope.sections.includes(i)));
    }
  }
});

test("refreshing Reading preserves saved concept positions and answers while focusing the visible method", () => {
  const plan = planAtSkill("reading", "reading-main-idea-movement");
  const block = plan.blocks.find((b) => b.subject === "reading")!;
  const unit = blockUnits(block)[0];
  block.units = [unit];
  const full = getLesson(unit.topic);
  unit.sectionIndices = [1, 2, 3];
  unit.lesson.sections = unit.sectionIndices.map((i) => full.sections[i]);
  const answers = Object.fromEntries(
    plan.blocks.flatMap((b) => b.questions).map((q) => [q.id, q.answer]),
  );
  const refreshed = refreshDailyContent(plan, answers);
  const reading = refreshed.blocks.find((b) => b.subject === "reading")!;
  const saved = blockUnits(reading)[0];
  assert.equal(refreshed.id, plan.id);
  assert.equal(saved.id, unit.id);
  assert.equal(
    saved.title,
    getLearningSkill(saved.topic, saved.skillId!)!.title,
  );
  assert.deepEqual(saved.sectionIndices, [1, 2, 3]);
  assert.deepEqual(dailyConcepts(saved), [1]);
  assert.deepEqual(
    saved.questions.map((q) => q.id),
    unit.questions.map((q) => q.id),
  );
  assert.deepEqual(readingConceptProgress(refreshed, []), []);
  const earlier = {
    ...saved,
    id: `${saved.id}:earlier`,
    sectionIndices: [2],
    focusedConceptIndices: [0],
    lesson: { ...saved.lesson, sections: [full.sections[2]] },
  };
  const sameSession = {
    ...refreshed,
    blocks: [{ ...reading, units: [earlier, saved] }],
  };
  assert(
    readingConceptProgress(sameSession, [`${earlier.id}:concept:0`]).includes(
      `${saved.id}:concept:1`,
    ),
  );
  assert(
    !readingConceptProgress(sameSession, []).includes(`${saved.id}:concept:1`),
  );
  assert(
    !readingConceptProgress(sameSession, [earlier.id]).includes(
      `${saved.id}:concept:1`,
    ),
    "An old unit completion alone does not prove which current method was visible",
  );
  const required = {
    ...refreshed,
    blocks: [
      {
        ...reading,
        units: [earlier, { ...saved, requiredConceptIndices: [1] }],
      },
    ],
  };
  assert(
    !readingConceptProgress(required, [earlier.id]).includes(
      `${saved.id}:concept:1`,
    ),
  );
  assert.deepEqual(
    readingConceptProgress(
      {
        ...refreshed,
        blocks: refreshed.blocks.map((b) => ({ ...b, reviewOnly: true })),
      },
      [],
    ),
    [],
  );
});

test("one total budget covers all four subjects with more time for lower baselines", () => {
  for (const budget of [60, 75, 90]) {
    const minutes = dailyBudget(budget, settings.scores);
    assert.equal(
      minutes.reduce((a, b) => a + b, 0),
      budget,
    );
    assert(minutes.every((n) => n >= 10));
    assert(minutes[3] > minutes[2]);
  }
});
test("the selected target directs extra time toward subjects still below that goal", () => {
  const scores = { english: 32, math: 34, reading: 28, science: 24 };
  const course = { testDate: "2026-11-17", coveredUnits: [] };
  for (const minutesPerDay of [60, 75, 90]) {
    const baseline = dailyBudget(minutesPerDay, scores);
    assert.deepEqual(baseline, dailyBudget(minutesPerDay, scores, 36));
    const target = dailyBudget(minutesPerDay, scores, 28);
    assert(target[3] > baseline[3]);
    assert.equal(
      target.reduce((sum, minutes) => sum + minutes, 0),
      minutesPerDay,
    );
    assert(target.every((minutes) => minutes >= 10));
    const build = (targetScore?: number) =>
      makeDailyPlan(
        "target",
        "2026-10-12",
        { ...settings, scores, minutesPerDay },
        0,
        undefined,
        [],
        {},
        { ...course, targetScore },
      );
    const defaultPlan = build();
    assert.deepEqual(defaultPlan.blocks, build(36).blocks);
    const targetPlan = build(28);
    assert(
      targetPlan.blocks.find((block) => block.subject === "science")!.minutes >
        defaultPlan.blocks.find((block) => block.subject === "science")!
          .minutes,
    );
    assert.equal(targetPlan.course?.targetScore, 28);
    assert.equal(
      targetPlan.blocks.reduce((sum, block) => sum + block.minutes, 0),
      minutesPerDay,
    );
    for (const block of targetPlan.blocks)
      assert(estimateDailyBlock(block) <= block.minutes);
    assert.equal(
      selectDailyPlan(
        defaultPlan,
        "target",
        "2026-10-12",
        { ...settings, scores, minutesPerDay },
        false,
        { ...course, targetScore: 28 },
      ),
      defaultPlan,
      "Changing the target preserves an active saved session",
    );
  }
});
test("daily program includes substantial lesson content and original practice in all subjects", () => {
  const plan = makeDailyPlan("qa", "2026-10-06", settings, 0);
  assert.deepEqual(
    plan.blocks.map((b) => b.subject),
    DAILY_SUBJECTS,
  );
  const reserved = new Set(
    getExams().flatMap((e) => getExamQuestions(e.id).map((q) => q.id)),
  );
  for (const b of plan.blocks) {
    assert(b.lesson.sections[0].body.length);
    assert(b.questions.length >= 2);
    assert.equal(
      new Set(b.questions.map((q) => q.id)).size,
      b.questions.length,
    );
    for (const q of b.questions) assert(!reserved.has(q.id));
  }
  for (const b of plan.blocks) {
    assert(blockUnits(b).length >= 1 && blockUnits(b).length <= 2);
    for (const unit of blockUnits(b)) {
      const original =
        b.subject === "english"
          ? englishLesson(unit.topic)
          : getLesson(unit.topic);
      assert.deepEqual(
        unit.lesson.sections.map((s) => s.heading),
        unit.sectionIndices!.map((i) => original.sections[i].heading),
      );
      assert(
        unit.lesson.sections.every((s) =>
          original.sections.some(
            (o) =>
              o.heading === s.heading &&
              JSON.stringify(o.body) === JSON.stringify(s.body),
          ),
        ),
      );
      assert(unit.questions.every((q) => unit.practiceIds!.includes(q.id)));
      assert(unit.questions.every((q) => q.topic === unit.topic));
      if (b.subject !== "english")
        for (const q of unit.questions)
          assert.equal(getQuestion(q.id)?.topic, unit.topic);
    }
  }
});
test("optional Science reallocates the whole budget and coverage to the three required subjects", () => {
  assert.deepEqual(dailySubjects(), DAILY_SUBJECTS);
  for (const minutesPerDay of [60, 75, 90]) {
    const preference = { ...settings, minutesPerDay, includeScience: false };
    const subjects = ["english", "reading", "math"];
    const course = {
      testDate: "2026-11-17",
      targetScore: 32,
      coveredUnits: [],
    };
    const plan = makeDailyPlan(
      "optional",
      "2026-10-12",
      preference,
      0,
      undefined,
      [],
      {},
      course,
    );
    assert.deepEqual(
      plan.blocks.map((block) => block.subject),
      subjects,
    );
    assert.deepEqual(dailyScopes("science", preference), []);
    assert.equal(
      plan.blocks.reduce((sum, block) => sum + block.minutes, 0),
      minutesPerDay,
    );
    assert(
      plan.blocks.every((block) => estimateDailyBlock(block) <= block.minutes),
    );
    const allocation = dailyBudget(minutesPerDay, settings.scores, 32, false);
    assert.equal(allocation.length, 3);
    assert.equal(
      allocation.reduce((sum, minutes) => sum + minutes, 0),
      minutesPerDay,
    );
    assert(allocation.every((minutes) => minutes >= 10));
    const coveredUnits = subjects.flatMap((subject) =>
      dailyScopes(subject as "english", preference).map((scope) => scope.id),
    );
    const coverage = dailyCoverage(
      plan,
      preference,
      { ...course, coveredUnits },
      plan.date,
    );
    assert.equal(coverage.total, coveredUnits.length);
    assert.equal(coverage.covered, coveredUnits.length);
    assert(coverage.onTrack);
    const answers = Object.fromEntries(
      plan.blocks.flatMap((block) =>
        block.questions.map((question) => [question.id, question.answer]),
      ),
    );
    const lessons = plan.blocks.flatMap((block) => [
      ...blockUnits(block).map((unit) => unit.id),
      dailyReviewKey(block),
    ]);
    assert(dailyComplete(plan, answers, lessons));
    assert(
      !dailyComplete(
        plan,
        answers,
        lessons.filter((key) => key !== dailyReviewKey(plan.blocks.at(-1)!)),
      ),
    );
  }
});

test("turning Science off preserves saved work and takes effect in the next session", () => {
  const current = makeDailyPlan("optional", "2026-10-12", settings, 0);
  const preference = { ...settings, includeScience: false };
  assert.equal(
    selectDailyPlan(current, "optional", "2026-10-13", preference),
    current,
  );
  assert(current.blocks.some((block) => block.subject === "science"));
  const next = selectDailyPlan(
    { ...current, complete: true },
    "optional",
    "2026-10-13",
    preference,
  );
  assert(!next.blocks.some((block) => block.subject === "science"));
  const restored = restoreDailyTeaching(
    format5Fixtures.cases[0].plan as unknown as DailyPlan,
    {},
    preference,
  );
  assert(
    restored.blocks.some((block) => block.subject === "science"),
    "Legacy repair must keep the saved session's subjects",
  );
});
test("completed course units advance once and plan IDs are account scoped", () => {
  const first = makeDailyPlan("qa", "2026-10-06", settings, 0);
  const coveredUnits = first.blocks
    .flatMap(blockUnits)
    .map((u) => u.courseId ?? u.id);
  const sequential = selectDailyPlan(
    { ...first, complete: true },
    "qa",
    "2026-10-07",
    settings,
  );
  assert(
    sequential.blocks
      .flatMap(blockUnits)
      .every((unit) => !coveredUnits.includes(unit.courseId ?? unit.id)),
    "The legacy numeric cursor must also advance past the units just taught",
  );
  const next = selectDailyPlan(
    { ...first, complete: true },
    "qa",
    "2026-10-07",
    settings,
    false,
    { testDate: "2027-06-12", coveredUnits },
  );
  for (const b of next.blocks)
    assert(
      blockUnits(b).every((u) => !coveredUnits.includes(u.courseId ?? u.id)),
    );
  assert.notEqual(
    first.id,
    makeDailyPlan("another", first.date, settings, 0).id,
  );
  assert.match(
    first.id,
    /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-a[\da-f]{3}-[\da-f]{12}$/,
  );
  assert.equal(dailyId("same"), dailyId("same"));
});

test("completion requires all lessons and answered questions including incorrect choices", () => {
  const p = makeDailyPlan("qa", "2026-10-06", settings, 0);
  const a = Object.fromEntries(
    p.blocks.flatMap((b) => b.questions.map((q) => [q.id, 0])),
  );
  assert(!dailyComplete(p, {}, DAILY_SUBJECTS));
  assert(!dailyComplete(p, a, ["english"]));
  const lessonKeys = p.blocks.flatMap((b) => blockUnits(b).map((u) => u.id));
  assert(!dailyComplete(p, a, lessonKeys));
  assert.equal(dailyStep(p, a, lessonKeys).kind, "review");
  assert(
    dailyComplete(p, a, [
      ...lessonKeys,
      ...DAILY_SUBJECTS.map((s) => `review:${s}`),
    ]),
  );
});
test("daily calendar follows Chicago across UTC midnight", () => {
  assert.equal(dailyDate(new Date("2026-10-07T01:00:00Z")), "2026-10-06");
});
test("all category rotations retain real questions and lessons", () => {
  assert(validateStudySettings(settings));
  for (let i = 0; i < 45; i++) {
    const p = makeDailyPlan("qa", "2026-10-06", settings, i);
    for (const b of p.blocks) {
      assert(b.questions.length >= 2);
      assert(b.lesson.sections.length);
    }
  }
});

test("finishing an older lesson today unlocks today's plan without repeating today's completed plan", () => {
  const p = makeDailyPlan("qa", "2026-10-06", settings, 0);
  assert.equal(selectDailyPlan(p, "qa", "2026-10-09", settings), p);
  const completed = { ...p, complete: true, completedDate: "2026-10-09" };
  const next = selectDailyPlan(completed, "qa", "2026-10-09", settings);
  assert.equal(next.date, "2026-10-09");
  assert.notEqual(next.id, completed.id);
  assert.equal(next.complete, false);
  assert.equal(next.sequence, 1);
  assert.equal(next.minutes, 75);
  assert.equal(next.blocks.length, 4);
  const doneToday = { ...next, complete: true, completedDate: next.date };
  assert.equal(
    selectDailyPlan(doneToday, "qa", next.date, settings),
    doneToday,
  );
});

test("moving on creates today's plan without mutating unfinished work or bypassing today's completion", () => {
  const yesterday = makeDailyPlan("qa", "2026-10-07", settings, 0);
  const before = JSON.stringify(yesterday);
  const today = selectDailyPlan(yesterday, "qa", "2026-10-08", settings, true);
  assert.equal(today.date, "2026-10-08");
  assert.notEqual(today.id, yesterday.id);
  assert.equal(today.sequence, 1);
  assert.equal(today.minutes, settings.minutesPerDay);
  assert.equal(JSON.stringify(yesterday), before);
  assert.equal(
    selectDailyPlan(today, "qa", "2026-10-08", settings, true),
    today,
  );
  const completed = {
    ...yesterday,
    complete: true,
    completedDate: "2026-10-08",
  };
  assert.equal(
    selectDailyPlan(completed, "qa", "2026-10-08", settings, true).date,
    "2026-10-08",
  );
  assert.equal(
    selectDailyPlan(
      { ...completed, completedDate: "2026-10-07" },
      "qa",
      "2026-10-08",
      settings,
    ).date,
    "2026-10-08",
  );
});

test("older sessions regain focused teaching without losing answered history or changing the plan ID", () => {
  const fixture = format5Fixtures.cases[0];
  const legacy = structuredClone(fixture.plan) as unknown as DailyPlan;
  const answers = fixture.answers as unknown as Record<string, number>;
  const restored = restoreDailyTeaching(legacy, answers, fixture.settings);
  assert.equal(restored.id, legacy.id);
  assert.equal(restored.date, legacy.date);
  assert.deepEqual(restored.blocks.slice(1), legacy.blocks.slice(1));
  assert(restored.blocks[0].lesson.sections.some((s) => s.body.length));
  for (const id of Object.keys(answers))
    assert(
      [
        ...restored.blocks[0].questions,
        ...(restored.blocks[0].historicalQuestions ?? []),
      ].some((q) => q.id === id),
    );
});

test("upgrading a saved Reading session removes untaught future skills while retaining saved answers", () => {
  const p = makeDailyPlan("qa", "2026-10-06", settings, 0);
  const wrong = getQuestion("RD-01-3")!;
  const reading = p.blocks.find((b) => b.subject === "reading")!;
  const legacy = {
    ...p,
    formatVersion: undefined,
    blocks: p.blocks.map((b) =>
      b.subject === "reading"
        ? { ...b, questions: [...b.questions, wrong] }
        : b,
    ),
  };
  assert(
    !restoreDailyTeaching(legacy, {})
      .blocks.find((b) => b.subject === "reading")!
      .questions.some((q) => q.id === wrong.id),
  );
  assert(
    restoreDailyTeaching(legacy, { [wrong.id]: wrong.answer })
      .blocks.find((b) => b.subject === "reading")!
      .historicalQuestions?.some((q) => q.id === wrong.id),
  );
  assert.deepEqual(
    restoreDailyTeaching(legacy, {}).blocks.find(
      (b) => b.subject === "reading",
    )!.lesson.sections,
    reading.lesson.sections,
  );
});

test("each segment advances lesson, matching drill, next lesson and final review before the next subject", () => {
  const p = makeDailyPlan("qa", "2026-10-06", settings, 0);
  const answers: Record<string, number> = {};
  const lessons: string[] = [];
  for (const block of p.blocks) {
    for (const unit of blockUnits(block)) {
      const teaching = dailyStep(p, answers, lessons);
      assert.equal(teaching.kind, "lesson");
      assert.equal(teaching.kind === "lesson" && teaching.unit.id, unit.id);
      lessons.push(unit.id);
      for (const q of unit.questions) {
        const drill = dailyStep(p, answers, lessons);
        assert.equal(drill.kind, "drill");
        assert.equal(drill.kind === "drill" && drill.question.id, q.id);
        answers[q.id] = q.answer;
      }
    }
    for (const q of block.reviewQuestions ?? []) {
      const mixed = dailyStep(p, answers, lessons);
      assert.equal(mixed.kind === "drill" && mixed.question.id, q.id);
      assert(
        !blockUnits(block).some((u) =>
          u.questions.some((taught) => taught.id === q.id),
        ),
      );
      assert.equal(q.phase, "review");
      answers[q.id] = q.answer;
    }
    const review = dailyStep(p, answers, lessons);
    assert.equal(review.kind, "review");
    assert.equal(
      review.kind === "review" && review.block.subject,
      block.subject,
    );
    lessons.push(`review:${block.subject}`);
  }
  assert(dailyComplete(p, answers, lessons));
});

test("missed review skills return as targeted fresh practice while the course advances", () => {
  const first = makeDailyPlan(
    "qa",
    "2026-10-06",
    { ...settings, minutesPerDay: 90 },
    0,
  );
  const answers = Object.fromEntries(
    first.blocks.flatMap((b) => b.questions.map((q) => [q.id, q.answer])),
  );
  const missed = first.blocks[2].reviewQuestions![0];
  answers[missed.id] = (missed.answer + 1) % 4;
  const focus = dailyFocus(first, answers);
  const expected = `math:${missed.topic}:skill:${missed.skillId}`;
  assert(focus!.math!.includes(expected));
  assert.deepEqual(focus?.english, []);
  const coveredUnits = first.blocks
    .flatMap(blockUnits)
    .map((u) => u.courseId ?? u.id);
  const next = selectDailyPlan(
    { ...first, complete: true, nextFocus: focus },
    "qa",
    "2026-10-07",
    { ...settings, minutesPerDay: 90 },
    false,
    {
      testDate: "2027-06-12",
      coveredUnits,
      seenQuestions: Object.keys(answers),
    },
  );
  const math = next.blocks.find((b) => b.subject === "math")!;
  assert(
    blockUnits(math).every((u) => !coveredUnits.includes(u.courseId ?? u.id)),
  );
  const reviewed = math.reviewUnits!.find((u) => u.skillId === missed.skillId)!;
  assert(reviewed);
  const fresh = math.reviewQuestions!.filter(
    (q) => q.reviewUnitId === reviewed.id,
  );
  assert(fresh.length);
  assert(fresh.every((q) => q.skillId === missed.skillId));
  assert(
    !Object.hasOwn(answers, fresh[0].id),
    "The remaining fresh transfer question precedes retention review",
  );
});

test("saved sessions regain their exact Science worked method without changing progress IDs", () => {
  const plan = makeDailyPlan("qa", "2026-10-06", settings, 0);
  const science = plan.blocks.find((b) => b.subject === "science")!;
  for (const unit of blockUnits(science)) {
    unit.lesson = structuredClone(unit.lesson);
    unit.lesson.sections.forEach((section) => {
      section.body = ["Obsolete teaching snapshot"];
      section.examples = [];
      section.activity = undefined;
    });
  }
  const updated = refreshDailyContent(plan);
  assert.equal(updated.id, plan.id);
  assert.deepEqual(
    updated.blocks.flatMap((b) => b.questions.map((q) => q.id)),
    plan.blocks.flatMap((b) => b.questions.map((q) => q.id)),
  );
  for (const unit of blockUnits(
    updated.blocks.find((b) => b.subject === "science")!,
  )) {
    const visible = dailyConcepts(unit).map((i) => unit.lesson.sections[i]);
    assert(
      visible.some(
        (s) => s.body.length && (s.examples?.length || s.evidence?.length),
      ),
    );
    assert(visible.some((s) => s.activity));
    assert(!visible.some((s) => s.body.includes("Obsolete teaching snapshot")));
  }
});

test("daily scopes preserve complete curriculum coverage and fit each displayed budget", () => {
  for (const minutesPerDay of [60, 75, 90])
    for (let sequence = 0; sequence < 60; sequence++) {
      const p = makeDailyPlan(
        "budget",
        "2026-10-06",
        { ...settings, minutesPerDay },
        sequence,
      );
      assert.equal(
        p.blocks.reduce((n, b) => n + b.minutes, 0),
        minutesPerDay,
      );
      for (const b of p.blocks) {
        assert(estimateDailyBlock(b) <= b.minutes);
        assert(blockUnits(b).length >= 1 && blockUnits(b).length <= 2);
      }
    }
});

test("every authored primary skill has a Daily scope with its explicit prerequisites and independent question pool", () => {
  for (const subject of DAILY_SUBJECTS) {
    const scopes = dailyScopes(subject);
    for (const skill of getLearningSkills(undefined, subject))
      assert(
        scopes.some(
          (s) => s.topic.slug === skill.topic && s.scope.skillId === skill.id,
        ),
        `${subject}:${skill.id} is unreachable in Daily Study`,
      );
    for (const { topic, scope } of scopes) {
      const full =
        subject === "english"
          ? englishLesson(topic.slug)
          : getLesson(topic.slug);
      const bank =
        subject === "english"
          ? englishDailyQuestions(topic.slug)
          : getQuestions(topic.slug);
      assert(
        scope.practice.length >= 2,
        `${scope.skillId}: needs distinct drill and review questions`,
      );
      assert.equal(new Set(scope.practice).size, scope.practice.length);
      for (const i of scope.sections)
        assert(
          full.sections[i],
          `${scope.skillId}: missing source section ${i}`,
        );
      for (const i of scope.practice) {
        const teaching = getQuestionTeaching(topic.slug, bank[i].id)!;
        assert.equal(teaching.skillId, scope.skillId);
        assert(
          teaching.teachingSections.every((source) =>
            scope.sections.includes(source),
          ),
          bank[i].id,
        );
      }
    }
  }
});

test("clause recognition and finite-verb repair only assign questions supported by their taught prerequisites", () => {
  for (const skillId of ["clause-recognition", "finite-main-verb"]) {
    const plan = planAtSkill("english", skillId);
    const unit = blockUnits(plan.blocks[0])[0];
    assert.equal(unit.skillId, skillId);
    for (const q of unit.questions) {
      const teaching = getQuestionTeaching(unit.topic, q.id)!;
      assert.equal(teaching.skillId, skillId);
      assert(
        teaching.teachingSections.every((i) =>
          unit.sectionIndices!.includes(i),
        ),
      );
    }
    if (skillId === "clause-recognition") {
      assert.deepEqual(unit.sectionIndices, [0]);
      assert(unit.questions.every((q) => q.id.startsWith("daily-clauses-")));
      assert(
        !unit.questions.some((q) =>
          q.questionText.includes("grammatically acceptable"),
        ),
      );
    }
  }
});

test("English Daily scopes use precise primary skills and keep broad legacy checks out of focused lessons", () => {
  const scopes = dailyScopes("english");
  assert.equal(new Set(scopes.map((s) => s.id)).size, scopes.length);
  for (const { topic, scope, id } of scopes) {
    assert.equal(id, `english:${topic.slug}:skill:${scope.skillId}`);
    const skill = getLearningSkill(topic.slug, scope.skillId!)!;
    const focused = focusLesson(
      { ...englishLesson(topic.slug), check: [] },
      {
        ...skill,
        sections: scope.sections,
      },
    );
    assert.equal(focused.title, scope.title);
    assert.deepEqual(focused.check, []);
    assert(focused.sections.some((s) => s.body.length));
    assert(
      focused.sections.some((s) => s.activity),
      `${id}: needs a separate try-it`,
    );
  }
});

test("English course difficulty follows the baseline and goal without assuming an unknown score", () => {
  for (const english of [null, 20, 32]) {
    const plan = makeDailyPlan(
      "english-level",
      "2026-10-14",
      { ...settings, scores: { ...settings.scores, english } },
      0,
      undefined,
      [],
      {},
      { testDate: "2027-06-12", targetScore: 36, coveredUnits: [] },
    );
    const unit = blockUnits(plan.blocks[0])[0];
    if (english === 32) assert.equal(unit.questions[0].difficulty, "hard");
    else if (english === 20) assert.equal(unit.questions[0].difficulty, "easy");
    else assert.equal(unit.skillId, "clause-recognition");
  }
});

test("English repair preserves non-English work and historical answers in a saved session", () => {
  const old = makeDailyPlan("upgrade", "2026-10-06", settings, 0);
  old.formatVersion = 5;
  const q = old.blocks[0].questions[0];
  const updated = restoreDailyTeaching(old, { [q.id]: q.answer }, settings);
  assert.equal(updated.id, old.id);
  assert.deepEqual(updated.blocks.slice(1), old.blocks.slice(1));
  assert(updated.blocks[0].questions.some((item) => item.id === q.id));
  assert.equal(
    updated.blocks.reduce((n, b) => n + b.minutes, 0),
    old.minutes,
  );
});
test("saved broad English plans migrate to their pending skill while retaining original answer and concept positions", () => {
  const fixture = legacyFixtures.cases.find(
    (f) => f.subject === "english" && f.partial,
  )!;
  const plan = structuredClone(fixture.plan) as unknown as DailyPlan;
  const answers = fixture.answers as Record<string, number>;
  const previous = blockUnits(plan.blocks[0]);
  const refreshed = refreshDailyContent(plan, answers);
  for (const unit of blockUnits(refreshed.blocks[0])) {
    const original = previous.find((u) => u.id === unit.id)!;
    assert(original);
    assert.deepEqual(
      unit.sectionIndices!.slice(0, original.sectionIndices!.length),
      original.sectionIndices,
    );
    assert(unit.skillId);
    assert(
      unit.questions
        .filter((q) => !Object.hasOwn(answers, q.id))
        .every((q) => q.skillId === unit.skillId),
    );
  }
  for (const id of Object.keys(answers))
    assert(refreshed.blocks[0].questions.some((q) => q.id === id));
  assert.equal(refreshed.id, plan.id);
  assert.deepEqual(refreshDailyContent(refreshed, answers), refreshed);
});

test("the smallest budget eventually covers every English skill without skipping deferred lessons", () => {
  const scopes = dailyScopes("english");
  const covered = new Set(
    courseIds().filter((id) => !id.startsWith("english:")),
  );
  const start = "2026-10-06";
  const testDate = addDays(start, scopes.length + 2);
  for (
    let day = 0;
    day < scopes.length && scopes.some((s) => !covered.has(s.id));
    day++
  ) {
    const plan = makeDailyPlan(
      "cursor",
      addDays(start, day),
      { ...settings, minutesPerDay: 60 },
      day,
      undefined,
      [],
      {},
      { testDate, coveredUnits: [...covered] },
    );
    assert.equal(
      plan.blocks.reduce((n, b) => n + b.minutes, 0),
      60,
    );
    const english = plan.blocks[0];
    assert(estimateDailyBlock(english) <= english.minutes);
    for (const unit of blockUnits(english)) {
      const id = unit.courseId ?? unit.id;
      assert(!covered.has(id), `${id} repeated before the course finished`);
      covered.add(id);
    }
  }
  for (const scope of scopes) assert(covered.has(scope.id), scope.id);
});

test("actual format-5 saved plans retain their budget, other subjects, answered history and deferred English position", () => {
  for (const fixture of format5Fixtures.cases) {
    const old = fixture.plan as unknown as DailyPlan;
    const updated = restoreDailyTeaching(
      old,
      fixture.answers as unknown as Record<string, number>,
      fixture.settings,
    );
    const english = updated.blocks[0];
    assert(estimateDailyBlock(english) <= english.minutes);
    assert.deepEqual(updated.blocks.slice(1), old.blocks.slice(1));
    assert.equal(updated.id, old.id);
    assert.equal(
      updated.blocks.reduce((n, b) => n + b.minutes, 0),
      old.minutes,
    );
    for (const id of Object.keys(fixture.answers))
      assert(
        [...english.questions, ...(english.historicalQuestions ?? [])].some(
          (q) => q.id === id,
        ),
      );
    assert.equal(
      updated.nextCurriculumPositions?.english,
      updated.curriculumPositions!.english! + blockUnits(english).length,
    );
  }
});

test("a compact focused migration fits a small saved allocation and replaces an obsolete cursor without skipping its taught unit", () => {
  const old = structuredClone(
    format5Fixtures.cases[1].plan,
  ) as unknown as DailyPlan;
  old.blocks[0].minutes = 5;
  old.nextCurriculumPositions = { english: 999, science: 17 };
  const updated = restoreDailyTeaching(
    old,
    {},
    format5Fixtures.cases[1].settings,
  );
  assert(blockUnits(updated.blocks[0])[0].skillId);
  assert(estimateDailyBlock(updated.blocks[0]) <= 5);
  assert.equal(
    updated.nextCurriculumPositions?.english,
    updated.curriculumPositions!.english! +
      blockUnits(updated.blocks[0]).length,
  );
  assert.equal(updated.nextCurriculumPositions?.science, 17);
});

test("saved interpolation prerequisites append without changing prior completion positions", () => {
  const plan = planAtSkill(
    "science",
    "science-trends-interpolation-interpolate",
  );
  const block = plan.blocks.find((b) => b.subject === "science")!;
  plan.blocks = [block];
  const unit = blockUnits(block)[0];
  block.units = [unit];
  unit.id = "science:science-trends-interpolation:scope:legacy";
  unit.skillId = undefined;
  unit.sectionIndices = [5, 6];
  unit.lesson = {
    ...unit.lesson,
    sections: [
      getLesson(unit.topic).sections[5],
      getLesson(unit.topic).sections[6],
    ],
  };
  unit.questions = [
    "science-trends-interpolation-3",
    "science-trends-interpolation-6",
  ].map((id) => ({ ...getQuestion(id)!, phase: "drill" as const }));
  unit.practiceIds = unit.questions.map((q) => q.id);
  block.questions = unit.questions;
  block.reviewQuestions = [];
  const answers = { [unit.questions[0].id]: unit.questions[0].answer };
  const completed = [unit.id, `${unit.id}:concept:0`, `${unit.id}:concept:1`];
  const updated = refreshDailyContent(plan, answers);
  const repaired = blockUnits(updated.blocks[0])[0];
  assert.deepEqual(repaired.sectionIndices, [5, 6, 1]);
  assert.deepEqual(repaired.requiredConceptIndices, [2]);
  assert.equal(dailyStep(updated, answers, completed).kind, "lesson");
  completed.push(`${unit.id}:concept:2`);
  assert.equal(dailyStep(updated, answers, completed).kind, "drill");
  assert.deepEqual(refreshDailyContent(updated, answers), updated);
});

test("a revised circle method requires a new checkpoint even after its old lesson was completed", () => {
  const plan = planAtSkill("math", "math-geometry-arc-and-sector");
  const block = plan.blocks.find((b) => b.subject === "math")!;
  plan.blocks = [block];
  const unit = blockUnits(block)[0];
  block.units = [unit];
  const source = unit.sectionIndices![0];
  unit.lesson = structuredClone(unit.lesson);
  delete unit.lesson.sections[0].teachingRevision;
  unit.lesson.sections[0].body = [
    "An older method without the central-angle fraction.",
  ];
  const updated = refreshDailyContent(plan);
  const repaired = blockUnits(updated.blocks[0])[0];
  assert.deepEqual(repaired.sectionIndices, [source, source]);
  assert.deepEqual(repaired.requiredConceptIndices, [1]);
  assert.deepEqual(dailyConcepts(repaired), [1]);
  assert.equal(
    dailyStep(updated, {}, [unit.id, `${unit.id}:concept:0`]).kind,
    "lesson",
  );
  assert.deepEqual(
    repaired.lesson.sections[1].body,
    getLesson(unit.topic).sections[source].body,
  );
  assert.deepEqual(refreshDailyContent(updated), updated);
});

test("editorial lesson updates refresh in place without requiring duplicate concepts", () => {
  const plan = makeDailyPlan("editorial", "2026-10-12", settings, 0);
  const math = plan.blocks.find((block) => block.subject === "math")!;
  const unit = blockUnits(math)[0];
  const indices = [...unit.sectionIndices!];
  unit.lesson = structuredClone(unit.lesson);
  unit.lesson.sections[0].body = ["Older, longer wording for the same method."];
  const updated = refreshDailyContent(plan);
  const refreshed = blockUnits(
    updated.blocks.find((block) => block.subject === "math")!,
  )[0];
  assert.deepEqual(refreshed.sectionIndices, indices);
  assert.deepEqual(refreshed.requiredConceptIndices, []);
  assert.deepEqual(
    refreshed.lesson.sections[0].body,
    getLesson(unit.topic).sections[indices[0]].body,
  );
  const lessons = [
    unit.id,
    ...indices.map((_, index) => `${unit.id}:concept:${index}`),
  ];
  assert.equal(
    dailyStep(
      {
        ...updated,
        blocks: [updated.blocks.find((block) => block.subject === "math")!],
      },
      {},
      lessons,
    ).kind,
    "drill",
  );
});

test("saved prerequisite repair fits the complete migration path inside the original clock", () => {
  for (const fixture of format5Fixtures.cases) {
    const old = fixture.plan as unknown as DailyPlan;
    const answers = fixture.answers as unknown as Record<string, number>;
    const repaired = refreshDailyContent(
      restoreDailyTeaching(old, answers, fixture.settings),
      answers,
    );
    assert.equal(repaired.id, old.id);
    assert.equal(repaired.minutes, old.minutes);
    assert.equal(
      repaired.blocks.reduce((n, b) => n + b.minutes, 0),
      old.minutes,
    );
    for (const block of repaired.blocks)
      assert(
        estimateDailyBlock(block, answers) <= block.minutes,
        `${block.subject} remaining work exceeds its allocation`,
      );
    for (const id of Object.keys(answers))
      assert(
        repaired.blocks.some((block) =>
          [...block.questions, ...(block.historicalQuestions ?? [])].some(
            (q) => q.id === id,
          ),
        ),
      );
    assert.deepEqual(refreshDailyContent(repaired, answers), repaired);
  }
});

test("remaining-work budgets preserve partially and fully answered saved sessions", () => {
  for (const fixture of format5Fixtures.cases)
    for (const fraction of [0, 0.5, 1]) {
      const old = fixture.plan as unknown as DailyPlan;
      const answers = Object.fromEntries(
        old.blocks.flatMap((b) =>
          b.questions
            .slice(0, Math.ceil(b.questions.length * fraction))
            .map((q) => [q.id, q.answer]),
        ),
      );
      const repaired = refreshDailyContent(
        restoreDailyTeaching(old, answers, fixture.settings),
        answers,
      );
      for (const block of repaired.blocks) {
        assert(estimateDailyBlock(block, answers) <= block.minutes);
        assert.equal(
          block.estimatedMinutes,
          estimateDailyBlock(block, answers),
        );
      }
      assert.equal(
        repaired.blocks.reduce((n, b) => n + b.minutes, 0),
        old.minutes,
      );
      for (const id of Object.keys(answers))
        assert(
          repaired.blocks.some((b) =>
            [...b.questions, ...(b.historicalQuestions ?? [])].some(
              (q) => q.id === id,
            ),
          ),
        );
      assert.deepEqual(refreshDailyContent(repaired, answers), repaired);
    }
});

test("misses become review questions while the next day teaches uncovered scopes", () => {
  const first = makeDailyPlan(
    "coverage",
    "2026-10-08",
    { ...settings, minutesPerDay: 90 },
    0,
  );
  const coveredUnits = first.blocks
    .flatMap(blockUnits)
    .map((unit) => unit.courseId ?? unit.id);
  const wrong = Object.fromEntries(
    first.blocks
      .flatMap((block) => block.questions)
      .map((question) => [question.id, (question.answer + 1) % 4]),
  );
  const focus = dailyFocus(first, wrong);
  const next = selectDailyPlan(
    { ...first, complete: true, nextFocus: focus },
    "coverage",
    "2026-10-09",
    { ...settings, minutesPerDay: 90 },
    false,
    {
      testDate: "2026-11-17",
      coveredUnits,
      seenQuestions: first.blocks.flatMap((block) =>
        block.questions.map((question) => question.id),
      ),
    },
  );
  for (const block of next.blocks) {
    assert(
      blockUnits(block).every(
        (unit) => !coveredUnits.includes(unit.courseId ?? unit.id),
      ),
    );
    assert(
      block.reviewUnits?.length,
      `${block.subject}: old skill should be a review drill`,
    );
    const weak = block.reviewUnits![0];
    assert(
      block.reviewQuestions?.some((question) =>
        weak.practiceIds!.includes(question.id),
      ),
    );
  }
  const correct = Object.fromEntries(
    next.blocks
      .flatMap((block) => block.questions)
      .map((question) => [question.id, question.answer]),
  );
  const lessons = next.blocks.flatMap((block) => [
    ...blockUnits(block).map((unit) => unit.id),
    dailyReviewKey(block),
  ]);
  assert(dailyComplete(next, correct, lessons));
  const remaining = dailyFocus(next, correct);
  for (const block of next.blocks) {
    for (const key of focus?.[block.subject] ?? [])
      assert(
        remaining?.[block.subject]?.includes(key),
        "A single untimed review answer does not resolve a weak skill",
      );
  }
  const reading = next.blocks.find((block) => block.subject === "reading")!;
  const reviewed = reading.reviewUnits![0];
  const freshReview = reading.reviewQuestions!.filter(
    (question) => question.reviewUnitId === reviewed.id,
  );
  assert.equal(freshReview.length, 2);
  assert(
    freshReview.every(
      (question) => !next.previouslyAnsweredQuestions!.includes(question.id),
    ),
  );
  assert(
    !dailyFocus(
      next,
      correct,
      Object.fromEntries(
        next.blocks
          .flatMap((block) => block.questions)
          .map((question) => [question.id, 25000]),
      ),
    )!.reading!.includes(reviewed.courseId ?? reviewed.id),
  );
  assert(
    next.blocks.every((block) => estimateDailyBlock(block) <= block.minutes),
  );
});

test("the complete focused curriculum finishes with sufficient days without repeating new lessons or exceeding the budget", () => {
  const total = courseIds();
  const days =
    Math.max(...DAILY_SUBJECTS.map((subject) => dailyScopes(subject).length)) +
    5;
  const start = "2026-10-08";
  for (const minutesPerDay of [75, 90]) {
    const covered = new Set<string>();
    let focus: DailyPlan["nextFocus"];
    for (let day = 0; day < days && covered.size < total.length; day++) {
      const plan = makeDailyPlan(
        "deadline",
        addDays(start, day),
        { ...settings, minutesPerDay },
        day,
        focus,
        [],
        {},
        { testDate: addDays(start, days), coveredUnits: [...covered] },
      );
      const refreshed = refreshDailyContent(plan);
      assert.equal(
        refreshed.blocks.reduce((sum, b) => sum + b.minutes, 0),
        minutesPerDay,
      );
      for (const block of refreshed.blocks) {
        assert(
          estimateDailyBlock(block) <= block.minutes,
          `${minutesPerDay}/${day}/${block.subject}`,
        );
        for (const unit of blockUnits(block)) {
          const id = unit.courseId ?? unit.id;
          if (!block.reviewOnly)
            assert(!covered.has(id), `${id} repeated as a new lesson`);
          covered.add(id);
        }
      }
      focus = dailyFocus(
        refreshed,
        Object.fromEntries(
          refreshed.blocks
            .flatMap((b) => b.questions)
            .map((q) => [q.id, (q.answer + 1) % 4]),
        ),
      );
    }
    for (const id of total)
      assert(covered.has(id), `${minutesPerDay}: ${id} missing`);
  }
});

test("a near test date reports the focused curriculum shortfall while a sufficient horizon forecasts real coverage", () => {
  const coveredUnits: string[] = [];
  const start = "2026-10-08";
  const close = { testDate: addDays(start, 2), coveredUnits };
  const far = { testDate: addDays(start, 180), coveredUnits };
  const nearPlan = makeDailyPlan(
    "date",
    start,
    settings,
    0,
    undefined,
    [],
    {},
    close,
  );
  const farPlan = makeDailyPlan(
    "date",
    start,
    settings,
    0,
    undefined,
    [],
    {},
    far,
  );
  assert(
    nearPlan.blocks.flatMap(blockUnits).length >
      farPlan.blocks.flatMap(blockUnits).length,
  );
  for (const minutesPerDay of [60, 75, 90]) {
    const study = { ...settings, minutesPerDay };
    const plan = makeDailyPlan(
      "date",
      start,
      study,
      0,
      undefined,
      [],
      {},
      close,
    );
    const shortfall = dailyCoverage(plan, study, close, start);
    assert.equal(shortfall.onTrack, false);
    assert.equal(shortfall.finishDate, null);
    assert.equal(shortfall.requiredMinutes, null);
    assert.equal(
      dailyCoverage(plan, study, close, close.testDate).onTrack,
      false,
    );
  }
  const adequate = dailyCoverage(farPlan, settings, far, start);
  assert(adequate.onTrack);
  assert(adequate.finishDate! < far.testDate);
});

test("a larger budget cannot add another session after today's completed lesson", () => {
  const today = "2026-10-16";
  const course = {
    testDate: "2026-10-17",
    coveredUnits: DAILY_SUBJECTS.flatMap((subject) =>
      dailyScopes(subject)
        .filter(
          (_, index, scopes) =>
            subject !== "english" || index < scopes.length - 1,
        )
        .map((scope) => scope.id),
    ),
  };
  const plan = {
    ...makeDailyPlan("finished", today, settings, 0),
    complete: true,
  };
  const coverage = dailyCoverage(
    plan,
    { ...settings, minutesPerDay: 60 },
    course,
    today,
  );
  assert.equal(coverage.onTrack, false);
  assert.equal(coverage.finishDate, null);
  assert.equal(coverage.requiredMinutes, null);
});

test("upgrading a session never lets its saved answers satisfy newly assigned weak-skill reviews", () => {
  const scope = dailyScopes("math")[0];
  const first = makeDailyPlan("saved", "2026-10-08", settings, 0);
  const answeredQuestions = blockUnits(first.blocks[2])[0].practiceIds!;
  const course = {
    testDate: "2026-11-17",
    coveredUnits: first.blocks
      .flatMap(blockUnits)
      .map((unit) => unit.courseId ?? unit.id),
    answeredQuestions,
  };
  const next = makeDailyPlan(
    "saved",
    "2026-10-09",
    settings,
    1,
    { math: [scope.id] },
    answeredQuestions,
    {},
    course,
  );
  assert(
    next.blocks[2].reviewQuestions!.every(
      (question) => !answeredQuestions.includes(question.id),
    ),
  );
  assert(
    next.nextFocus?.math?.includes(scope.id),
    "exhausted reviews must stay queued for another session",
  );
});

test("answering focused drills never promotes scheduled review questions on a later refresh", () => {
  const modern = refreshDailyContent(
    makeDailyPlan(
      "stable-modern",
      "2026-10-14",
      settings,
      0,
      undefined,
      [],
      {},
      { testDate: "2027-06-12", targetScore: 36, coveredUnits: [] },
    ),
  );
  const fixture = legacyFixtures.cases.find(
    (c) => c.subject === "math" && c.partial,
  )!;
  const migrated = refreshDailyContent(
    fixture.plan as unknown as DailyPlan,
    fixture.answers as unknown as Record<string, number>,
  );
  for (const plan of [modern, migrated]) {
    const assignment = (p: DailyPlan) =>
      p.blocks.map((block) => ({
        subject: block.subject,
        units: blockUnits(block).map((unit) => ({
          id: unit.id,
          questions: unit.questions.map((q) => q.id),
          sourceIndices: unit.sectionIndices,
          visible: dailyConcepts(unit),
          required: unit.requiredConceptIndices,
        })),
        review: block.reviewQuestions?.map((q) => q.id),
      }));
    const baseline = assignment(plan);
    const answers: Record<string, number> = {};
    for (const block of plan.blocks) {
      for (const unit of blockUnits(block)) {
        for (const q of unit.questions) {
          answers[q.id] = q.answer;
          assert.deepEqual(
            assignment(refreshDailyContent(plan, answers)),
            baseline,
            `${unit.id}: answering ${q.id} cannot change the next visible assignment`,
          );
        }
      }
    }
  }
});

test("identical repaired Reading methods inherit a real visible completion without repeating the lesson", () => {
  const fixture = legacyFixtures.cases.find(
    (c) => c.subject === "math" && c.partial,
  )!;
  const plan = refreshDailyContent(
    fixture.plan as unknown as DailyPlan,
    fixture.answers as unknown as Record<string, number>,
  );
  const reading = plan.blocks.find((b) => b.subject === "reading")!;
  plan.blocks = [reading];
  const [first, next] = blockUnits(reading);
  assert.equal(first.skillId, next.skillId);
  const source = dailyConcepts(first)[0],
    target = dailyConcepts(next)[0];
  assert.deepEqual(first.lesson.sections[source], next.lesson.sections[target]);
  const completed = [first.id, `${first.id}:concept:${source}`];
  const answers = Object.fromEntries(
    first.questions.map((q) => [q.id, q.answer]),
  );
  const restored = readingConceptProgress(plan, completed);
  assert(restored.includes(`${next.id}:concept:${target}`));
  assert(restored.includes(next.id));
  const step = dailyStep(plan, answers, restored);
  assert.equal(step.kind, "drill");
  assert(step.kind === "drill");
  assert.equal(step.unit.id, next.id);
  assert.equal(step.question.skillId, first.skillId);
  assert(
    !readingConceptProgress(plan, [first.id]).includes(
      `${next.id}:concept:${target}`,
    ),
  );

  const check = (mutate: (copy: DailyPlan) => void) => {
    const copy = structuredClone(plan);
    mutate(copy);
    assert(
      !readingConceptProgress(copy, completed).includes(
        `${next.id}:concept:${target}`,
      ),
    );
  };
  check((p) => {
    blockUnits(p.blocks[0])[0].focusedConceptIndices = [0];
  });
  check((p) => {
    blockUnits(p.blocks[0])[0].skillId = "reading-main-idea-thesis";
  });
  check((p) => {
    blockUnits(p.blocks[0])[0].lesson.sections[source].teachingRevision = 2;
  });
  check((p) => {
    blockUnits(p.blocks[0])[0].sectionIndices![source] = 1;
  });

  const covered = structuredClone(plan);
  covered.blocks[0].units = [blockUnits(covered.blocks[0])[1]];
  covered.course = { testDate: "2027-06-12", coveredUnits: [first.courseId!] };
  const targetUnit = blockUnits(covered.blocks[0])[0];
  assert(
    !readingConceptProgress(covered, []).includes(
      `${next.id}:concept:${target}`,
    ),
    "Past course coverage cannot satisfy newly required teaching",
  );
  targetUnit.requiredConceptIndices = [];
  assert(
    readingConceptProgress(covered, []).includes(
      `${next.id}:concept:${target}`,
    ),
  );
  targetUnit.skillId = "reading-main-idea-thesis";
  assert(
    !readingConceptProgress(covered, []).includes(
      `${next.id}:concept:${target}`,
    ),
    "A different skill using the same reference section still needs its own activity",
  );
});
