import foundations from "@/content/english-foundation-drills.json";
import { getQuestions, type Question } from "./content";
import { getQuestionTeaching } from "./learning-skills";

/** Foundation drills apply only clause recognition or fragment repair.
 * The original ACT punctuation bank follows the complete original topic lesson.
 */
export function englishDailyQuestions(topic: string): Question[] {
  return (
    [
      ...getQuestions(topic),
      ...foundations.filter((q) => q.topic === topic),
    ] as Question[]
  ).map((question) => ({
    ...question,
    ...getQuestionTeaching(topic, question.id),
  }));
}
