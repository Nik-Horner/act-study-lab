const TONES = {
  brand: "bg-brand-soft text-brand-dark",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-bg-raised text-ink-soft",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span className={`study-badge ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
