import { DAILY_CURRICULUM } from "../src/lib/daily-curriculum";
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
} from "../src/lib/act/content";
import {
  blockUnits,
  dailyStep,
  dailyFocus,
  dailyReviewKey,
  readingConceptProgress,
} from "../src/lib/daily-flow";
import { getLesson as englishLesson } from "../src/lib/content";
import { validateStudySettings } from "../src/lib/account-settings";
const settings = {
  scores: { english: 32, math: 34, reading: null, science: 27 },
  minutesPerDay: 75,
};
test("Reading scopes teach each section once and have distinct lesson titles", () => {
  for (const topic of new Set(
    dailyScopes("reading").map((s) => s.topic.slug),
  )) {
    const sections = DAILY_CURRICULUM[topic].flatMap((s) => s.sections);
    assert.equal(new Set(sections).size, sections.length, topic);
    assert.deepEqual(
      [...sections].sort(),
      getLesson(topic).sections.map((_, i) => i),
    );
  }
  const titles = new Set<string>();
  for (let reading = 0; reading < dailyScopes("reading").length; reading++) {
    const plan = makeDailyPlan(
      "reading-titles",
      "2026-10-14",
      settings,
      reading,
      undefined,
      [],
      { reading },
    );
    const unit = blockUnits(
      plan.blocks.find((b) => b.subject === "reading")!,
    )[0];
    assert(!titles.has(unit.title), unit.title);
    titles.add(unit.title);
  }
});
test("refreshing a saved Reading lesson preserves concept positions and answers", () => {
  const plan = makeDailyPlan(
    "reading-saved",
    "2026-10-14",
    settings,
    0,
    undefined,
    [],
    { reading: 1 },
  );
  const unit = blockUnits(plan.blocks.find((b) => b.subject === "reading")!)[0];
  const full = getLesson(unit.topic);
  unit.sectionIndices = [1, 2, 3];
  unit.lesson.sections = unit.sectionIndices.map((i) => full.sections[i]);
  const answers = Object.fromEntries(
    plan.blocks.flatMap((b) => b.questions).map((q) => [q.id, q.answer]),
  );
  const refreshed = refreshDailyContent(plan, answers);
  const saved = blockUnits(
    refreshed.blocks.find((b) => b.subject === "reading")!,
  )[0];
  assert.equal(refreshed.id, plan.id);
  assert.equal(saved.id, unit.id);
  assert.equal(saved.title, `${full.title}: ${full.sections[2].heading}`);
  const progress = readingConceptProgress(
    {
      ...refreshed,
      course: {
        testDate: "2026-10-17",
        coveredUnits: [`reading:${unit.topic}:scope:0`],
      },
    },
    [],
  );
  assert(progress.includes(`${unit.id}:concept:0`));
  assert(!progress.includes(`${unit.id}:concept:1`));
  assert(!progress.includes(unit.id));
  assert.deepEqual(readingConceptProgress(refreshed, []), []);
  const reading = refreshed.blocks.find((b) => b.subject === "reading")!;
  const earlier = {
    ...saved,
    id: `${saved.id}:earlier`,
    sectionIndices: [1],
    lesson: { ...saved.lesson, sections: [full.sections[1]] },
  };
  const sameSession = {
    ...refreshed,
    blocks: [{ ...reading, units: [earlier, saved] }],
  };
  assert(
    readingConceptProgress(sameSession, [earlier.id]).includes(
      `${saved.id}:concept:0`,
    ),
  );
  assert(
    !readingConceptProgress(sameSession, []).includes(`${saved.id}:concept:0`),
  );
  const requiredSession = {
    ...refreshed,
    blocks: [
      {
        ...reading,
        units: [earlier, { ...saved, requiredConceptIndices: [0] }],
      },
    ],
  };
  assert(
    !readingConceptProgress(requiredSession, [earlier.id]).includes(
      `${saved.id}:concept:0`,
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
  assert.deepEqual(saved.sectionIndices, [1, 2, 3]);
  assert.deepEqual(
    saved.questions.map((q) => q.id),
    unit.questions.map((q) => q.id),
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
    assert(b.questions.length >= 3);
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
test("categories progress once per completed program and IDs are account scoped", () => {
  const a = makeDailyPlan("qa", "2026-10-06", settings, 0),
    b = makeDailyPlan("qa", "2026-10-07", settings, 1);
  assert(
    a.blocks.every(
      (block, i) => blockUnits(block)[0].id !== blockUnits(b.blocks[i])[0].id,
    ),
  );
  assert.notEqual(a.id, makeDailyPlan("another", "2026-10-06", settings, 0).id);
  assert.match(
    a.id,
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
      assert(b.questions.length >= 3);
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

test("saved sessions regain complete lessons without losing answered questions or changing the plan ID", () => {
  const p = makeDailyPlan("qa", "2026-10-06", settings, 0);
  const legacy = {
    ...p,
    formatVersion: undefined,
    blocks: p.blocks.map((b) => ({
      ...b,
      lesson: { ...b.lesson, sections: b.lesson.sections.slice(0, 1) },
    })),
  };
  const restored = restoreDailyTeaching(legacy, {});
  assert.equal(restored.id, p.id);
  assert.equal(restored.date, p.date);
  for (const b of restored.blocks)
    assert.deepEqual(
      b.lesson.sections,
      p.blocks.find((x) => x.subject === b.subject)!.lesson.sections,
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

test("missed review skills return in the next session with fresh practice", () => {
  const p = makeDailyPlan("qa", "2026-10-06", settings, 0);
  const answers = Object.fromEntries(
    p.blocks.flatMap((b) => b.questions.map((q) => [q.id, q.answer])),
  );
  const missed = p.blocks[2].reviewQuestions![0];
  answers[missed.id] = (missed.answer + 1) % 4;
  const nextFocus = dailyFocus(p, answers);
  assert.deepEqual(nextFocus?.math, [blockUnits(p.blocks[2])[0].id]);
  assert.deepEqual(nextFocus?.english, []);
  const next = selectDailyPlan(
    { ...p, complete: true, completedDate: p.date, nextFocus },
    "qa",
    "2026-10-07",
    settings,
  );
  assert.equal(blockUnits(next.blocks[2])[0].topic, missed.topic);
  assert(
    !p.blocks[2].questions.some(
      (q) =>
        q.id ===
        blockUnits(next.blocks[2])[0].questions.find(
          (q) => q.phase === "drill",
        )!.id,
    ),
  );
});

test("saved sessions load corrected lessons and real worked-example evidence without changing progress IDs", () => {
  const p = makeDailyPlan("qa", "2026-10-06", settings, 0);
  const old = {
    ...p,
    blocks: p.blocks.map((b) =>
      b.subject === "science"
        ? {
            ...b,
            units: blockUnits(b).map((u) => ({
              ...u,
              lesson: {
                ...u.lesson,
                sections: u.lesson.sections.map((s) => ({
                  ...s,
                  evidence: undefined,
                })),
              },
            })),
          }
        : b,
    ),
  };
  const updated = refreshDailyContent(old);
  assert.equal(updated.id, p.id);
  assert.deepEqual(
    updated.blocks.flatMap((b) => b.questions.map((q) => q.id)),
    p.blocks.flatMap((b) => b.questions.map((q) => q.id)),
  );
  assert.equal(
    blockUnits(updated.blocks.find((b) => b.subject === "science")!)[0].lesson
      .sections[0].evidence?.[0].id,
    "science-drill-reservoir",
  );
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

test("every full lesson section has a scheduled teaching scope", () => {
  for (const [topic, scopes] of Object.entries(DAILY_CURRICULUM)) {
    const full =
      topic.startsWith("math-") ||
      topic.startsWith("science-") ||
      topic.startsWith("reading-")
        ? getLesson(topic)
        : englishLesson(topic);
    assert(full);
    const coverage = new Set(scopes.flatMap((s) => s.sections));
    full.sections.forEach((_, i) =>
      assert(coverage.has(i), `${topic}: section ${i} missing`),
    );
    scopes.forEach((s) => {
      assert(s.practice.length >= 3);
      assert.equal(new Set(s.practice).size, s.practice.length);
    });
  }
});

test("clause and fragment drills never introduce untaught joining punctuation", () => {
  const english = makeDailyPlan("alignment", "2026-10-06", settings, 0)
    .blocks[0];
  const units = blockUnits(english);
  assert.deepEqual(units[0].sectionIndices, [0]);
  assert.deepEqual(units[1].sectionIndices, [1]);
  assert(units[0].questions.every((q) => q.id.startsWith("daily-clauses-")));
  assert(units[1].questions.every((q) => q.id.startsWith("daily-fragments-")));
  assert(
    english.reviewQuestions!.every(
      (q) =>
        q.id.startsWith("daily-clauses-") ||
        q.id.startsWith("daily-fragments-"),
    ),
  );
  assert(
    !english.questions.some((q) =>
      q.questionText.includes("grammatically acceptable"),
    ),
  );
});

test("original English rules stay intact; sentence boundaries follow the previously taught foundations", () => {
  for (let sequence = 1; sequence < 30; sequence++) {
    const block = makeDailyPlan(
      "alignment",
      "2026-10-06",
      { ...settings, minutesPerDay: 90 },
      sequence,
    ).blocks[0];
    for (const unit of blockUnits(block)) {
      if (unit.questions.some((q) => !q.id.startsWith("daily-"))) {
        const original = englishLesson(unit.topic);
        if (unit.topic === "sentence-structure") {
          assert.deepEqual(unit.lesson.sections, original.sections.slice(2));
          assert.deepEqual(unit.lesson.check, []);
        } else {
          assert.deepEqual(unit.lesson.sections, original.sections);
          assert.deepEqual(unit.lesson.check, original.check);
        }
      }
    }
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

test("a deferred whole lesson remains next in the course instead of being skipped", () => {
  let plan = makeDailyPlan(
    "cursor",
    "2026-10-06",
    { ...settings, minutesPerDay: 60 },
    0,
  );
  const seen = new Set<string>();
  for (let day = 0; day < 40; day++) {
    blockUnits(plan.blocks[0]).forEach((u) => seen.add(u.topic));
    plan = { ...plan, complete: true, completedDate: plan.date };
    const nextDate = new Date(Date.UTC(2026, 9, 7 + day))
      .toISOString()
      .slice(0, 10);
    plan = selectDailyPlan(plan, "cursor", nextDate, {
      ...settings,
      minutesPerDay: 60,
    });
    assert.equal(
      plan.blocks.reduce((n, b) => n + b.minutes, 0),
      60,
    );
  }
  assert(seen.has("commas"));
  assert(seen.has("punctuation"));
  assert(seen.has("logical-placement"));
  assert.equal(seen.size, 14);
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

test("a migration-only foundation refresher does not skip an original lesson that cannot fit", () => {
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
  assert.equal(blockUnits(updated.blocks[0])[0].title, "Clauses and phrases");
  assert(estimateDailyBlock(updated.blocks[0]) <= 5);
  assert.equal(
    updated.nextCurriculumPositions?.english,
    updated.curriculumPositions?.english,
  );
  assert.equal(updated.nextCurriculumPositions?.science, 17);
});

test("saved interpolation prerequisites append without changing prior completion positions", () => {
  const plan = makeDailyPlan(
    "prerequisite",
    "2026-10-07",
    settings,
    0,
    undefined,
    [],
    { science: 7 },
  );
  const block = plan.blocks.find((b) => b.subject === "science")!;
  plan.blocks = [block];
  const unit = blockUnits(block)[0];
  assert.equal(unit.topic, "science-trends-interpolation");
  unit.sectionIndices = [5, 6];
  unit.lesson = {
    ...unit.lesson,
    sections: [
      getLesson(unit.topic).sections[5],
      getLesson(unit.topic).sections[6],
    ],
  };
  const answers = { [unit.questions[0].id]: unit.questions[0].answer };
  const completed = [unit.id, `${unit.id}:concept:0`, `${unit.id}:concept:1`];
  const updated = refreshDailyContent(plan, answers);
  const repaired = blockUnits(updated.blocks[0])[0];
  assert.deepEqual(repaired.sectionIndices, [5, 6, 1]);
  assert.deepEqual(repaired.requiredConceptIndices, [2]);
  const step = dailyStep(updated, answers, completed);
  assert.equal(step.kind, "lesson");
  assert.equal(step.kind === "lesson" && step.unit.id, unit.id);
  completed.push(`${unit.id}:concept:2`);
  assert.equal(dailyStep(updated, answers, completed).kind, "drill");
  assert.deepEqual(
    refreshDailyContent(updated, answers).blocks[0].units,
    updated.blocks[0].units,
  );
});

test("saved circle drills require the newly added formula even after lesson completion", () => {
  const plan = makeDailyPlan(
    "circle",
    "2026-10-07",
    settings,
    0,
    undefined,
    [],
    { math: 10 },
  );
  const block = plan.blocks.find((b) => b.subject === "math")!;
  plan.blocks = [block];
  const unit = blockUnits(block)[0];
  assert.equal(unit.topic, "math-geometry");
  unit.lesson = structuredClone(unit.lesson);
  delete unit.lesson.sections[0].teachingRevision;
  unit.lesson.sections[0].body = unit.lesson.sections[0].body.slice(0, 2);
  const updated = refreshDailyContent(plan);
  const repaired = blockUnits(updated.blocks[0])[0];
  assert.deepEqual(repaired.sectionIndices, [3, 3]);
  assert.deepEqual(repaired.requiredConceptIndices, [1]);
  assert.equal(
    dailyStep(updated, {}, [unit.id, `${unit.id}:concept:0`]).kind,
    "lesson",
  );
  assert(
    repaired.lesson.sections[1].body.some((p) => p.includes("arc length")),
  );
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

test("the course covers every authored scope before October 17 without repeating new lessons or exceeding the budget", () => {
  for (const minutesPerDay of [75, 90]) {
    const covered = new Set<string>();
    DAILY_SUBJECTS.forEach((subject) =>
      dailyScopes(subject)
        .slice(0, 2)
        .forEach((scope) => covered.add(scope.id)),
    );
    let focus: DailyPlan["nextFocus"];
    for (let day = 8; day < 17; day++) {
      const plan = makeDailyPlan(
        "deadline",
        `2026-10-${String(day).padStart(2, "0")}`,
        { ...settings, minutesPerDay },
        day,
        focus,
        [],
        {},
        { testDate: "2026-10-17", coveredUnits: [...covered] },
      );
      const refreshed = refreshDailyContent(plan);
      assert.equal(
        refreshed.blocks.reduce((sum, block) => sum + block.minutes, 0),
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
      const wrong = Object.fromEntries(
        refreshed.blocks
          .flatMap((block) => block.questions)
          .map((question) => [question.id, (question.answer + 1) % 4]),
      );
      focus = dailyFocus(refreshed, wrong);
    }
    for (const subject of DAILY_SUBJECTS)
      for (const scope of dailyScopes(subject))
        assert(covered.has(scope.id), `${minutesPerDay}: ${scope.id} missing`);
  }
});

test("a close test date changes daily coverage; impossible budgets are reported honestly", () => {
  const coveredUnits = DAILY_SUBJECTS.flatMap((subject) =>
    dailyScopes(subject)
      .slice(0, 2)
      .map((scope) => scope.id),
  );
  const close = { testDate: "2026-10-17", coveredUnits };
  const far = { ...close, testDate: "2026-11-17" };
  const nearPlan = makeDailyPlan(
    "date",
    "2026-10-08",
    settings,
    1,
    undefined,
    [],
    {},
    close,
  );
  const farPlan = makeDailyPlan(
    "date",
    "2026-10-08",
    settings,
    1,
    undefined,
    [],
    {},
    far,
  );
  assert(
    nearPlan.blocks.flatMap(blockUnits).length >
      farPlan.blocks.flatMap(blockUnits).length,
  );
  const adequate = dailyCoverage(nearPlan, settings, close, nearPlan.date);
  assert(adequate.onTrack);
  assert(adequate.finishDate! < close.testDate);
  const shortSettings = { ...settings, minutesPerDay: 60 };
  const shortPlan = makeDailyPlan(
    "date",
    "2026-10-08",
    shortSettings,
    1,
    undefined,
    [],
    {},
    close,
  );
  const short = dailyCoverage(shortPlan, shortSettings, close, shortPlan.date);
  assert.equal(short.onTrack, false);
  assert.equal(short.requiredMinutes, 75);
  assert.equal(
    dailyCoverage(shortPlan, shortSettings, close, "2026-10-17").onTrack,
    false,
  );
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
