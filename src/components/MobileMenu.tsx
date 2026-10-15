"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-bg-raised hover:text-ink"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d={open ? "M6 6l12 12M6 18 18 6" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-border bg-bg-soft p-2 shadow-[var(--shadow-card)]">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bg-raised hover:text-ink"
          >
            Daily study
          </Link>
          <Link
            href="/practice"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bg-raised hover:text-ink"
          >
            Extra practice
          </Link>
          <Link
            href="/math-formulas"
            onClick={() => setOpen(false)}
            className="block min-h-11 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bg-raised hover:text-ink"
          >
            Math Formulas
          </Link>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bg-raised hover:text-ink"
          >
            Account settings
          </Link>
          <Link
            href="/account#daily-subjects"
            onClick={() => setOpen(false)}
            className="block min-h-11 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bg-raised hover:text-ink"
          >
            Daily subjects
          </Link>
          <div className="mt-1 border-t border-border pt-2">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
