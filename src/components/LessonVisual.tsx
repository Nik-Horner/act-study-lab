"use client";

import { useId, useState } from "react";
import type { LessonActivityContent } from "@/lib/lesson-interaction";
import type { Graph } from "@/lib/act/types";
import { MathText } from "./MathText";
import { MathDiagram } from "./act/MathDiagram";
import { PassageView } from "./act/QuestionView";
import { Button } from "./ui/Button";

/** The preview and lesson use the same authored evidence, never a sample chart. */
export function LessonVisual({
  activity,
  compact = false,
}: {
  activity: Pick<
    LessonActivityContent,
    "prompt" | "evidence" | "evidenceText" | "diagram"
  > &
    Partial<Pick<LessonActivityContent, "choices" | "answer" | "explanation">>;
  compact?: boolean;
}) {
  const passage = activity.evidence;
  return (
    <div className="lesson-visual" data-compact={compact}>
      {passage ? (
        passage.graph ? (
          <>
            <PassageView passage={{ ...passage, graph: undefined }} />
            <GraphExplorer graph={passage.graph} compact={compact} />
          </>
        ) : passage.table || passage.diagram || compact ? (
          <PassageView passage={passage} />
        ) : (
          <EvidenceMarker title={passage.title} text={passage.context} />
        )
      ) : activity.evidenceText ? (
        compact ? (
          <blockquote className="lesson-visual-stimulus">
            <MathText>{activity.evidenceText}</MathText>
          </blockquote>
        ) : (
          <EvidenceMarker text={activity.evidenceText} words />
        )
      ) : (
        <p className="lesson-visual-stimulus">
          <MathText>{activity.prompt}</MathText>
        </p>
      )}
      {passage &&
        activity.evidenceText &&
        activity.evidenceText !== passage.context && (
          <blockquote className="lesson-visual-stimulus">
            <MathText>{activity.evidenceText}</MathText>
          </blockquote>
        )}
      {activity.diagram === "unit-circle" ? (
        <UnitCircle compact={compact} />
      ) : activity.diagram ? (
        <MathDiagram id={activity.diagram} />
      ) : null}
    </div>
  );
}

