"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { SUBJECTS } from "@/lib/account-settings";
import { scoreCheckEvidence, type ScoreCheck } from "@/lib/score-checks";
import { Button } from "./ui/Button";

export function ScoreChecks({
  ownerId: initialOwnerId,
  targetScore,
  today,
  includeScience = true,
}: {
  ownerId: string;
  targetScore: number;
  today: string;
  includeScience?: boolean;
}) {
  const [ownerId] = useState(initialOwnerId);
  const [checks, setChecks] = useState<ScoreCheck[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const response = await fetch(
        `/api/score-checks?ownerId=${encodeURIComponent(ownerId)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (id !== requestId.current) return;
      if (!response.ok)
        throw new Error(data.error ?? "Couldn’t load score checks.");
      setChecks(data.checks);
      setLoaded(true);
      setError(null);
    } catch (error) {
      if (id === requestId.current) setError((error as Error).message);
    }
  }, [ownerId]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    ++requestId.current;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    setError(null);
    try {
      const response = await fetch("/api/score-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId,
          subject: form.get("subject"),
          score: Number(form.get("score")),
          formName: form.get("formName"),
          date: form.get("date"),
          official: form.has("official"),
          timed: form.has("timed"),
          firstAttempt: form.has("firstAttempt"),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ?? "Couldn’t save. Your entry is still here; retry.",
        );
      setChecks(data.checks);
      setLoaded(true);
      setMessage(
        "Score saved. Saving the same section and form again corrects its entry.",
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setPending(false);
    }
  }
  const evidence = scoreCheckEvidence(checks, targetScore, today);
  const inputClass =
    "mt-2 min-h-11 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm";
  return (
    <details
      className="mt-6 border-t border-border pt-5"
      aria-label="Timed score checks"
    >
      <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold">
        Check your score goal: {targetScore}
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Take an official practice section you haven’t seen before. Use its time
        limit and scoring key, then record your score here.
      </p>
      {loaded && (
        <ul className="mt-4 divide-y divide-border text-sm">
          {SUBJECTS.filter(
            (subject) => includeScience || subject !== "science",
          ).map((subject) => (
            <li
              key={subject}
              className="flex flex-wrap justify-between gap-2 py-2"
            >
              <span className="capitalize">{subject}</span>
              <span className="text-ink-soft">
                {evidence[subject].checks.length
                  ? `${evidence[subject].checks.map((check) => check.score).join(", ")} · ${evidence[subject].targetHits}/2 at goal`
                  : "No recent timed score"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!loaded && !error && (
        <p className="mt-3 text-sm text-ink-soft" role="status">
          Loading score checks…
        </p>
      )}
      {error && (
        <div className="mt-3" role="alert">
          <p className="text-sm text-bad">{error}</p>
          {!loaded && (
            <Button
              className="mt-2"
              variant="ghost"
              onClick={() => void load()}
            >
              Retry loading
            </Button>
          )}
        </div>
      )}
      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-brand">
          Record a practice score
        </summary>
        <form onSubmit={save} className="mt-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">
              Section
              <select name="subject" className={inputClass}>
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject[0].toUpperCase() + subject.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Scaled score
              <input
                name="score"
                type="number"
                min={1}
                max={36}
                required
                className={inputClass}
              />
            </label>
          </div>
          <label className="block text-sm">
            Official form name or code
            <input
              name="formName"
              maxLength={100}
              required
              className={inputClass}
              placeholder="Use the form’s printed identifier"
            />
          </label>
          <label className="block text-sm">
            Date taken
            <input
              name="date"
              type="date"
              required
              defaultValue={today}
              max={today}
              className={inputClass}
            />
          </label>
          <fieldset className="space-y-1 text-sm">
            <legend className="mb-2 font-semibold">Check what applies</legend>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" name="official" />
              Official ACT form, scored with its own key
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" name="timed" />
              Full section completed under its time limit
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" name="firstAttempt" />
              First attempt at this form, without prior answers
            </label>
          </fieldset>
          <p className="text-xs leading-relaxed text-ink-soft">
            The checkpoint uses your latest two different forms from the last 30
            days with all three boxes checked. Scores are self-reported and do
            not guarantee a test-day result.
          </p>
          <Button disabled={pending} type="submit">
            {pending ? "Saving…" : "Save score"}
          </Button>
          {message && (
            <p className="text-sm text-good" role="status">
              {message}
            </p>
          )}
          {checks.length > 0 && (
            <ul className="space-y-2 border-t border-border pt-3 text-xs text-ink-soft">
              {checks.slice(0, 8).map((check) => (
                <li key={check.id}>
                  {check.date} · {check.subject} · {check.formName}:{" "}
                  {check.score}
                  {(!check.official || !check.timed || !check.firstAttempt) &&
                    " · practice only"}
                </li>
              ))}
            </ul>
          )}
        </form>
      </details>
      <a
        href="https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep/act-online-test-sample-questions.html"
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center text-sm text-brand underline"
      >
        Open official ACT practice tests
      </a>
    </details>
  );
}
