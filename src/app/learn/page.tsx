import { getLearningSkills } from "@/lib/learning-skills";
import { getTopics as englishTopics } from "@/lib/content";
import { getTopics } from "@/lib/act/content";
import { CourseBrowser } from "@/components/CourseBrowser";
import type { AccountSubject } from "@/lib/account-settings";
const subjects: AccountSubject[] = ["english", "math", "reading", "science"];
export default async function CurriculumPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject: selected } = await searchParams;
  const subject = subjects.find((item) => item === selected);
  return (
    <CourseBrowser
      skills={getLearningSkills()}
      subject={subject}
      topics={[...englishTopics(), ...getTopics()].map(({ slug, title }) => ({
        slug,
        title,
      }))}
    />
  );
}
