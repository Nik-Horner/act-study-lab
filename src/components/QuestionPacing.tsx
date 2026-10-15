"use client";
import { useEffect, useState } from "react";
import type { AccountSubject } from "@/lib/account-settings";
import { answerPacing } from "@/lib/question-pacing";
import { fmtTime } from "@/lib/format";
export function QuestionPacing({
  subject,
  savedTime,
}: {
  subject: AccountSubject;
  savedTime?: number;
}) {
  const [start] = useState(Date.now),
    [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (savedTime !== undefined) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [savedTime]);
  const elapsed = savedTime ?? now - start,
    pace = answerPacing(elapsed, subject);
  return (
    <p
      className={`mt-3 text-sm tabular-nums ${pace.onPace ? "text-ink-soft" : "text-warn"}`}
    >
      {pace.target === null
        ? `${fmtTime(Math.floor(elapsed / 1000))} · learning time`
        : savedTime === undefined
          ? `${fmtTime(Math.floor(elapsed / 1000))} · target ${pace.target}s`
          : `${pace.seconds}s — ${pace.onPace ? "on pace" : "a little slow"} (target ${pace.target}s)`}
    </p>
  );
}
