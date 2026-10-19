import { StudyPageHeader } from "@/components/StudyPageHeader";
import Link from "next/link";
import { StudyIcon } from "@/components/StudyIcon";
import { ButtonLink } from "@/components/ui/Button";
import { campaignCatalog } from "@/lib/campaign";
export default function PracticePage() {
  const missions = campaignCatalog();
  return (
    <div className="progress-overview">
      <StudyPageHeader
        title="ACT practice"
        description="Choose a subject for independent questions, review mistakes, or rehearse a timed section. Use the course when a method needs more explanation."
      />
      <section className="campaign-home-entry campaign-practice-entry">
        <StudyIcon name="star" size={40} />
        <div>
          <h2>Play the campaign</h2>
          <p>
            {missions.length} saved missions. Read passages, make edits, solve
            problems, and test explanations. The coach appears after you commit
            a move.
          </p>
        </div>
        <ButtonLink href="/play">Choose a mission</ButtonLink>
      </section>
      <div className="subject-progress-links">
        {(["english", "math", "reading", "science"] as const).map((subject) => (
          <Link href={`/study/${subject}`} key={subject} data-subject={subject}>
            <span className="subject-symbol">
              <StudyIcon name={subject} size={28} />
            </span>
            <span>
              <strong>{subject}</strong>
              <small>Lessons, focused drills, and saved results</small>
            </span>
            <StudyIcon name="arrow" size={20} />
          </Link>
        ))}
      </div>
      <div className="progress-detail-row">
        <section>
          <StudyIcon name="clock" />
          <h2>Timed sections</h2>
          <p>
            Take an original timed section with flags, an answer navigator, and
            a saved review.
          </p>
          <Link href="/exam">
            Timed sections <StudyIcon name="arrow" size={18} />
          </Link>
        </section>
        <section>
          <StudyIcon name="formula" />
          <h2>Formula recall</h2>
          <p>
            Recall formulas across days, with topic filters and a packet paced
            to your test date.
          </p>
          <Link href="/math-formulas">
            Math formulas <StudyIcon name="arrow" size={18} />
          </Link>
        </section>
      </div>
      <section className="landing-official">
        <div>
          <h2>Try the official ACT tests.</h2>
          <p>
            Use ACT’s free tests and their scoring keys for an authentic
            practice run. Our questions are original study material.
          </p>
        </div>
        <a
          href="https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep.html"
          target="_blank"
          rel="noreferrer"
        >
          Official practice <StudyIcon name="arrow" size={20} />
        </a>
      </section>
      <div className="mt-7 flex flex-wrap gap-3">
        <ButtonLink href="/dashboard">Back to today</ButtonLink>
        <ButtonLink href="/learn" variant="ghost">
          Browse the course
        </ButtonLink>
      </div>
    </div>
  );
}
