export function ProgressBar({
  percent,
  tone = "brand",
  className = "",
}: {
  percent: number;
  tone?: "brand" | "good";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fill = tone === "good" ? "bg-good" : "bg-brand";
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-bg-raised ${className}`}>
      <span className={`block h-full rounded-full transition-[width] ${fill}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
