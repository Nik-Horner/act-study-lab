/* Typed access to the static content bundled under src/content/.
   All JSON is imported statically so Next.js can bundle it at build time. */

import topicsData from "@/content/topics.json";

import lessonAddDelete from "@/content/lessons/add-delete.json";
import lessonCommas from "@/content/lessons/commas.json";
import lessonLogicalPlacement from "@/content/lessons/logical-placement.json";
import lessonMiscGrammar from "@/content/lessons/misc-grammar.json";
import lessonModifiers from "@/content/lessons/modifiers.json";
import lessonParallelStructure from "@/content/lessons/parallel-structure.json";
import lessonPronouns from "@/content/lessons/pronouns.json";
import lessonPunctuation from "@/content/lessons/punctuation.json";
import lessonRedundancy from "@/content/lessons/redundancy.json";
import lessonSentenceStructure from "@/content/lessons/sentence-structure.json";
import lessonTestPatterns from "@/content/lessons/test-patterns.json";
import lessonTransitions from "@/content/lessons/transitions.json";
import lessonVerbs from "@/content/lessons/verbs.json";
import lessonWhichChoice from "@/content/lessons/which-choice.json";
import lessonWordChoice from "@/content/lessons/word-choice.json";

import questionsAddDelete from "@/content/questions/add-delete.json";
import questionsCommas from "@/content/questions/commas.json";
import questionsLogicalPlacement from "@/content/questions/logical-placement.json";
import questionsMiscGrammar from "@/content/questions/misc-grammar.json";
import questionsModifiers from "@/content/questions/modifiers.json";
import questionsParallelStructure from "@/content/questions/parallel-structure.json";
import questionsPronouns from "@/content/questions/pronouns.json";
import questionsPunctuation from "@/content/questions/punctuation.json";
import questionsRedundancy from "@/content/questions/redundancy.json";
import questionsSentenceStructure from "@/content/questions/sentence-structure.json";
import questionsTestPatterns from "@/content/questions/test-patterns.json";
import questionsTransitions from "@/content/questions/transitions.json";
import questionsVerbs from "@/content/questions/verbs.json";
import questionsWhichChoice from "@/content/questions/which-choice.json";
import questionsWordChoice from "@/content/questions/word-choice.json";
import skillQuestions from "@/content/english-skill-questions.json";

import exam1 from "@/content/exams/exam-1.json";
import exam2 from "@/content/exams/exam-2.json";

/* ---------- Types ---------- */

export type Difficulty = "easy" | "medium" | "hard";
export type Category = "CSE" | "POW" | "KLA";

export interface Part {
  id: string;
  title: string;
}

export interface Topic {
  slug: string;
  num: number;
  title: string;
  part: string;
  category: Category;
  source: string;
  blurb: string;
  subtopics: string[];
}

export interface LessonExample {
  text: string;
  label: string;
  good: boolean;
}

export interface LessonSection {
  heading: string;
  body: string[];
  examples?: LessonExample[];
  tip?: string;
}

