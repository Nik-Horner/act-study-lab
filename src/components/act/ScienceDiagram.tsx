import type { Passage } from "@/lib/act/types";

export function ScienceDiagram({
  kind,
}: {
  kind: NonNullable<Passage["diagram"]>;
}) {
  if (kind === "seasons")
    return (
      <figure className="my-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {[true, false].map((june) => {
            const earth = june ? 60 : 170,
              sun = june ? 180 : 50;
            const start = june ? 152 : 78,
              end = june ? 104 : 126,
              tip = june ? end + 6 : end - 6;
            return (
              <svg
                key={String(june)}
                viewBox="0 0 230 180"
                role="img"
                aria-label={
                  june
                    ? "June: Earth's northern half leans toward the Sun. The lit side faces the Sun."
                    : "December: Earth's northern half leans away from the Sun. The axis keeps the same tilt direction."
                }
                className="mx-auto w-full max-w-xs text-ink"
              >
                <circle
                  cx={sun}
                  cy="85"
                  r="24"
                  fill="var(--color-accent-soft)"
                  stroke="var(--color-data-accent)"
                />
                <text
                  x={sun}
                  y="90"
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="16"
                >
                  Sun
                </text>
                <circle
                  cx={earth}
                  cy="85"
                  r="34"
                  fill="var(--color-brand-soft)"
                  stroke="var(--color-brand)"
                />
                <path
                  d={`M${earth} 51 A34 34 0 0 ${june ? 1 : 0} ${earth} 119 Z`}
                  fill="var(--color-accent-soft)"
                />
                <line
                  x1={earth - 17}
                  y1="125"
                  x2={earth + 17}
                  y2="45"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <line
                  x1={earth - 30}
                  y1="72"
                  x2={earth + 30}
                  y2="98"
                  stroke="var(--color-brand)"
                  strokeDasharray="5 3"
                />
                <text x={earth + 22} y="42" fill="currentColor" fontSize="16">
                  N
                </text>
                <text x={earth - 29} y="141" fill="currentColor" fontSize="16">
                  S
                </text>
                <path
                  d={`M${start} 75H${end} M${start} 95H${end} M${tip} 71L${end} 75L${tip} 79 M${tip} 91L${end} 95L${tip} 99`}
                  fill="none"
                  stroke="var(--color-data-accent)"
                  strokeWidth="2"
                />
                <text
                  x="115"
                  y="165"
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="14"
                >
                  {june ? "June: north toward Sun" : "December: north away"}
                </text>
              </svg>
            );
          })}
        </div>
        <figcaption className="mt-2 text-sm text-ink-soft">
          The axes stay parallel as Earth orbits. Tilt changes day length and
          sunlight angle. Not to scale.
        </figcaption>
      </figure>
    );
  const sealed = kind === "sealed-fault";
  const intrusion = kind === "rock-intrusion";
  const label = intrusion
    ? "A vertical intrusion cuts Layer M. Fault F crosses and cuts the intrusion."
    : sealed
      ? "A lies below B. A fault cuts A and B but ends below an unbroken layer C. Order: A, B, fault movement, C."
      : "A lies below B. A vertical fault offsets and cuts both layers. Order: A, B, fault movement.";
  return (
    <figure className="my-5">
      <svg
        viewBox="0 0 380 245"
        role="img"
        aria-label={label}
        className="mx-auto w-full max-w-md text-ink"
      >
        {intrusion ? (
          <>
            <rect
              x="35"
              y="40"
              width="310"
              height="155"
              fill="var(--color-brand-soft)"
              stroke="var(--color-brand)"
            />
            <text x="280" y="75" fill="currentColor" fontSize="18">
              Layer M
            </text>
            <path
              d="M115 40H145V195H115Z"
              fill="var(--color-accent-soft)"
              stroke="var(--color-data-accent)"
              strokeWidth="2"
            />
            <path d="M35 165L345 95" stroke="currentColor" strokeWidth="4" />
            <text x="275" y="125" fill="currentColor" fontSize="16">
              Fault F
            </text>
            <text
              x="130"
              y="220"
              textAnchor="middle"
              fill="currentColor"
              fontSize="16"
            >
              Intrusion
            </text>
          </>
        ) : (
          <>
            <path
              d={`M35 ${sealed ? 90 : 55}H190V130H35Z M190 ${sealed ? 90 : 65}H345V140H190Z`}
              fill="var(--color-brand-soft)"
              stroke="var(--color-brand)"
            />
            <path
              d="M35 130H190V200H35Z M190 140H345V210H190Z"
              fill="var(--color-accent-soft)"
              stroke="var(--color-data-accent)"
            />
            <text x="90" y="115" fill="currentColor" fontSize="18">
              B
            </text>
            <text x="90" y="175" fill="currentColor" fontSize="18">
              A
            </text>
            <line
              x1="190"
              y1={sealed ? 90 : 40}
              x2="190"
              y2="215"
              stroke="currentColor"
              strokeWidth="4"
            />
            {sealed && (
              <>
                <rect
                  x="35"
                  y="45"
                  width="310"
                  height="45"
                  fill="var(--color-bg-soft)"
                  stroke="currentColor"
                />
                <text x="90" y="74" fill="currentColor" fontSize="18">
                  C · unbroken
                </text>
              </>
            )}
            <text x="205" y="232" fill="currentColor" fontSize="16">
              Fault
            </text>
          </>
        )}
      </svg>
      <figcaption className="mt-2 text-sm text-ink-soft">
        {intrusion
          ? "Use what cuts what to work out the order."
          : sealed
            ? "C covers the old fault without being cut."
            : "Read bottom to top, then place the cutting event last."}
      </figcaption>
    </figure>
  );
}
