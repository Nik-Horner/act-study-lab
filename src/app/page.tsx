import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getTopics } from "@/lib/content";

export default function LandingPage() {
  const topicCount = getTopics().length;

  return (
    <div className="space-y-16">
      <section className="pt-8 text-center sm:pt-16">
        <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-dark">
          Enhanced (digital) ACT English
        </span>
        <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Learn every rule. Drill it to automatic. Walk in ready.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-ink-soft">
          {topicCount} ACT English topics, streak-based mastery drills, and a full 50-question
          timed exam that looks like the real thing — with your own account, your own pace, your
          own test date.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/signup">Start studying — it&apos;s free</ButtonLink>
          <ButtonLink href="/login" variant="ghost">
            Log in
          </ButtonLink>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <div className="text-2xl">📘</div>
          <h2 className="mt-3 font-semibold">Learn each topic</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Clear lessons with real ACT-style examples for every grammar and rhetoric rule.
          </p>
        </Card>
        <Card className="p-6">
          <div className="text-2xl">🎯</div>
          <h2 className="mt-3 font-semibold">Drill to mastery</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Endless practice per topic. Hit an 8-question streak and it&apos;s locked in — tracked
            just for you.
          </p>
        </Card>
        <Card className="p-6">
          <div className="text-2xl">📝</div>
          <h2 className="mt-3 font-semibold">Full timed exam</h2>
          <p className="mt-1 text-sm text-ink-soft">
            50 questions, 35 minutes, scored on the official ACT curve — know exactly where you
            stand.
          </p>
        </Card>
      </section>
    </div>
  );
}
