"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { StudyPageHeader } from "./StudyPageHeader";
import {
  SUBJECTS,
  hasCustomStudyPreferences,
  standardStudyPreferences,
  validStudyMinutes,
  MIN_STUDY_MINUTES,
  MAX_STUDY_MINUTES,
  type StudySettings,
} from "@/lib/account-settings";
import { Button } from "@/components/ui/Button";

export interface AccountFormInitial {
  ownerId: string;
  display_name: string | null;
  current_score: number | null;
  target_score: number | null;
  test_date: string | null;
  study_settings: StudySettings;
  study_time_set?: boolean;
}

export function AccountForm({
  initial,
  variant,
}: {
  initial: AccountFormInitial;
  variant: "onboarding" | "settings";
}) {
  const router = useRouter();
  const [ownerId] = useState(initial.ownerId);
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [scores, setScores] = useState(
    Object.fromEntries(
      SUBJECTS.map((subject) => [
        subject,
        initial.study_settings.scores[subject]?.toString() ?? "",
      ]),
    ),
  );
  const [minutes, setMinutes] = useState(
    variant === "onboarding" && initial.study_time_set === false
      ? ""
      : String(initial.study_settings.minutesPerDay),
  );
  const [useStandardPlanning, setUseStandardPlanning] = useState(false);
  const [includeScience, setIncludeScience] = useState(
    initial.study_settings.includeScience !== false,
  );
  const [targetScore, setTargetScore] = useState(
    initial.target_score?.toString() ?? "",
  );
  const [testDate, setTestDate] = useState(initial.test_date ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const dailyMinutes = Number(minutes);
    if (!validStudyMinutes(dailyMinutes)) {
      setError(
        `Daily study time must be a whole number from ${MIN_STUDY_MINUTES} to ${MAX_STUDY_MINUTES} minutes.`,
      );
      return;
    }
    const target = Number(targetScore);
    if (!Number.isInteger(target) || target < 1 || target > 36) {
      setError("Target score must be a whole number from 1 to 36.");
      return;
    }
    for (const subject of SUBJECTS) {
      if (
        scores[subject].trim() &&
        (!Number.isInteger(Number(scores[subject])) ||
          Number(scores[subject]) < 1 ||
          Number(scores[subject]) > 36)
      ) {
        setError(
          `${subject[0].toUpperCase() + subject.slice(1)} score must be a whole number from 1 to 36.`,
        );
        return;
      }
    }
    if (!testDate) {
      setError("Pick your test date.");
      return;
    }

    const updatedSettings: StudySettings = {
      ...initial.study_settings,
      scores: Object.fromEntries(
        SUBJECTS.map((subject) => [
          subject,
          scores[subject].trim() === "" ? null : Number(scores[subject]),
        ]),
      ) as StudySettings["scores"],
      minutesPerDay: dailyMinutes,
      includeScience,
    };
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId,
          display_name: displayName.trim() || null,
          current_score:
            scores.english.trim() === "" ? null : Number(scores.english),
          study_settings: useStandardPlanning
            ? standardStudyPreferences(updatedSettings)
            : updatedSettings,
          target_score: target,
          test_date: testDate,
        }),
      });
      setLoading(false);

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Couldn’t save your settings. Please retry.");
        return;
      }
      window.dispatchEvent(new Event("act-study-preference"));
      if (variant === "onboarding") {
        router.refresh();
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Couldn’t reach your account. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="settings-workspace">
      <StudyPageHeader
        title={
          variant === "onboarding" ? "Set up daily study" : "Study settings"
        }
        description={
          variant === "onboarding"
            ? "Choose a schedule and goal. Start from the full ACT course, then build on saved practice."
            : "Manage the schedule, subjects, and starting scores used for future sessions."
        }
      />
      <div className="settings-layout">
        <aside className="settings-index">
          <nav aria-label="Settings sections">
            <a href="#study-schedule">Study schedule</a>
            <a href="#daily-subjects">Subjects</a>
            <a href="#starting-scores">Starting scores</a>
            <a href="#profile-name">Profile</a>
          </nav>
          <div className="settings-save-note">
            <strong>Saved work stays saved.</strong>
            <p>
              Changing the plan updates the next session. An unfinished lesson
              stays ready to resume.
            </p>
          </div>
        </aside>
        <form onSubmit={handleSubmit} className="settings-editor">
          <fieldset
            id="study-schedule"
            className="grid min-w-0 gap-5 border-b border-border pb-7 sm:grid-cols-2"
          >
            <legend className="mb-4 text-lg font-bold">Study schedule</legend>
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="testDate"
              >
                Test date
              </label>
              <input
                id="testDate"
                type="date"
                required
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-base focus:border-brand"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="studyMinutes"
              >
                Minutes available each day
              </label>
              <input
                id="studyMinutes"
                type="number"
                inputMode="numeric"
                min={MIN_STUDY_MINUTES}
                max={MAX_STUDY_MINUTES}
                step={1}
                required
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                aria-describedby="study-time-help"
                className="min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-base"
              />
              <p id="study-time-help" className="mt-2 text-sm text-ink-soft">
                {MIN_STUDY_MINUTES}–{MAX_STUDY_MINUTES} minutes. Lesson times
                are estimates; you can take the time you need.
              </p>
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="targetScore"
              >
                Target score per section
              </label>
              <input
                id="targetScore"
                type="number"
                min={1}
                max={36}
                required
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-base focus:border-brand"
              />
            </div>
            <p className="text-sm leading-relaxed text-ink-soft sm:col-span-2">
              Short days give larger score gaps more practice and keep other
              subjects in rotation. Your test date guides how much new work
              fits. Changes start with your next session; unfinished lessons
              stay ready to resume. Formula review is optional extra practice.
            </p>
          </fieldset>

          <fieldset
            id="daily-subjects"
            className="min-w-0 scroll-mt-5 space-y-2 border-b border-border pb-5"
          >
            <legend className="mb-2 text-sm font-semibold">
              Subjects to study
            </legend>
            <p className="text-sm text-ink-soft">
              English, Math, and Reading are included.
            </p>
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0"
                checked={includeScience}
                onChange={(e) => setIncludeScience(e.target.checked)}
                aria-describedby="science-setting-help"
              />
              <span>Include Science in daily study (optional)</span>
            </label>
            <p
              id="science-setting-help"
              className="text-sm leading-relaxed text-ink-soft"
            >
              Turn off Science to use your daily time for the other three
              subjects. This applies to your next session; a saved session stays
              intact. Science history and extra practice remain available.
            </p>
          </fieldset>
          <div id="profile-name">
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="displayName"
            >
              Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional"
              className="min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-base focus:border-brand"
            />
          </div>
          <fieldset id="starting-scores">
            <legend className="text-sm font-semibold">
              Recent section scores (optional)
            </legend>
            <p className="mt-1 text-sm text-ink-soft">
              Enter a recent ACT or practice score from 1 to 36. Leave a section
              blank if you haven’t taken it or don’t want to use an older score.
              Scores guide practice difficulty; they do not mark lessons
              complete.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {SUBJECTS.map((subject) => (
                <div key={subject}>
                  <label
                    className="mb-1 block text-sm font-medium"
                    htmlFor={`${subject}Score`}
                  >
                    {subject[0].toUpperCase() + subject.slice(1)}
                  </label>
                  <input
                    id={`${subject}Score`}
                    type="number"
                    min={1}
                    max={36}
                    step={1}
                    value={scores[subject]}
                    onChange={(e) =>
                      setScores({ ...scores, [subject]: e.target.value })
                    }
                    placeholder="Not taken"
                    className="min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-base focus:border-brand"
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <section
            className="border-t border-border pt-5 space-y-2"
            aria-labelledby="planning-method-title"
          >
            <h2 id="planning-method-title" className="text-base font-semibold">
              How the plan works
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft">
              Daily study covers the full curriculum in English, Math, and
              Reading, plus Science when selected. Starting scores and recorded
              timed official score checks guide difficulty and subject time.
              Saved mistakes guide review, and new lessons continue from the
              last saved place.
            </p>
          </section>
          {hasCustomStudyPreferences(initial.study_settings) && (
            <details className="border-t border-border pt-2">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
                Previously saved plan preferences
              </summary>
              <p className="text-sm leading-relaxed text-ink-soft">
                These earlier choices still apply to this account. Keeping them
                preserves the current plan preferences. Standard planning
                includes the full course and uses all entered scores.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-soft">
                {initial.study_settings.mathFocus === "geometry-trig" && (
                  <li>Geometry and trigonometry are prioritized in Math.</li>
                )}
                {!!initial.study_settings.mathCoveredTopics?.length && (
                  <li>
                    Excluded from upcoming Math lessons:{" "}
                    {initial.study_settings.mathCoveredTopics
                      .map(
                        (topic) =>
                          ({
                            "math-algebra": "Algebra",
                            "math-functions": "Functions",
                            "math-essential-skills": "Essential skills",
                            "math-modeling": "Modeling",
                          })[topic] ?? topic,
                      )
                      .join(", ")}
                    . These exclusions are separate from completed lessons.
                  </li>
                )}
                {initial.study_settings.scienceScoreRepresentative ===
                  false && (
                  <li>The saved Science score is excluded from planning.</li>
                )}
              </ul>
              <label className="mt-4 flex min-h-11 items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={useStandardPlanning}
                  onChange={(event) =>
                    setUseStandardPlanning(event.target.checked)
                  }
                  className="h-5 w-5 shrink-0"
                />
                Use standard planning after saving
              </label>
              <p className="text-sm leading-relaxed text-ink-soft">
                This changes future lesson selection. It does not erase answers,
                completed lessons, scores, or the active session.
              </p>
            </details>
          )}
          {error && (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          )}
          {saved && !error && (
            <p role="status" className="text-sm text-good">
              Saved. Your next session will use this plan. Existing progress is
              kept.
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? "Saving…"
              : variant === "onboarding"
                ? "Start daily study"
                : "Save changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}
