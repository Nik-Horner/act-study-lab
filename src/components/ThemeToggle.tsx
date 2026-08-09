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
      {theme === null ? null : theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
