"use client";
import { useState } from "react";
import { Button } from "../ui/Button";
export const ACT_DESMOS_URL =
  "https://www.desmos.com/testing/digital-act/graphing";
/** The ACT-specific hosted calculator needs no shared demo API credential. */
export function DesmosPanel({
  subject,
  initiallyOpen = false,
}: {
  subject: "math" | "science";
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [loaded, setLoaded] = useState(initiallyOpen);
  const [ready, setReady] = useState(false);
  return (
    <section
      aria-label="Desmos calculator"
      className="rounded-xl border border-border bg-bg-raised"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-sm font-semibold">
            {subject === "math" ? "ACT Desmos" : "Desmos · learning tool"}
          </h2>
          {subject === "science" && (
            <p className="mt-1 text-xs text-ink-soft">
              ACT Science is calculator-free.
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          aria-expanded={open}
          onClick={() => {
            setLoaded(true);
            setOpen(!open);
          }}
        >
          {open ? "Hide Desmos" : "Open Desmos"}
        </Button>
      </div>
      {loaded && (
        <div hidden={!open} className="border-t border-border">
          {!ready && (
            <p role="status" className="p-4 text-sm text-ink-soft">
              Loading Desmos…
            </p>
          )}
          <iframe
            src={`${ACT_DESMOS_URL}?embed`}
            title="Desmos ACT graphing calculator"
            className="h-[480px] w-full sm:h-[520px]"
            onLoad={() => setReady(true)}
            referrerPolicy="no-referrer"
            allow="clipboard-write"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-ink-soft">
            <p>
              Hide the panel to return to your question. Expressions stay while
              this screen is open.
            </p>
            <a
              href={ACT_DESMOS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline"
            >
              Open Desmos in a separate tab
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
