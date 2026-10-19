import type { AccountSubject } from "./account-settings";
import type { Passage } from "./act/types";

export interface CampaignQuestion {
  id: string;
  topic: string;
  number: number;
  stem: string;
  questionText: string;
  choices: string[];
  passage?: Passage;
  englishPassage?: { title: string; html: string };
}
export interface CampaignMission {
  id: string;
  subject: AccountSubject;
  title: string;
  count: number;
  topics: { slug: string; title: string }[];
}
export interface CampaignState {
  version: 1;
  missionId: string;
  revision: number;
  cursor: number;
  answers: { choice: number; seconds: number }[];
  startedAt: string;
  completedAt: string | null;
}
export interface CampaignFeedback {
  chosen: number;
  answer: number;
  explanation: string;
  topic: { slug: string; title: string };
}
export interface CampaignSnapshot {
  state: CampaignState | null;
  questions: CampaignQuestion[];
  feedback: CampaignFeedback[];
  correct: number;
  stars: number;
}
export type CampaignAction =
  | { action: "start" }
  | { action: "answer"; revision: number; choice: number; seconds: number }
  | { action: "next"; revision: number };
