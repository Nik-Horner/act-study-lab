"use client";
import { useSyncExternalStore, useState } from "react";
import { Card } from "./ui/Card";
export function StudyTimePreference({ userId }: { userId: string }) {
  const [message, setMessage] = useState("");
  const minutes = useSyncExternalStore(
    (listener) => {
      window.addEventListener("act-study-preference", listener);
      window.addEventListener("storage", listener);
      return () => {
        window.removeEventListener("act-study-preference", listener);
        window.removeEventListener("storage", listener);
      };
    },
    () => {
      try {
        const value = Number(
          localStorage.getItem(`act-daily-minutes:${userId}`),
        );
        return [60, 75, 90].includes(value) ? value : 75;
      } catch {
        return 75;
      }
    },
    () => 75,
  );
  function change(value: number) {
    try {
      localStorage.setItem(`act-daily-minutes:${userId}`, String(value));
      window.dispatchEvent(new Event("act-study-preference"));
      setMessage(
        "Saved for this browser. Your practice history stays in your account.",
      );
    } catch {
      setMessage("Your browser could not save this preference.");
    }
  }
  return (
    <Card className="mx-auto max-w-md p-6">
      <label htmlFor="studyMinutes" className="font-semibold">
        Daily study budget
      </label>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Choose a realistic session length for Math + Science or Reading. Missed
        work carries forward within that focus plan’s budget. This preference is
        saved on this browser.
      </p>
      <select
        id="studyMinutes"
        value={minutes}
        onChange={(e) => change(Number(e.target.value))}
        className="mt-4 min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2"
      >
        {[60, 75, 90].map((n) => (
          <option value={n} key={n}>
            {n} minutes
          </option>
        ))}
      </select>
      <p role="status" className="mt-2 text-xs text-ink-soft">
        {message}
      </p>
    </Card>
  );
}
