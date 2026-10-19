import type { Lesson } from "@/lib/act/types";
import type { AccountSubject } from "@/lib/account-settings";
import {
  EXPLORATION_SKILLS,
  isClauseRecognitionSection,
} from "@/lib/lesson-interaction";
import { explanationSteps } from "@/lib/answer-explanation";
import { renderStem } from "@/lib/format";
import {
  ClauseRecognitionExploration,
  GuidedExploration,
} from "./GuidedExploration";
import { LessonVisual } from "./LessonVisual";
import { MathText } from "./MathText";

type Section = Lesson["sections"][number];
type Example = NonNullable<Section["examples"]>[number];

/** Learning artifacts always use this concept's authored source, never a decorative graph. */
export function LessonArtifact({
  section,
  subject,
  topic,
  skillId,
  sourceIndex,
  example,
  exploring = false,
}: {
  section: Section;
  subject: AccountSubject;
  topic: string;
  skillId?: string;
  sourceIndex: number;
  example?: Example;
  exploring?: boolean;
}) {
  if (!exploring && isClauseRecognitionSection(topic, sourceIndex))
    return <ClauseRecognitionExploration />;
  if (
    !exploring &&
    section.activity &&
    EXPLORATION_SKILLS.some((id) => id === skillId)
  )
    return <GuidedExploration skillId={skillId} />;
  const evidence = example?.evidence ? [example.evidence] : section.evidence;
  if (evidence?.length)
    return (
      <div className="concept-source-evidence">
        {evidence.map((passage) => (
          <LessonVisual
            key={passage.id}
            activity={{ prompt: section.heading, evidence: passage }}
          />
        ))}
      </div>
    );
  if (
    section.activity &&
    !exploring &&
    (section.activity.evidence ||
      section.activity.diagram ||
      section.activity.evidenceText)
  )
    return <LessonVisual activity={section.activity} />;
  const source = example ?? section.examples?.[0] ?? section.workedCases?.[0];
  const stimulus = source
    ? explanationSteps(source.text.split("\n\nSupported answer:")[0])[0]
    : (section.body[0] ?? section.heading);
  return (
    <div className="concept-stimulus-board">
      <span className="stimulus-kind">
        {subject === "english"
          ? "Read the sentence"
          : subject === "reading"
            ? "Read the evidence"
            : subject === "science"
              ? "Look at the comparison"
              : "Start with the problem"}
      </span>
      {subject === "english" ? (
        <div dangerouslySetInnerHTML={{ __html: renderStem(stimulus) }} />
      ) : (
        <div>
          <MathText>{stimulus}</MathText>
        </div>
      )}
      <p>Use this evidence with the idea alongside it.</p>
    </div>
  );
}
