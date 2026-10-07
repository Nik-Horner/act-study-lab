"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  // null until mounted: matches the server-rendered placeholder exactly, so
  // hydration can't mismatch (see the same pattern/reasoning in DrillClient).
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading external state (DOM attribute set by the pre-hydration script, or OS preference) once on mount
    setTheme(
      attr === "light" || attr === "dark"
        ? attr
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
    );
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage may be unavailable (private browsing); theme just won't persist
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light/dark theme"
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-bg-raised hover:text-ink"
    >
      {theme !== null && (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {theme === "dark" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />}
        </svg>
      )}
    </button>
  );
}
