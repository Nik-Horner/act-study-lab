import { ButtonLink } from "@/components/ui/Button";
import { StudyIcon } from "@/components/StudyIcon";

const subjects = [
  {
    name: "english",
    title: "Make the sentence work.",
    detail: "See how clauses, punctuation, and word choices fit together.",
  },
  {
    name: "math",
    title: "See the problem differently.",
    detail: "Connect equations, graphs, and geometry with worked steps.",
  },
  {
    name: "reading",
    title: "Find the clue that matters.",
    detail: "Mark evidence and test what a passage actually supports.",
  },
  {
    name: "science",
    title: "Follow the evidence.",
    detail: "Explore data, compare experiments, and change one variable.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div>
          <h1>
            Learn it.
            <br />
            Try it.
            <br />
            <span>Make it stick.</span>
          </h1>
          <p>
            A daily ACT learning path built around your test date and the time
            you have. Four subjects. One saved place.
          </p>
          <div className="landing-actions">
            <ButtonLink href="/signup">
              Build my study plan <StudyIcon name="arrow" size={20} />
            </ButtonLink>
            <ButtonLink href="/login" variant="ghost">
              Continue learning
            </ButtonLink>
          </div>
        </div>
        <div className="landing-path" aria-label="Your daily learning path">
          <h2>One clear next step.</h2>
          {subjects.map((subject, index) => (
            <div key={subject.name} data-subject={subject.name}>
              <span className="subject-symbol">
                <StudyIcon name={subject.name} size={30} />
              </span>
              <div>
                <strong>{subject.name}</strong>
                <p>{subject.title}</p>
              </div>
              <span className="landing-step">{index + 1}</span>
            </div>
          ))}
          <p>Learn → explore → practice → review</p>
        </div>
      </section>
      <section className="landing-method">
        <h2>
          Less guessing.
          <br />
          More understanding.
        </h2>
        <div>
          <p>
            Work through visual examples, then put the idea to use. When an
            answer goes wrong, slow down, follow the reasoning, and try a
            smaller step before fresh practice.
          </p>
          <p>
            Your finished lessons, saved answers, and unfinished sessions stay
            with your account.
          </p>
        </div>
      </section>
      <section className="landing-subjects" aria-label="What you will learn">
        {subjects.map((subject) => (
          <div key={subject.name} data-subject={subject.name}>
            <StudyIcon name={subject.name} size={28} />
            <h2>{subject.title}</h2>
            <p>{subject.detail}</p>
          </div>
        ))}
      </section>
      <section className="landing-official">
        <div>
          <h2>Practice the real test, too.</h2>
          <p>
            Use our original lessons to build skills, then check your pacing
            with ACT’s official free practice tests.
          </p>
        </div>
        <a
          href="https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep.html"
          target="_blank"
          rel="noreferrer"
        >
          Official ACT practice <StudyIcon name="arrow" size={20} />
        </a>
      </section>
      <p className="landing-note">
        Independent practice material. Not affiliated with ACT. Practice
        accuracy is not an official score prediction. Science is optional on the
        enhanced ACT.
      </p>
    </div>
  );
}
