"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ChecklistItem {
  key: string;
  title: string;
  subtitle: string;
  href: string | null;
  /* "learn" items: no checkbox, checked state comes from mastery (not user-toggleable). */
  auto: boolean;
  checked: boolean;
}

export function PlanChecklist({ items }: { items: ChecklistItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(
    () => ({}),
  );
  const [pending, setPending] = useState<Record<string, boolean>>({});

  async function toggle(item: ChecklistItem) {
    setError(null);
    const next = !(checkedMap[item.key] ?? item.checked);
    setCheckedMap((m) => ({ ...m, [item.key]: next }));
    setPending((p) => ({ ...p, [item.key]: true }));
    try {
      const res = await fetch("/api/plan-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: item.key, checked: next }),
      });
      if (!res.ok) throw new Error("request failed");
      router.refresh();
    } catch {
      setError("Couldn’t save this task. Please retry.");
      setCheckedMap((m) => ({ ...m, [item.key]: !next })); // revert on failure
    } finally {
      setPending((p) => ({ ...p, [item.key]: false }));
    }
  }

  const doneCount = items.filter((it) =>
    it.auto ? it.checked : (checkedMap[it.key] ?? it.checked),
  ).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        {doneCount}/{items.length} done
      </p>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {items.map((item) => {
          const isChecked = item.auto
            ? item.checked
            : (checkedMap[item.key] ?? item.checked);
          return (
            <li
              key={item.key}
              className="flex items-center gap-3 rounded-xl border border-border bg-bg p-3"
            >
              {item.auto ? (
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                    isChecked
                      ? "bg-good text-white"
                      : "bg-bg-raised text-ink-faint"
                  }`}
                >
                  {isChecked ? "✓" : ""}
                </span>
              ) : (
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={pending[item.key]}
                  onChange={() => toggle(item)}
                  aria-label={`Mark complete: ${item.title}`}
                  className="h-5 w-5 shrink-0 rounded border-border"
                />
              )}
              <div className="flex-1">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-sm font-medium hover:underline"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <span className="text-sm font-medium">{item.title}</span>
                )}
                <p className="text-xs text-ink-soft">{item.subtitle}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
