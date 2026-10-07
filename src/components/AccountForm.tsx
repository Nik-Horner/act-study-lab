"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface AccountFormInitial {
  display_name: string | null;
  current_score: number | null;
  target_score: number | null;
  test_date: string | null;
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
  const [currentScore, setCurrentScore] = useState(
    initial.current_score?.toString() ?? "",
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

    const target = Number(targetScore);
    if (!Number.isInteger(target) || target < 1 || target > 36) {
      setError("Target score must be a whole number from 1 to 36.");
      return;
    }
    if (currentScore.trim() !== "") {
      const current = Number(currentScore);
      if (!Number.isInteger(current) || current < 1 || current > 36) {
        setError("Current score must be a whole number from 1 to 36.");
        return;
      }
    }
    if (!testDate) {
      setError("Pick your test date.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName.trim() || null,
        current_score: currentScore.trim() === "" ? null : Number(currentScore),
        target_score: target,
        test_date: testDate,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      setError("Couldn't save — try again.");
      return;
    }
    if (variant === "onboarding") {
      router.refresh();
    } else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8">
        <h1 className="text-xl font-semibold">
          {variant === "onboarding" ? "Set up your account" : "Account"}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {variant === "onboarding"
            ? "Set your shared goal and test date. Your existing English score helps its study plan."
            : "Your goal and test date apply across subjects. Your English progress and score stay intact."}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="currentScore"
              >
                English score
              </label>
              <input
                id="currentScore"
                type="number"
                min={1}
                max={36}
                value={currentScore}
                onChange={(e) => setCurrentScore(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="targetScore"
              >
                Target score
              </label>
              <input
                id="targetScore"
                type="number"
                min={1}
                max={36}
                required
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
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
          {error && <p className="text-sm text-bad">{error}</p>}
          {saved && !error && <p className="text-sm text-good">Saved.</p>}
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