export interface CheckQuestion {
  id?: string;
  category?: Category;
  difficulty?: Difficulty;
  questionText: string;
  stem: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export interface Lesson {
  slug: string;
  title: string;
  intro: string;
  sections: LessonSection[];
  check: CheckQuestion[];
}

export interface Question {
  id: string;
  category: Category;
  difficulty: Difficulty;
  questionText: string;
  stem: string;
  choices: string[];
  answer: number;
  explanation: string;
}

interface QuestionBank {
  slug: string;
  questions: Question[];
}

export interface ExamQuestion {
  number: number;
  category: Category;
  difficulty: Difficulty;
  topic: string;
  questionText: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export interface ExamPassage {
  id: string;
  title: string;
  html: string;
  questions: ExamQuestion[];
}

export interface Exam {
  id: string;
  title: string;
  passages: ExamPassage[];
}

/* ---------- Static records (Next.js needs statically analyzable imports) ---------- */

const LESSON_SLUGS = [
  "add-delete",
  "commas",
  "logical-placement",
  "misc-grammar",
  "modifiers",
  "parallel-structure",
  "pronouns",
  "punctuation",
  "redundancy",
  "sentence-structure",
  "test-patterns",
  "transitions",
  "verbs",
  "which-choice",
  "word-choice",
] as const;

export type LessonSlug = (typeof LESSON_SLUGS)[number];

const EXAM_IDS = ["exam-1", "exam-2"] as const;

export type ExamId = (typeof EXAM_IDS)[number];

/* Content JSON is hand-written, not user input, but its string fields (e.g.
   "difficulty": "easy") get widened to `string` by resolveJsonModule, so cast
   each import back to its narrow type here. */
const lessons: Record<LessonSlug, Lesson> = {
  "add-delete": lessonAddDelete as Lesson,
  commas: lessonCommas as Lesson,
  "logical-placement": lessonLogicalPlacement as Lesson,
  "misc-grammar": lessonMiscGrammar as Lesson,
  modifiers: lessonModifiers as Lesson,
  "parallel-structure": lessonParallelStructure as Lesson,
  pronouns: lessonPronouns as Lesson,
  punctuation: lessonPunctuation as Lesson,
  redundancy: lessonRedundancy as Lesson,
  "sentence-structure": lessonSentenceStructure as Lesson,
  "test-patterns": lessonTestPatterns as Lesson,
  transitions: lessonTransitions as Lesson,
  verbs: lessonVerbs as Lesson,
  "which-choice": lessonWhichChoice as Lesson,
  "word-choice": lessonWordChoice as Lesson,
};

const questionBanks: Record<LessonSlug, QuestionBank> = {
  "add-delete": questionsAddDelete as QuestionBank,
  commas: questionsCommas as QuestionBank,
  "logical-placement": questionsLogicalPlacement as QuestionBank,
  "misc-grammar": questionsMiscGrammar as QuestionBank,
  modifiers: questionsModifiers as QuestionBank,
  "parallel-structure": questionsParallelStructure as QuestionBank,
  pronouns: questionsPronouns as QuestionBank,
  punctuation: questionsPunctuation as QuestionBank,
  redundancy: questionsRedundancy as QuestionBank,
  "sentence-structure": questionsSentenceStructure as QuestionBank,
  "test-patterns": questionsTestPatterns as QuestionBank,
  transitions: questionsTransitions as QuestionBank,
  verbs: questionsVerbs as QuestionBank,
  "which-choice": questionsWhichChoice as QuestionBank,
  "word-choice": questionsWordChoice as QuestionBank,
};

const exams: Record<ExamId, Exam> = {
  "exam-1": exam1 as Exam,
  "exam-2": exam2 as Exam,
};

/* ---------- Public API ---------- */

export function getTopics(): Topic[] {
  return topicsData.topics as Topic[];
}

export function getTopicParts(): Part[] {
  return topicsData.parts;
}

export function getTopic(slug: string): Topic | undefined {
  return getTopics().find((t) => t.slug === slug);
}

export function getLesson(slug: string): Lesson {
  if (!isLessonSlug(slug)) {
    throw new Error(`Unknown lesson slug: ${slug}`);
  }
  return lessons[slug];
}

export function getQuestions(slug: string): Question[] {
  if (!isLessonSlug(slug)) {
    throw new Error(`Unknown question bank slug: ${slug}`);
  }
  return [
    ...questionBanks[slug].questions,
    ...skillQuestions.filter((question) => question.topic === slug),
  ] as Question[];
}

export function getExam(examId: string): Exam {
  if (!isExamId(examId)) {
    throw new Error(`Unknown exam id: ${examId}`);
  }
  return exams[examId];
}

function isLessonSlug(slug: string): slug is LessonSlug {
  return (LESSON_SLUGS as readonly string[]).includes(slug);
}

function isExamId(examId: string): examId is ExamId {
  return (EXAM_IDS as readonly string[]).includes(examId);
}
