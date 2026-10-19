import test from "node:test";
import assert from "node:assert/strict";
import {
  campaignCatalog,
  campaignMission,
  campaignMove,
  campaignRecordId,
  campaignSnapshot,
  campaignStars,
  newCampaignState,
  readCampaignState,
} from "../src/lib/campaign";
import { getExams, getQuestions } from "../src/lib/act/content";
import { getExam as englishExam } from "../src/lib/content";
import { groupParagraphs, parsePassage } from "../src/lib/passage";

const catalog = campaignCatalog();
const id = catalog[0].id;
test("campaign retains full context across many question families without exposing timed-test items", () => {
  assert.equal(catalog.length, 204);
  assert.equal(
    catalog.reduce((n, m) => n + m.count, 0),
    929,
  );
  const reserved = new Set(getExams().flatMap((e) => e.questionIds));
  const originals = new Map(
    getQuestions().map((q) => [q.id, JSON.stringify(q)]),
  );
  const ids = new Set<string>();
  const families = new Set<string>();
  const source = JSON.stringify([englishExam("exam-1"), englishExam("exam-2")]);
  for (const m of catalog) {
    assert(!ids.has(m.id));
    ids.add(m.id);
    for (const q of campaignMission(m.id)!.questions) {
      assert(!reserved.has(q.id));
      families.add(q.topic);
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices).size, 4);
      assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
      assert(q.explanation.length > 40);
      if (m.subject !== "math") assert(q.englishPassage || q.passage);
      if (m.subject !== "english")
        assert.equal(
          originals.get(q.id),
          JSON.stringify(getQuestions().find((s) => s.id === q.id)),
        );
    }
  }
  assert(families.size >= 30, `${families.size} families`);
  assert.equal(
    JSON.stringify([englishExam("exam-1"), englishExam("exam-2")]),
    source,
  );
});
test("English missions keep paragraph context, valid NO CHANGE answers, and whole-passage decisions", () => {
  const missions = catalog.filter((m) => m.subject === "english");
  assert.equal(missions.length, 5);
  let keep = 0,
    change = 0,
    whole = 0;
  for (const m of missions)
    for (const q of campaignMission(m.id)!.questions) {
      const text = q.englishPassage!.html;
      assert(text.split(/\s+/).length > 170);
      assert(groupParagraphs(parsePassage(text)).length >= 4);
      if (q.choices[0] === "NO CHANGE") {
        if (q.answer === 0) keep++;
        else change++;
      }
      if (["logical-placement", "add-delete", "which-choice"].includes(q.topic))
        whole++;
    }
  assert(keep >= 6 && change >= 6 && whole >= 8);
});
test("future answer keys and explanations stay out of the public mission until a saved attempt", () => {
  const start = newCampaignState(id);
  const hidden = campaignSnapshot(id, start);
  assert(
    hidden.questions.every((q) => !("answer" in q) && !("explanation" in q)),
  );
  assert.deepEqual(hidden.feedback, []);
  const q = campaignMission(id)!.questions[0];
  const next = campaignMove(start, {
    action: "answer",
    revision: 0,
    choice: q.answer,
    seconds: 7,
  })!;
  assert.equal(campaignSnapshot(id, next).feedback.length, 1);
  assert.equal(campaignSnapshot(id, next).correct, 1);
  assert.deepEqual(start.answers, []);
});
test("original choices remain immutable through a miss, reload, stale tab, and completion", () => {
  const mission = campaignMission(id)!;
  let s = newCampaignState(id, "2026-10-17T10:00:00Z");
  assert.equal(campaignMove(s, { action: "next", revision: 0 }), null);
  const original = s;
  s = campaignMove(s, {
    action: "answer",
    revision: 0,
    choice: (mission.questions[0].answer + 1) % 4,
    seconds: 8.4,
  })!;
  assert.deepEqual(original.answers, []);
  assert.equal(s.answers[0].seconds, 8);
  assert.equal(
    campaignMove(s, {
      action: "answer",
      revision: 0,
      choice: mission.questions[0].answer,
      seconds: 1,
    }),
    null,
  );
  assert.equal(
    campaignMove(s, {
      action: "answer",
      revision: s.revision,
      choice: mission.questions[0].answer,
      seconds: 1,
    }),
    null,
  );
  assert.deepEqual(readCampaignState(JSON.parse(JSON.stringify(s))), s);
  for (let i = 0; i < mission.questions.length; i++) {
    if (!s.answers[i])
      s = campaignMove(s, {
        action: "answer",
        revision: s.revision,
        choice: mission.questions[i].answer,
        seconds: 4,
      })!;
    s = campaignMove(
      s,
      { action: "next", revision: s.revision },
      "2026-10-17T10:15:00Z",
    )!;
    assert(readCampaignState(s));
  }
  assert(s.completedAt);
  assert.equal(campaignSnapshot(id, s).correct, mission.questions.length - 1);
  assert.equal(campaignMove(s, { action: "next", revision: s.revision }), null);
  assert.equal(campaignMove(s, { action: "start" }), s);
});
test("corrupt snapshots and invalid moves cannot silently replace account progress", () => {
  const s = newCampaignState(id);
  for (const bad of [
    null,
    {},
    [],
    { ...s, version: 2 },
    { ...s, cursor: 1 },
    { ...s, revision: 3 },
    { ...s, completedAt: new Date().toISOString() },
    { ...s, answers: [{ choice: 9, seconds: 1 }] },
    { ...s, startedAt: "no date" },
  ])
    assert.equal(readCampaignState(bad), null);
  for (const choice of [-1, 4, 0.5, NaN])
    assert.equal(
      campaignMove(s, { action: "answer", revision: 0, choice, seconds: 1 }),
      null,
    );
  for (const seconds of [-1, Infinity, 86401])
    assert.equal(
      campaignMove(s, { action: "answer", revision: 0, choice: 0, seconds }),
      null,
    );
});
test("stars come from completed mission attempts with explicit thresholds and no replay farming", () => {
  assert.equal(campaignStars(8, 8, false), 0);
  assert.equal(campaignStars(0, 8, true), 1);
  assert.equal(campaignStars(3, 5, true), 2);
  assert.equal(campaignStars(4, 5, true), 2);
  assert.equal(campaignStars(7, 8, true), 3);
  assert.equal(campaignStars(0, 0, true), 0);
});
test("one stable record per account and mission prevents duplicate rewards across tabs", async () => {
  const first = await campaignRecordId("owner-a", id);
  assert.equal(await campaignRecordId("owner-a", id), first);
  assert.notEqual(await campaignRecordId("owner-b", id), first);
  assert.notEqual(await campaignRecordId("owner-a", catalog[1].id), first);
  assert.match(
    first,
    /^[a-f0-9]{8}-[a-f0-9]{4}-8[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  );
});
