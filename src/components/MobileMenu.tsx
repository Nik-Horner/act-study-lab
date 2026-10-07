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
    <div ref={rootRef} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-bg-raised hover:text-ink"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-border bg-bg-soft p-2 shadow-[var(--shadow-card)]">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bg-raised hover:text-ink"
          >
            Dashboard
          </Link>
          <Link
            href="/exam"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bg-raised hover:text-ink"
          >
            Digital practice
          </Link>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-bg-raised hover:text-ink"
          >
            Account
          </Link>
          <div className="mt-1 border-t border-border pt-2">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
