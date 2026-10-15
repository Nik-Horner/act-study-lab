import { test } from "node:test";
import assert from "node:assert/strict";
import readingLessons from "../src/content/reading-lessons.json";
import scienceLessons from "../src/content/science-lessons.json";
import activities from "../src/content/lesson-activities.json";
import readingQuestions from "../src/content/reading-questions.json";
import sentenceStructure from "../src/content/lessons/sentence-structure.json";
import commas from "../src/content/lessons/commas.json";
import punctuation from "../src/content/lessons/punctuation.json";
import testPatterns from "../src/content/lessons/test-patterns.json";
import { getLesson, getTopics } from "../src/lib/content";

test("English retains teaching methods, examples, and checks in concise concepts", () => {
  for (const topic of getTopics()) {
    const lesson = getLesson(topic.slug);
    assert(lesson.check.length > 0);
    assert(lesson.sections.some((section) => section.examples?.length));
    for (const section of lesson.sections) {
      assert(section.body.length > 0);
      assert(
        section.body.join(" ").split(/\s+/).length <= 100,
        `${topic.slug}: ${section.heading}`,
      );
    }
  }
});

test("English rules include introductory phrases and explanatory clause joins", () => {
  const clauseMethods = sentenceStructure.sections[2].body.join(" ");
  assert.match(clauseMethods, /colon or dash/);
  assert.match(clauseMethods, /second clause that explains/);
  assert.match(clauseMethods, /She had one concern: the bridge was closed/);
  assert.match(commas.sections[0].body.join(" "), /clause, phrase, or word/);
  assert.match(
    commas.sections[0].tip,
    /After a long day at school, Maya rested/,
  );
  assert.match(
    punctuation.sections[5].body.join(" "),
    /another complete clause/,
  );
  for (const lesson of [sentenceStructure, commas, punctuation])
    assert.doesNotMatch(
      JSON.stringify(lesson),
      /exactly five|only when it does one of four/,
    );
});

test("generic test-day teaching does not invent a learner history or score prediction", () => {
  assert.doesNotMatch(
    JSON.stringify(testPatterns),
    /your misses|your practice test|gap between a 31 and a 36|one time in four/i,
  );
});

test("Reading keeps complete examples while making each concept short and specific", () => {
  const paragraphs = new Set<string>();
  for (const lesson of readingLessons) {
    assert.equal(
      lesson.sections.length,
      7,
      "saved concept positions stay stable",
    );
    assert.equal(lesson.check.length, 3);
    assert.equal(lesson.sections.flatMap((s) => s.examples ?? []).length, 7);
    for (const section of lesson.sections) {
      assert(section.body.join(" ").split(/\s+/).length <= 100);
      for (const paragraph of section.body) {
        assert(
          !paragraphs.has(paragraph),
          "do not repeat generic method filler",
        );
        paragraphs.add(paragraph);
      }
      for (const example of section.examples ?? []) {
        const [passage, task] = example.text.split("\n\nQuestion:");
        assert(
          passage.split(/\s+/).length >= 30,
          `${lesson.slug}: worked excerpts must supply the full local evidence`,
        );
        assert(task, `${lesson.slug}: worked example needs a concrete question`);
        const choices = [...task.matchAll(/^[ABC]\. (.+)$/gm)].map((match) => match[1]);
        assert.equal(choices.length, 3, `${lesson.slug}: worked task choices`);
        assert.equal(new Set(choices).size, 3, `${lesson.slug}: distinct worked alternatives`);
        const answer = task.match(/Supported answer: ([^\n]+)/)?.[1];
        assert(answer && choices.includes(answer), `${lesson.slug}: supported answer must resolve the task`);
        const reasoning = task.split("Reason:")[1];
        assert(reasoning?.trim().length >= 100, `${lesson.slug}: explain the inference and distractor error`);
      }
    }
  }
});

test("Science concepts retain evidence and worked examples with concise methods", () => {
  for (const lesson of scienceLessons) {
    assert.equal(
      lesson.sections.length,
      lesson.slug === "science-scientific-foundations" ? 8 : 7,
      "saved concept positions stay stable; Earth/space is appended",
    );
    assert.equal(lesson.check.length, 3);
    assert(
      lesson.sections.flatMap((section) => section.examples ?? []).length >= 6,
    );
    assert(
      lesson.sections.flatMap((section) => section.evidenceIds ?? []).length >=
        6,
    );
    for (const section of lesson.sections) {
      assert(section.body.length > 0);
      assert(section.body.join(" ").split(/\s+/).length <= 100);
    }
  }
});

test("Reading activities use distinct tasks and preserve source excerpts", () => {
  const prompts = new Set<string>();
  for (const lesson of readingLessons) {
    const predictions = activities[lesson.slug as keyof typeof activities];
    for (const prediction of predictions) {
      assert(
        !prompts.has(prediction.prompt),
        "do not repeat a generic task across topics",
      );
      prompts.add(prediction.prompt);
    }
    for (const index of [0, 5, 6]) {
      const activity = predictions[index];
      assert("evidence" in activity && activity.evidence);
      assert(
        readingQuestions.some(
          (question) =>
            question.passage.title === activity.evidence.title &&
            question.passage.context.includes(activity.evidence.context),
        ),
      );
      assert(activity.answer >= 0 && activity.answer < activity.choices.length);
    }
  }
});
