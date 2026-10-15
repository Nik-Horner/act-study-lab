export type Subject = "math" | "science" | "reading";
export type Difficulty = "easy" | "medium" | "hard";
export interface Topic {
  slug: string;
  num: number;
  title: string;
  subject: Subject;
  category: string;
  blurb: string;
}
export interface DataTable {
  columns: string[];
  rows: (string | number)[][];
}
export interface Graph {
  title: string;
  xLabel: string;
  yLabel: string;
  yRange?: [number, number];
  series: { label: string; points: [number, number][] }[];
}
export interface Passage {
  id: string;
  title: string;
  context: string;
  table?: DataTable;
  graph?: Graph;
  diagram?: "seasons" | "rock-fault" | "sealed-fault" | "rock-intrusion";
}
export interface WorkedExample {
  text: string;
  label: string;
  good: boolean;
  evidence?: Passage;
}
export interface Question {
  skillId?: string;
  skillIds?: string[];
  assessment?: boolean;
  replacementId?: string;
  lessonSections?: number[];
  teachingSections?: number[];
  id: string;
  topic: string;
  subject: Subject;
  category: string;
  difficulty: Difficulty;
  stem: string;
  questionText: string;
  choices: string[];
  answer: number;
  explanation: string;
  passage?: Passage;
}
export interface Lesson {
  slug: string;
  title: string;
  intro: string;
  sections: {
    skillId?: string;
    teachingRevision?: number;
    activity?: {
      prompt: string;
      choices: string[];
      answer: number;
      explanation: string;
      evidence?: Passage;
      evidenceText?: string;
      diagram?: string;
    };
    heading: string;
    evidenceIds?: string[];
    evidence?: Passage[];
    body: string[];
    tip?: string;
    examples?: WorkedExample[];
    workedCases?: WorkedExample[];
  }[];
  check: Question[];
}
export interface Exam {
  id: string;
  title: string;
  subject: Subject;
  minutes: number;
  questionIds: string[];
  description: string;
}
