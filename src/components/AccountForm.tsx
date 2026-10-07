"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { SUBJECTS, type StudySettings } from "@/lib/account-settings";
import { Button } from "@/components/ui/Button";

export interface AccountFormInitial {
  display_name: string | null;
  current_score: number | null;
  target_score: number | null;
  test_date: string | null;
  study_settings: StudySettings;
}

export function AccountForm({
  initial,
  variant,
}: {
  initial: AccountFormInitial;
  variant: "onboarding" | "settings";
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [scores, setScores] = useState(
    Object.fromEntries(
      SUBJECTS.map((subject) => [
        subject,
        initial.study_settings.scores[subject]?.toString() ?? "",
      ]),
    ),
  );
  const [minutes, setMinutes] = useState(initial.study_settings.minutesPerDay);
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

    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          current_score:
            scores.english.trim() === "" ? null : Number(scores.english),
          study_settings: {
            scores: Object.fromEntries(
              SUBJECTS.map((subject) => [
                subject,
                scores[subject].trim() === "" ? null : Number(scores[subject]),
              ]),
            ),
            minutesPerDay: minutes,
          },
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
    <div className="mx-auto max-w-xl">
      <Card className="p-8">
        <h1 className="text-xl font-semibold">
          {variant === "onboarding" ? "Set up your account" : "Account"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {variant === "onboarding"
            ? "Set your goal and test date for the digital ACT. Add any previous section scores to personalize your dashboards."
            : "Manage your English, Math, Reading, and Science preparation. These settings follow your account across devices."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
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
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold">
              Previous section scores
            </legend>
            <p className="mt-1 text-sm text-ink-soft">
              Optional · Enter scores from 1 to 36. Leave a section blank if you
              haven’t taken it.
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
                    className="min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                </div>
              ))}
            </div>
          </fieldset>
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="targetScore"
            >
              Target score for each section
            </label>
            <input
              id="targetScore"
              type="number"
              min={1}
              max={36}
              required
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="studyMinutes"
            >
              Daily study time
            </label>
            <select
              id="studyMinutes"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            >
              {[60, 75, 90].map((n) => (
                <option key={n} value={n}>
                  {n} minutes
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-ink-soft">
              One guided session covers English, Reading, Math, and Science
              within this total time. Unfinished work carries forward.
            </p>
          </div>
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
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-bad">
              {error}
            </p>
          )}
          {saved && !error && (
            <p role="status" className="text-sm text-good">
              Saved.
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? "Saving…"
              : variant === "onboarding"
                ? "Start my plan"
                : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
