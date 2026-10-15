import mathSkillsData from "@/content/math-skill-lessons.json";
import mathQuestionSkillsData from "@/content/math-question-skills.json";
import englishSkillsData from "@/content/english-prerequisites.json";
import readingScienceSkillsData from "@/content/reading-science-skills.json";
import mathLessons from "@/content/math-lessons.json";
import mathExtraLessons from "@/content/math-extra-lessons.json";
import type { AccountSubject } from "./account-settings";
import type { Lesson } from "./act/types";

type Section = Lesson["sections"][number];
export interface LearningSkill {
  id: string;
  topic: string;
  subject: AccountSubject;
  title: string;
  reportingCategory: string;
  sections: number[];
  questionIds: string[];
  modeling?: boolean;
  activity?: Section["activity"];
  body?: string[];
  workedExamples?: { section: number; example: number }[];
}
export interface MathSkill {
  id: string;
  topic: string;
  title: string;
  reportingCategory: string;
  questionIds: string[];
  section: Section;
  modeling?: boolean;
}
type EnglishTopicSkills = {
  skills: Record<
    string,
    {
      sections: number[];
      title?: string;
      reportingCategory?: string;
      activity?: Section["activity"];
      workedExamples?: { section: number; example: number }[];
    }
  >;
  questionSkills: Record<string, string[]>;
  checkSkills?: Record<string, string[]>;
};
export const mathSkills = mathSkillsData as MathSkill[];
const mathQuestionSkills = mathQuestionSkillsData as Record<string, string[]>;
const englishSkills =
  (
    englishSkillsData as unknown as {
      topics?: Record<string, EnglishTopicSkills>;
    }
  ).topics ?? {};
const readingScienceSkills = readingScienceSkillsData as Omit<
  LearningSkill,
  "subject"
>[];
const baseMathSections = new Map(
  [...mathLessons, ...mathExtraLessons].map((lesson) => [
    lesson.slug,
    lesson.sections.length,
  ]),
);
const skills: LearningSkill[] = [
  ...mathSkills.map((skill) => ({
    ...skill,
    subject: "math" as const,
    sections: [
      baseMathSections.get(skill.topic)! +
        mathSkills
          .filter((s) => s.topic === skill.topic)
          .findIndex((s) => s.id === skill.id),
    ],
  })),
  ...Object.entries(englishSkills).flatMap(([topic, data]) =>
    Object.entries(data.skills).map(([id, skill]) => ({
      ...skill,
      id,
      topic,
      subject: "english" as const,
      title: skill.title ?? id.replaceAll("-", " "),
      reportingCategory:
        skill.reportingCategory ?? "Conventions of Standard English",
      questionIds: Object.entries(data.questionSkills)
        .filter(([, ids]) => ids[0] === id)
        .map(([id]) => id),
    })),
  ),
  ...readingScienceSkills.map((skill) => ({
    ...skill,
    subject: skill.topic.startsWith("reading-")
      ? ("reading" as const)
      : ("science" as const),
  })),
];
const skillsByKey = new Map(
  skills.map((skill) => [`${skill.topic}:${skill.id}`, skill]),
);
const uniqueSkillsById = new Map<string, LearningSkill | null>();
for (const skill of skills)
  uniqueSkillsById.set(skill.id, uniqueSkillsById.has(skill.id) ? null : skill);
const practiceSkillsByQuestion = new Map(
  skills.flatMap((skill) =>
    skill.questionIds.map((id) => [id, skill] as const),
  ),
);

export function getLearningSkills(topic?: string, subject?: AccountSubject) {
  return skills.filter(
    (skill) =>
      (!topic || skill.topic === topic) &&
      (!subject || skill.subject === subject),
  );
}
export function getLearningSkill(topic: string, id: string) {
  return skillsByKey.get(`${topic}:${id}`);
}
export function getLearningSkillById(id: string) {
  return uniqueSkillsById.get(id) ?? undefined;
}
export function getQuestionTeaching(topic: string, questionId: string) {
  const english = englishSkills[topic];
  const ids =
    mathQuestionSkills[questionId] ??
    english?.questionSkills[questionId] ??
    english?.checkSkills?.[questionId];
  if (ids?.length) {
    const own = getLearningSkill(topic, ids[0]) ?? getLearningSkillById(ids[0]);
    if (!own) return undefined;
    // Math cards explicitly teach their whole task; related skills remain links.
    const sections = topic.startsWith("math-")
      ? own.sections
      : [
          ...new Set(
            ids.flatMap((id) => getLearningSkill(topic, id)?.sections ?? []),
          ),
        ];
    return { skillId: ids[0], skillIds: ids, teachingSections: sections };
  }
  const skill = practiceSkillsByQuestion.get(questionId);
  return skill
    ? {
        skillId: skill.id,
        skillIds: [skill.id],
        teachingSections: skill.sections,
      }
    : undefined;
}

export function skillHref(skill: LearningSkill, drill = false) {
  return `/${drill ? "drill" : "learn"}/${skill.topic}?skill=${encodeURIComponent(skill.id)}`;
}
export function reportingCategoryName(category: string) {
  return (
    (
      {
        CSE: "Conventions of Standard English",
        POW: "Production of Writing",
        KLA: "Knowledge of Language",
      } as Record<string, string>
    )[category] ?? category
  );
}
export function hasTeaching(section: Section) {
  return (
    section.body.some((text) => text.trim()) ||
    !!section.examples?.some((example) => example.text.trim()) ||
    !!section.evidence?.length ||
    !!section.activity
  );
}

/** Keep exact source indices while selecting only this skill's worked evidence. */
export function focusLesson(full: Lesson, skill: LearningSkill): Lesson {
  const related =
    skill.subject === "english"
      ? [
          ...new Set(
            skill.questionIds.flatMap(
              (id) => englishSkills[skill.topic]?.questionSkills[id] ?? [],
            ),
          ),
        ].flatMap((id) => {
          const found = getLearningSkill(skill.topic, id);
          return found ? [found] : [];
        })
      : [];
  const sections = [
    ...new Set([
      ...skill.sections,
      ...related.flatMap((entry) => entry.sections),
    ]),
  ];
  const examples = skill.workedExamples
    ? [
        ...skill.workedExamples,
        ...related.flatMap((entry) => entry.workedExamples ?? []),
      ]
    : undefined;
  return {
    ...full,
    title: skill.title,
    sections: sections.map((sourceIndex, position) => {
      const section = full.sections[sourceIndex];
      return {
        ...section,
        body: skill.body
          ? position === sections.length - 1
            ? skill.body
            : []
          : section.body,
        tip: skill.body ? undefined : section.tip,
        evidence:
          skill.subject === "science" && skill.workedExamples
            ? undefined
            : section.evidence,
        examples: examples
          ? section.examples?.filter((_, example) =>
              examples.some(
                (ref) => ref.section === sourceIndex && ref.example === example,
              ),
            )
          : section.examples,
        activity: skill.activity
          ? position === sections.length - 1
            ? skill.activity
            : undefined
          : section.activity,
      };
    }),
    check: [],
  };
}
