import { planningScores, type StudySettings } from "./account-settings";
import type { Question, Lesson } from "./act/types";
import { getQuestions, getLesson } from "./act/content";
import { getLesson as getEnglishLesson } from "./content";
import { englishDailyQuestions } from "./english-daily-content";
import { getLearningSkills, focusLesson } from "./learning-skills";
import { DIFFICULTIES, startingDifficulty } from "./daily-difficulty";

const skills = getLearningSkills();
const questions = new Map(
  [...new Set(skills.map((skill) => skill.topic))].flatMap((topic) =>
    (topic.startsWith("math-") ||
    topic.startsWith("reading-") ||
    topic.startsWith("science-")
      ? getQuestions(topic)
      : englishDailyQuestions(topic)
    ).map((question) => [question.id, question] as const),
  ),
);
const owners = new Map(
  skills.flatMap((skill) =>
    skill.questionIds.map((id) => [id, skill] as const),
  ),
);

export function getDailyPracticeQuestion(id: string) {
  return questions.get(id);
}

/** Two fresh successes at a level unlock its next step; a miss restores support. */
export function dailyPracticeLevels(
  settings: StudySettings,
  goal: number,
  firstAnswers: Map<string, boolean>,
) {
  const levels: Record<string, Question["difficulty"]> = {};
  const streaks: Record<string, number> = {};
  const readingPassages = new Set<string>();
  const examplesBySkill = new Map<string, string[]>();
  for (const [id, correct] of firstAnswers) {
    const skill = owners.get(id),
      question = questions.get(id);
    if (!skill || !question) continue;
    const key = `${skill.subject}:${skill.topic}:skill:${skill.id}`;
    let level = DIFFICULTIES.indexOf(
      levels[key] ??
        startingDifficulty(planningScores(settings)[skill.subject], goal),
    );
    const questionLevel = DIFFICULTIES.indexOf(question.difficulty);
    const passageId = "passage" in question ? question.passage?.id : undefined;
    const familiarPassage =
      skill.subject === "reading" &&
      passageId &&
      readingPassages.has(passageId);
    if (skill.subject === "reading" && passageId)
      readingPassages.add(passageId);
    if (!examplesBySkill.has(key)) {
      const lesson = focusLesson(
        skill.subject === "english"
          ? (getEnglishLesson(skill.topic) as Lesson)
          : getLesson(skill.topic),
        skill,
      );
      examplesBySkill.set(
        key,
        lesson.sections.flatMap((section) =>
          [...(section.examples ?? []), ...(section.workedCases ?? [])].map(
            (example) => example.text,
          ),
        ),
      );
    }
    const demonstrated =
      question.questionText.trim().length > 0 &&
      examplesBySkill
        .get(key)!
        .some(
          (example) =>
            example.includes(question.questionText) &&
            example.includes(question.choices[question.answer]),
        );
    if (!correct) {
      level = Math.max(0, Math.min(level, questionLevel) - 1);
      streaks[key] = 0;
    } else if (!familiarPassage && !demonstrated && questionLevel >= level) {
      streaks[key] = (streaks[key] ?? 0) + 1;
      if (streaks[key] >= 2 && level < (goal < 28 ? 1 : 2)) {
        level++;
        streaks[key] = 0;
      }
    }
    levels[key] = DIFFICULTIES[level];
  }
  return levels;
}