function EvidenceMarker({
  text,
  title,
  words = false,
}: {
  text: string;
  title?: string;
  words?: boolean;
}) {
  const [marked, setMarked] = useState<number[]>([]);
  // Explicit math stays intact; splitting TeX into individual words breaks its notation.
  const pieces =
    words && !text.includes("\\(")
      ? (text.match(/\[\[[\s\S]*?\]\]|\S+|\s+/g) ?? [text])
      : text.split(/(?<=[.!?])\s+(?=[A-Z“"])/);
  return (
    <div className="lesson-evidence-marker">
      {title && <h3>{title}</h3>}
      <p className="lesson-evidence-instruction">
        Tap {words ? "words" : "a sentence"} to mark the clues you will use.
      </p>
      <div
        className="lesson-evidence-text"
        role="group"
        aria-label="Mark useful evidence"
      >
        {pieces.map((piece, index) =>
          /^\s+$/.test(piece) ? (
            piece
          ) : (
            <button
              type="button"
              key={index}
              className="lesson-evidence-piece"
              aria-pressed={marked.includes(index)}
              onClick={() =>
                setMarked((current) =>
                  current.includes(index)
                    ? current.filter((i) => i !== index)
                    : [...current, index],
                )
              }
            >
              <MathText>{piece}</MathText>
            </button>
          ),
        )}
      </div>
      <p className="lesson-evidence-instruction">
        Your marks are scratch work. Check them against the explanation.
      </p>
    </div>
  );
}

export function GraphExplorer({
  graph,
  compact = false,
}: {
  graph: Graph;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const points = graph.series.flatMap((series, seriesIndex) =>
    series.points.map(([x, y]) => ({ x, y, label: series.label, seriesIndex })),
  );
  const point = points[selected];
  if (!point) return null;
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = graph.yRange?.[0] ?? Math.min(0, ...ys),
    maxY = graph.yRange?.[1] ?? Math.max(0, ...ys);
  const x = (value: number) => 64 + ((value - minX) / (maxX - minX || 1)) * 440;
  const y = (value: number) =>
    278 - ((value - minY) / (maxY - minY || 1)) * 230;
  const colors = [
    "var(--color-brand)",
    "var(--color-data-accent)",
    "var(--color-good)",
  ];
  return (
    <figure className="lesson-data-plot">
      <figcaption>{graph.title}</figcaption>
      <svg
        viewBox="0 0 560 340"
        role="img"
        aria-label={`${graph.title}. ${graph.xLabel} versus ${graph.yLabel}. ${point.label}: ${point.x}, ${point.y}. Use the point selector for exact values.`}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const value = minY + ((maxY - minY) * i) / 4;
          return (
            <g key={i}>
              <path d={`M64 ${y(value)}H504`} stroke="var(--color-border)" />
              <text
                x="52"
                y={y(value) + 5}
                textAnchor="end"
                fill="currentColor"
                fontSize="14"
              >
                {Number(value.toFixed(2))}
              </text>
            </g>
          );
        })}
        <path d="M64 32V278H520" fill="none" stroke="currentColor" />
        {graph.series.map((series, i) => (
          <polyline
            key={series.label}
            points={series.points.map(([a, b]) => `${x(a)},${y(b)}`).join(" ")}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth="3"
            strokeDasharray={i % 2 ? "7 4" : undefined}
          />
        ))}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(p.x)}
            cy={y(p.y)}
            r={i === selected ? 8 : 4}
            fill={colors[p.seriesIndex % colors.length]}
            stroke={i === selected ? "var(--color-good-soft)" : "none"}
            strokeWidth="5"
          />
        ))}
        <text
          x={Math.min(480, Math.max(95, x(point.x)))}
          y={Math.max(25, y(point.y) - 17)}
          textAnchor="middle"
          fontSize="17"
          fontWeight="700"
          fill="currentColor"
        >
          ({point.x}, {point.y})
        </text>
        <text
          x="64"
          y="301"
          textAnchor="middle"
          fontSize="14"
          fill="currentColor"
        >
          {minX}
        </text>
        <text
          x="504"
          y="301"
          textAnchor="middle"
          fontSize="14"
          fill="currentColor"
        >
          {maxX}
        </text>
        <text
          x="285"
          y="329"
          textAnchor="middle"
          fontSize="15"
          fill="currentColor"
        >
          {graph.xLabel}
        </text>
        <text
          x="17"
          y="160"
          transform="rotate(-90 17 160)"
          textAnchor="middle"
          fontSize="15"
          fill="currentColor"
        >
          {graph.yLabel}
        </text>
      </svg>
      {graph.series.length > 1 && (
        <div className="lesson-plot-legend">
          {graph.series.map((series, index) => (
            <span
              key={series.label}
              style={{ color: colors[index % colors.length] }}
            >
              {index % 2 ? "Dashed" : "Solid"} · {series.label}
            </span>
          ))}
        </div>
      )}
      {!compact && (
        <div className="exploration-controls">
          <label htmlFor={id}>Explore a measured point</label>
          <select
            id={id}
            value={selected}
            onChange={(event) => setSelected(Number(event.target.value))}
          >
            {points.map((p, i) => (
              <option key={i} value={i}>
                {p.label}: {p.x}, {p.y}
              </option>
            ))}
          </select>
          <p aria-live="polite">
            {point.label}: {graph.xLabel} = {point.x}; {graph.yLabel} ={" "}
            {point.y}.
          </p>
          {minY !== 0 && <p>The vertical axis starts at {minY}, not zero.</p>}
        </div>
      )}
    </figure>
  );
}

function UnitCircle({ compact }: { compact: boolean }) {
  const [angle, setAngle] = useState(150);
  const radians = (angle * Math.PI) / 180;
  const x = 150 + 100 * Math.cos(radians),
    y = 140 - 100 * Math.sin(radians);
  return (
    <div>
      <svg
        viewBox="0 0 300 280"
        role="img"
        aria-label={`Unit circle at ${angle} degrees. Cosine is ${Math.cos(radians) > 0 ? "positive" : "negative"}; sine is ${Math.sin(radians) > 0 ? "positive" : "negative"}.`}
      >
        <circle
          cx="150"
          cy="140"
          r="100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M20 140H280M150 10V270" fill="none" stroke="currentColor" />
        <path
          d={`M150 140L${x} ${y}L${x} 140Z`}
          fill="var(--color-brand-soft)"
          stroke="var(--color-brand)"
          strokeWidth="2"
        />
        <circle cx={x} cy={y} r="6" fill="var(--color-brand)" />
        <text x="260" y="161" fontSize="14" fill="currentColor">
          cos θ
        </text>
        <text x="160" y="20" fontSize="14" fill="currentColor">
          sin θ
        </text>
        <text x="160" y="130" fontSize="16" fill="currentColor">
          {angle}°
        </text>
      </svg>
      {!compact && (
        <div
          className="exploration-controls"
          role="group"
          aria-label="Explore unit-circle quadrants"
        >
          {[30, 150, 210, 330].map((value) => (
            <Button
              key={value}
              size="sm"
              variant="ghost"
              aria-pressed={angle === value}
              onClick={() => setAngle(value)}
            >
              {value}°
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
