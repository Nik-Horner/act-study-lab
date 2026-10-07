import { DAILY_CURRICULUM } from "../src/lib/daily-curriculum";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeDailyPlan,
  dailyBudget,
  dailyComplete,
  dailyDate,
  dailyId,
  DAILY_SUBJECTS,
  selectDailyPlan,
  restoreDailyTeaching,
  refreshDailyContent,
  estimateDailyBlock,
} from "../src/lib/daily-plan";
import {
  getExamQuestions,
  getExams,
  getLesson,
  getQuestion,
} from "../src/lib/act/content";
import { blockUnits, dailyStep, dailyFocus } from "../src/lib/daily-flow";
import { getLesson as englishLesson } from "../src/lib/content";
import { validateStudySettings } from "../src/lib/account-settings";
const settings = {
  scores: { english: 32, math: 34, reading: null, science: 27 },
  minutesPerDay: 75,
};
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
    assert.equal(blockUnits(b).length, 2);
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

test("missed work resumes without doubling the next day and completion advances only tomorrow", () => {
  const p = makeDailyPlan("qa", "2026-10-06", settings, 0);
  assert.equal(selectDailyPlan(p, "qa", "2026-10-09", settings), p);
  const completed = { ...p, complete: true, completedDate: "2026-10-09" };
  assert.equal(
    selectDailyPlan(completed, "qa", "2026-10-09", settings),
    completed,
  );
  const next = selectDailyPlan(completed, "qa", "2026-10-10", settings);
  assert.equal(next.sequence, 1);
  assert.equal(next.minutes, 75);
  assert.equal(next.blocks.length, 4);
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
      .questions.some((q) => q.id === wrong.id),
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
        assert.equal(blockUnits(b).length, 2);
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
