import readingTopics from "@/content/reading-topics.json";
import lessonActivities from "@/content/lesson-activities.json";
import readingLessons from "@/content/reading-lessons.json";
import readingQuestions from "@/content/reading-questions.json";
import readingPractice from "@/content/reading-practice.json";
import readingExams from "@/content/reading-exams.json";
import mathTopics from "@/content/math-topics.json";
import scienceTopics from "@/content/science-topics.json";
import mathLessons from "@/content/math-lessons.json";
import mathExtraLessons from "@/content/math-extra-lessons.json";
import scienceLessons from "@/content/science-lessons.json";
import scienceTeaching from "@/content/science-teaching-passages.json";
import scienceLegacyChecks from "@/content/science-legacy-checks.json";
import mathQuestions from "@/content/math-questions.json";
import mathExtraQuestions from "@/content/math-extra-questions.json";
import mathMethodQuestions from "@/content/math-method-questions.json";
import mathSkillQuestions from "@/content/math-skill-questions.json";
import { getQuestionTeaching, mathSkills } from "../learning-skills";
import scienceQuestions from "@/content/science-questions.json";
import mathExams from "@/content/math-exams.json";
import scienceExams from "@/content/science-exams.json";
import type { Subject, Topic, Lesson, Question, Exam } from "./types";
export type * from "./types";
const topics = [...mathTopics, ...scienceTopics, ...readingTopics] as Topic[];
const replacementSlugs = new Set(mathExtraLessons.map((lesson) => lesson.slug));
const lessons = [
  ...mathLessons.filter((lesson) => !replacementSlugs.has(lesson.slug)),
  ...mathExtraLessons,
  ...scienceLessons,
  ...readingLessons,
] as Lesson[];
const questions = [
  ...mathQuestions,
  ...mathExtraQuestions,
  ...mathMethodQuestions,
  ...mathSkillQuestions,
  ...scienceQuestions,
  ...readingQuestions,
  ...readingPractice,
] as Question[];
const exams = [...mathExams, ...scienceExams, ...readingExams] as Exam[];
const reserved = new Set(exams.flatMap((e) => e.questionIds));
const activeReading = new Set(readingPractice.map((q) => q.id));
const legacyReading = readingQuestions.filter((q) => !reserved.has(q.id));
const readingReplacements = new Map(
  legacyReading.map((q) => {
    const oldPool = legacyReading.filter((item) => item.topic === q.topic);
    const newPool = readingPractice.filter((item) => item.topic === q.topic);
    return [
      q.id,
      newPool[oldPool.findIndex((item) => item.id === q.id)] as Question,
    ];
  }),
);
export function getPracticeReplacement(id: string) {
  const question = readingReplacements.get(id);
  return question ? withTeaching(question) : undefined;
}
export const SUBJECT_LABELS: Record<Subject, string> = {
  math: "Math",
  science: "Science",
  reading: "Reading",
};
export function getTopics(subject?: Subject) {
  return topics.filter((t) => !subject || t.subject === subject);
}
export function getTopic(slug: string) {
  return topics.find((t) => t.slug === slug);
}
export function getLesson(slug: string) {
  const lesson = lessons.find((l) => l.slug === slug);
  if (!lesson) throw new Error("Unknown lesson");
  return {
    ...lesson,
    sections: [
      ...lesson.sections.map((section, index) => ({
        ...section,
        activity: (
          lessonActivities as Record<
            string,
            NonNullable<Lesson["sections"][number]["activity"]>[]
          >
        )[slug]?.[index],
        evidence: (section.evidenceIds ?? []).map((id) => {
          const passage =
            scienceTeaching.find((p) => p.id === id) ??
            questions.find((q) => !reserved.has(q.id) && q.passage?.id === id)
              ?.passage;
          if (!passage) throw new Error(`Missing lesson evidence: ${id}`);
          return passage;
        }),
      })),
      ...mathSkills
        .filter((skill) => skill.topic === slug)
        .map((skill) => ({
          ...skill.section,
          skillId: skill.id,
        })),
    ],
  };
}
function withTeaching(question: Question): Question {
  const teaching = getQuestionTeaching(question.topic, question.id);
  return teaching
    ? { ...question, ...teaching, lessonSections: teaching.teachingSections }
    : question;
}
export function getAllQuestions() {
  return [
    ...questions.map((source) => {
      const q = withTeaching(source);
      return q.subject === "reading" &&
        !reserved.has(q.id) &&
        !activeReading.has(q.id)
        ? {
            ...q,
            assessment: false,
            replacementId: getPracticeReplacement(q.id)?.id,
          }
        : reserved.has(q.id)
          ? { ...q, assessment: false }
          : q;
    }),
    ...lessons
      .flatMap((l) => l.check)
      .map((q) => ({ ...q, assessment: false })),
    ...scienceLegacyChecks.map((q, index) => ({
      ...q,
      assessment: false,
      replacementId: scienceLessons.flatMap((l) => l.check)[index]?.id,
    })),
  ] as Question[];
}
export function getQuestion(id: string) {
  const question =
    questions.find((q) => q.id === id) ??
    lessons.flatMap((l) => l.check).find((q) => q.id === id) ??
    (scienceLegacyChecks.find((q) => q.id === id) as Question | undefined);
  return question ? withTeaching(question) : undefined;
}
export function getQuestions(slug?: string) {
  return questions
    .filter(
      (q) =>
        !reserved.has(q.id) &&
        (q.subject !== "reading" || activeReading.has(q.id)) &&
        (!slug || q.topic === slug),
    )
    .map(withTeaching);
}
export function getExams(subject?: Subject) {
  return exams.filter((e) => !subject || e.subject === subject);
}
export function getExam(id: string) {
  const exam = exams.find((e) => e.id === id);
  if (!exam) throw new Error("Unknown exam");
  return exam;
}
export function getExamQuestions(id: string) {
  return getExam(id).questionIds.map((id) => {
    const q = getQuestion(id);
    if (!q) throw new Error("Missing exam question");
    return q;
  });
}
export function asSubject(value?: string): Subject {
  return value === "math" || value === "reading" ? value : "science";
}
export const OFFICIAL_PRACTICE =
  "https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep/act-online-test-sample-questions.html";
export const DIGITAL_GUIDE =
  "https://www.act.org/content/dam/act/unsecured/documents/ACT-Gateway-Quick-Tool-Guide.pdf";
