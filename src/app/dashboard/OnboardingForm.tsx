"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function OnboardingForm() {
  const router = useRouter();
  const [targetScore, setTargetScore] = useState("");
  const [testDate, setTestDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const score = Number(targetScore);
    if (!Number.isInteger(score) || score < 1 || score > 36) {
      setError("Target score must be a whole number from 1 to 36.");
      return;
    }
    if (!testDate) {
      setError("Pick your test date.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_score: score, test_date: testDate }),
    });
    setLoading(false);

    if (!res.ok) {
      setError("Couldn't save — try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8">
        <h1 className="text-xl font-semibold">Set up your plan</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Your target score and test date drive your day-by-day study plan.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="targetScore">
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
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="testDate">
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
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Start my plan"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
