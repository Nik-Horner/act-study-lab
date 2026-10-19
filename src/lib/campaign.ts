import english from "@/content/campaign-english.json";
import manifest from "@/content/campaign-missions.json";
import { getQuestion, getQuestions, getTopic } from "./act/content";
import { getTopic as getEnglishTopic } from "./content";
import type { AccountSubject } from "./account-settings";
import type {
  CampaignAction,
  CampaignMission,
  CampaignQuestion,
  CampaignSnapshot,
  CampaignState,
} from "./campaign-types";

export const CAMPAIGN_RECORD = "campaign:v1";
type Canonical = CampaignQuestion & { answer: number; explanation: string };
const allowed = new Set(
  getQuestions()
    .filter((q) => q.assessment !== false)
    .map((q) => q.id),
);
const missions: {
  id: string;
  subject: AccountSubject;
  title: string;
  questions: Canonical[];
}[] = [
  ...english.map((passage) => ({
    id: `v1-english-${passage.id}`,
    subject: "english" as const,
    title: passage.title,
    questions: passage.questions.map((q) => ({
      ...q,
      id: `campaign-english-${passage.id}-${q.number}`,
      stem: "",
      englishPassage: { title: passage.title, html: passage.html },
    })),
  })),
  ...manifest.map((m) => ({
    ...m,
    subject: m.subject as AccountSubject,
    questions: m.questionIds.map((id, index) => {
      if (!allowed.has(id))
        throw new Error(`Campaign must not reveal a held-out question: ${id}`);
      const q = getQuestion(id)!;
      return {
        id: q.id,
        topic: q.topic,
        number: index + 1,
        stem: q.stem,
        questionText: q.questionText,
        choices: q.choices,
        passage: q.passage,
        answer: q.answer,
        explanation: q.explanation,
      };
    }),
  })),
];
export function campaignMission(id: string) {
  return missions.find((m) => m.id === id);
}
function topic(slug: string) {
  return {
    slug,
    title: getTopic(slug)?.title ?? getEnglishTopic(slug)?.title ?? slug,
  };
}
export function campaignCatalog(): CampaignMission[] {
  return missions.map((m) => ({
    id: m.id,
    subject: m.subject,
    title: m.title,
    count: m.questions.length,
    topics: [...new Set(m.questions.map((q) => q.topic))].map(topic),
  }));
}
export function campaignStars(
  correct: number,
  total: number,
  complete: boolean,
) {
  return !complete || !total
    ? 0
    : 1 + Number(correct / total >= 0.6) + Number(correct / total >= 0.85);
}
/** This identity prevents two tabs from creating duplicate progress or rewards. */
export async function campaignRecordId(owner: string, missionId: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${CAMPAIGN_RECORD}:${owner}:${missionId}`),
    ),
  ).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 128;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((v) => v.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function newCampaignState(
  missionId: string,
  now = new Date().toISOString(),
): CampaignState {
  if (!campaignMission(missionId)) throw new Error("Unknown mission");
  return {
    version: 1,
    missionId,
    revision: 0,
    cursor: 0,
    answers: [],
    startedAt: now,
    completedAt: null,
  };
}
/** Saved choices are immutable, and a stale tab cannot move a newer session. */
export function campaignMove(
  state: CampaignState,
  input: CampaignAction,
  now = new Date().toISOString(),
): CampaignState | null {
  const mission = campaignMission(state.missionId);
  if (!mission) return null;
  if (input.action === "start") return state;
  if (input.revision !== state.revision || state.completedAt) return null;
  if (input.action === "answer") {
    const q = mission.questions[state.cursor];
    if (
      !q ||
      !Number.isInteger(input.choice) ||
      input.choice < 0 ||
      input.choice >= q.choices.length ||
      !Number.isFinite(input.seconds) ||
      input.seconds < 0 ||
      input.seconds > 86400
    )
      return null;
    if (state.answers[state.cursor]) return null;
    return {
      ...state,
      revision: state.revision + 1,
      answers: [
        ...state.answers,
        { choice: input.choice, seconds: Math.round(input.seconds) },
      ],
    };
  }
  if (input.action !== "next" || !state.answers[state.cursor]) return null;
  const cursor = state.cursor + 1;
  return {
    ...state,
    cursor,
    revision: state.revision + 1,
    completedAt: cursor === mission.questions.length ? now : null,
  };
}
export function readCampaignState(value: unknown): CampaignState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as CampaignState,
    m = campaignMission(s.missionId);
  if (
    !m ||
    s.version !== 1 ||
    !Number.isInteger(s.revision) ||
    s.revision < 0 ||
    !Number.isInteger(s.cursor) ||
    s.cursor < 0 ||
    s.cursor > m.questions.length ||
    !Array.isArray(s.answers) ||
    typeof s.startedAt !== "string" ||
    !Number.isFinite(Date.parse(s.startedAt))
  )
    return null;
  if (
    s.completedAt !== null &&
    (typeof s.completedAt !== "string" ||
      !Number.isFinite(Date.parse(s.completedAt)) ||
      Date.parse(s.completedAt) < Date.parse(s.startedAt))
  )
    return null;
  if (
    s.answers.length !==
      s.cursor +
        Number(s.cursor < m.questions.length && !!s.answers[s.cursor]) ||
    !!s.completedAt !== (s.cursor === m.questions.length)
  )
    return null;
  if (s.revision !== s.cursor + s.answers.length) return null;
  if (
    s.answers.some(
      (a, i) =>
        !a ||
        !Number.isInteger(a.choice) ||
        a.choice < 0 ||
        a.choice >= m.questions[i].choices.length ||
        !Number.isInteger(a.seconds) ||
        a.seconds < 0 ||
        a.seconds > 86400,
    )
  )
    return null;
  return s;
}
export function campaignSnapshot(
  missionId: string,
  state: CampaignState | null,
): CampaignSnapshot {
  const m = campaignMission(missionId);
  if (!m) throw new Error("Unknown mission");
  const feedback = (state?.answers ?? []).map((a, i) => ({
    chosen: a.choice,
    answer: m.questions[i].answer,
    explanation: m.questions[i].explanation,
    topic: topic(m.questions[i].topic),
  }));
  const correct = feedback.filter((f) => f.chosen === f.answer).length;
  return {
    state,
    questions: m.questions.map((q: Canonical) => ({
      id: q.id,
      topic: q.topic,
      number: q.number,
      stem: q.stem,
      questionText: q.questionText,
      choices: q.choices,
      passage: q.passage,
      englishPassage: q.englishPassage,
    })),
    feedback,
    correct,
    stars: campaignStars(correct, m.questions.length, !!state?.completedAt),
  };
}
