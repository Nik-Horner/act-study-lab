import type { HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border bg-bg-soft shadow-[var(--shadow-card)] ${className}`}
      {...rest}
    />
  );
}
