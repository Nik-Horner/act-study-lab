"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DailyState } from "./DailyStudy";
import { StudyPageHeader } from "./StudyPageHeader";
import { StudyIcon } from "./StudyIcon";
import { Button } from "./ui/Button";
import { learningRewards } from "@/lib/learning-rewards";

export function ProgressOverview() {
  const [data, setData] = useState<DailyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/daily", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error ?? "Your progress could not load. Please retry.",
          );
        setData(result);
        setError(null);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    return () => controller.abort();
  }, [request]);

  const sessions = data?.coverage?.completedSessions ?? 0;
  const rewards = learningRewards(sessions);
  return (
    <div className="progress-overview">
      <StudyPageHeader
        title="Study progress"
        description="Completed sessions, covered skills, formula recall, and saved practice records."
      />
      {error ? (
        <div role="alert" className="daily-error">
          <p>{error}</p>
          <Button onClick={() => setRequest((value) => value + 1)}>
            Try again
          </Button>
          <Link href="/account">Check account settings</Link>
        </div>
      ) : !data ? (
        <p role="status">Loading your saved progress…</p>
      ) : (
        <>
          <div className="progress-ledger">
            <section className="progress-learning-record">
              <h2>Learning record</h2>
              <dl>
                <div>
                  <dt>Completed Daily sessions</dt>
                  <dd>
                    {sessions}
                    <small>Saved completion credit</small>
                  </dd>
                </div>
                {data.coverage && (
                  <div>
                    <dt>Focused skills covered</dt>
                    <dd>
                      {data.coverage.covered}
                      <small>of {data.coverage.total} course skills</small>
                    </dd>
                  </div>
                )}
                {data.formulas && (
                  <div>
                    <dt>Formulas recalled on two days</dt>
                    <dd>
                      {data.formulas.recalled}
                      <small>of {data.formulas.total} formulas</small>
                    </dd>
                  </div>
                )}
              </dl>
              <div className="lesson-reference-links">
                <Link href="/dashboard">Continue Daily study</Link>
                <Link href="/learn">Explore the course</Link>
                <Link href="/math-formulas">Formula recall</Link>
                <Link href="/play">Campaign stars and missions</Link>
              </div>
            </section>
            <section className="progress-earned-record">
              <div className="earned-level">
                <StudyIcon name="star" />
                <strong>Level {rewards.level}</strong>
                <span>{rewards.xp.toLocaleString()} XP</span>
              </div>
              <h2>Session milestones</h2>
              <p>
                100 XP per completed Daily session. Earlier completions count.
                Lesson coverage is separate from practice proficiency.
              </p>
              <ol
                className="progress-milestones"
                aria-label="Session milestones"
              >
                {[1, 5, 10, 25].map((milestone) => (
                  <li key={milestone} data-earned={sessions >= milestone}>
                    <span>
                      <StudyIcon
                        name={sessions >= milestone ? "check" : "star"}
                      />
                    </span>
                    <strong>{milestone}</strong>
                    <small>
                      {sessions >= milestone
                        ? "Reached"
                        : milestone === 1
                          ? "session"
                          : "sessions"}
                    </small>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </>
      )}
      <section aria-labelledby="subject-progress-title">
        <h2 id="subject-progress-title">Subject practice records</h2>
        <div className="subject-progress-links">
          {(["english", "math", "reading", "science"] as const).map(
            (subject) => (
              <Link
                href={`/study/${subject}`}
                key={subject}
                data-subject={subject}
              >
                <span className="subject-symbol">
                  <StudyIcon name={subject} size={28} />
                </span>
                <span>
                  <strong>{subject}</strong>
                  <small>Saved practice, topic progress, and results</small>
                </span>
                <StudyIcon name="arrow" size={20} />
              </Link>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
