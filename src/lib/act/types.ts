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
  series: { label: string; points: [number, number][] }[];
}
export interface Passage {
  id: string;
  title: string;
  context: string;
  table?: DataTable;
  graph?: Graph;
}
export interface Question {
  assessment?: boolean;
  replacementId?: string;
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
    examples?: { text: string; label: string; good: boolean }[];
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
