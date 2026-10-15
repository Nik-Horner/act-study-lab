import { DAILY_CURRICULUM } from "../daily-curriculum";
import {
  getLesson,
  getQuestions,
  getTopic,
  getPracticeReplacement,
} from "./content";
import type { Question } from "./types";
import {
  getLearningSkill,
  getLearningSkillById,
  skillHref,
} from "../learning-skills";

function methodSections(question: Question) {
  question = getPracticeReplacement(question.id) ?? question;
  const index = getQuestions(question.topic).findIndex(
    (q) => q.id === (getPracticeReplacement(question.id)?.id ?? question.id),
  );
  const scope = DAILY_CURRICULUM[question.topic]
    ?.filter((s) => s.practice.includes(index))
    .sort((a, b) => a.sections.length - b.sections.length)[0];
  const sections =
    question.lessonSections ??
    question.teachingSections ??
    scope?.sections ??
    [];
  return question.subject === "reading" && sections.length > 1
    ? sections.filter((i) => i !== 0)
    : sections;
}

export function questionMethod(question: Question) {
  if (!getTopic(question.topic)) return null;
  const source = getPracticeReplacement(question.id) ?? question;
  const skill =
    source.skillId &&
    (getLearningSkill(source.topic, source.skillId) ??
      getLearningSkillById(source.skillId));
  if (skill) return { href: skillHref(skill), label: skill.title };
  const lesson = getLesson(question.topic);
  const section = methodSections(question)[0];
  return {
    href: `/learn/${question.topic}?reference=1${section === undefined ? "" : `#lesson-section-${section}`}`,
    label:
      section === undefined
        ? lesson.title
        : lesson.sections[section].heading.replace(/^\d+\.\s*/, ""),
  };
}

export function practiceForMisses(
  active: Question[],
  all: Question[],
  missed: ReadonlySet<string>,
) {
  const methods = new Map<string, Set<number> | null>();
  const skills = new Set<string>();
  for (const question of all.filter((q) => missed.has(q.id))) {
    const source = getPracticeReplacement(question.id) ?? question;
    if (source.skillId) {
      skills.add(`${source.subject}:${source.skillId}`);
      continue;
    }
    const sections = methodSections(question);
    if (!sections.length) methods.set(question.topic, null);
    else if (methods.get(question.topic) !== null) {
      const known = methods.get(question.topic) ?? new Set<number>();
      sections.forEach((i) => known.add(i));
      methods.set(question.topic, known);
    }
  }
  return active.filter(
    (q) =>
      skills.has(`${q.subject}:${q.skillId}`) ||
      (methods.has(q.topic) &&
        (methods.get(q.topic) === null ||
          methodSections(q).some((i) => methods.get(q.topic)!.has(i)))),
  );
}
