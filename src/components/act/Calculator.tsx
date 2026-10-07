"use client";
import { useState } from "react";
import { calculate } from "@/lib/act/calculator";
export function Calculator() {
  const [value, setValue] = useState(""),
    [result, setResult] = useState(""),
    [degrees, setDegrees] = useState(true);
  const keys = [
    "7",
    "8",
    "9",
    "/",
    "sqrt(",
    "4",
    "5",
    "6",
    "*",
    "^",
    "1",
    "2",
    "3",
    "-",
    "(",
    "0",
    ".",
    "%",
    "+",
    ")",
  ];
  function run() {
    try {
      setResult(String(Number(calculate(value, degrees).toPrecision(12))));
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Invalid expression");
    }
  }
  return (
    <section
      aria-label="Math calculator"
      className="mb-5 max-w-md rounded-xl border border-border bg-bg-raised p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Practice calculator</h2>
        <label className="text-sm">
          <input
            type="checkbox"
            checked={degrees}
            onChange={(e) => setDegrees(e.target.checked)}
          />{" "}
          Degrees
        </label>
      </div>
      <label className="mt-3 block text-sm">
        Expression
        <input
          aria-label="Calculator expression"
          className="mt-1 w-full rounded-lg border border-border bg-bg-soft p-3"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
        />
      </label>
      <output
        className="my-3 block min-h-6 break-words text-sm"
        aria-live="polite"
      >
        {result}
      </output>
      <div className="grid grid-cols-5 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            className="rounded-lg border border-border bg-bg-soft p-2 text-sm"
            onClick={() => setValue((v) => v + k)}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {["sin(", "cos(", "tan(", "log(", "ln(", "pi"].map((k) => (
          <button
            key={k}
            className="rounded-lg border border-border bg-bg-soft px-2 py-1 text-sm"
            onClick={() => setValue((v) => v + k)}
          >
            {k}
          </button>
        ))}
        <button
          className="rounded-lg border border-border bg-bg-soft px-3 py-1 text-sm"
          onClick={() => {
            setValue("");
            setResult("");
          }}
        >
          Clear
        </button>
        <button
          className="rounded-lg bg-brand px-4 py-1 text-sm text-white"
          onClick={run}
        >
          =
        </button>
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        Supports arithmetic, powers and the listed functions. Use explicit
        multiplication. Practice with the official calculator or your permitted
        handheld too.
      </p>
    </section>
  );
}
