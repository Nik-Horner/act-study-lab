import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
const subjects = [
  [
    "English",
    "Grammar, punctuation, and rhetoric",
    "50 questions · 35 minutes",
  ],
  [
    "Math",
    "Algebra, geometry, and precise problem solving",
    "45 questions · 50 minutes",
  ],
  [
    "Reading",
    "Passages, evidence, and purposeful reading",
    "36 questions · 40 minutes",
  ],
  [
    "Science",
    "Data, experiments, and competing explanations",
    "40 questions · 40 minutes",
  ],
];
export default function LandingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <section className="pt-8 text-center sm:pt-16">
        <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          One place to study.
          <br />
          Every ACT subject.
        </h1>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-ink-soft">
          Learn the skills, practice with explanations, and rehearse full
          enhanced digital ACT sections. English, Math, Reading, and Science
          share one account, your test date, and your saved progress.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/signup">Start studying</ButtonLink>
          <ButtonLink href="/login" variant="ghost">
            Log in
          </ButtonLink>
        </div>
        <p className="mt-4 text-sm text-ink-faint">
          Already use English Lab? Your same sign-in and English progress work
          here.
        </p>
      </section>
      <section
        aria-label="Study subjects"
        className="grid gap-4 sm:grid-cols-2"
      >
        {subjects.map(([name, description, format]) => (
          <Card key={name} className="p-6">
            <h2 className="text-lg font-semibold">{name}</h2>
            <p className="mt-2 text-sm text-ink-soft">{description}</p>
            <p className="mt-4 text-xs font-medium text-brand-dark">{format}</p>
          </Card>
        ))}
      </section>
      <section className="grid gap-6 sm:grid-cols-3">
        {[
          [
            "Learn with examples",
            "Detailed lessons turn each skill into a repeatable process, with worked examples and quick checks.",
          ],
          [
            "Practice with evidence",
            "Review explanations, record why you missed an answer, and return to the skills that need attention.",
          ],
          [
            "Rehearse the full section",
            "Use a timed question navigator, flags, and answer review. Completed results stay with your account.",
          ],
        ].map(([title, body]) => (
          <div key={title}>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
          </div>
        ))}
      </section>
      <p className="text-center text-xs leading-relaxed text-ink-faint">
        Independent study material. Original practice results show accuracy, not
        a guaranteed official ACT score. Science is optional on the enhanced
        ACT; confirm your testing requirements.
      </p>
    </div>
  );
}
