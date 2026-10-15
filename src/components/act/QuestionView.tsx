"use client";
import { AnswerFeedback } from "../AnswerFeedback";
import { useId, type Ref } from "react";
import type { Question, Passage, Graph } from "@/lib/act/types";
import { MathDiagram } from "./MathDiagram";
import { MathText } from "../MathText";
import Link from "next/link";
import { questionMethod } from "@/lib/act/question-method";
import { displayChoiceOrder } from "@/lib/act/choice-order";
import { ScienceDiagram } from "./ScienceDiagram";
const letters = ["A", "B", "C", "D"];
const colors = [
  "var(--color-brand)",
  "var(--color-data-accent)",
  "var(--color-good)",
];
function Plot({ graph, passageTitle }: { graph: Graph; passageTitle: string }) {
  const helpId = useId();
  const all = graph.series.flatMap((s) => s.points),
    xs = all.map((p) => p[0]),
    ys = all.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = graph.yRange?.[0] ?? Math.min(0, ...ys),
    maxY = graph.yRange?.[1] ?? Math.max(0, ...ys);
  const x = (n: number) => 65 + ((n - minX) / (maxX - minX || 1)) * 470,
    y = (n: number) => 250 - ((n - minY) / (maxY - minY || 1)) * 195;
  const label = (n: number) => Number(n.toFixed(2));
  const ticks = (values: number[], min: number, max: number) => {
    const measured = [...new Set([min, ...values, max])].sort((a, b) => a - b);
    return measured.length <= 8 &&
      measured.every(
        (value, i) =>
          i === 0 || (value - measured[i - 1]) / (max - min || 1) >= 0.1,
      )
      ? measured
      : [0, 1, 2, 3, 4].map((i) => min + (i * (max - min)) / 4);
  };
  return (
    <figure className="my-5">
      {graph.title !== passageTitle && (
        <figcaption className="mb-2 font-semibold">{graph.title}</figcaption>
      )}
      {minY !== 0 && (
        <p className="mb-2 text-sm text-ink-soft">
          The vertical axis starts at {minY}, not zero.
        </p>
      )}
      <p id={helpId} className="mb-3 text-xs text-ink-soft sm:sr-only">
        Scroll sideways if graph labels are hidden. Arrow keys work when the
        graph is focused.
      </p>
      <div
        role="region"
        aria-label={`${graph.title} scrollable graph`}
        aria-describedby={helpId}
        tabIndex={0}
        className="overflow-x-auto"
      >
        <svg
          role="img"
          aria-label={`${graph.title}. ${graph.xLabel} versus ${graph.yLabel}. Exact plotted values listed below.`}
          viewBox="0 0 600 320"
          className="w-full min-w-[520px]"
        >
          <path d="M65 55V250H535" fill="none" stroke="currentColor" />
          {ticks(ys, minY, maxY).map((value) => (
            <g key={value}>
              <line
                x1="65"
                y1={y(value)}
                x2="535"
                y2={y(value)}
                stroke="var(--color-border)"
              />
              <text
                x="54"
                y={y(value) + 5}
                textAnchor="end"
                fontSize="16"
                fill="currentColor"
              >
                {label(value)}
              </text>
            </g>
          ))}
          {ticks(xs, minX, maxX).map((value) => (
            <text
              key={value}
              x={x(value)}
              y="270"
              textAnchor="middle"
              fontSize="16"
              fill="currentColor"
            >
              {label(value)}
            </text>
          ))}
          {graph.series.map((s, i) => (
            <g key={s.label}>
              <polyline
                points={s.points.map((p) => `${x(p[0])},${y(p[1])}`).join(" ")}
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="2.5"
                strokeDasharray={i === 1 ? "7 4" : undefined}
              />
              {s.points.map((p, j) => (
                <circle
                  key={j}
                  cx={x(p[0])}
                  cy={y(p[1])}
                  r="4"
                  fill={colors[i % colors.length]}
                />
              ))}
            </g>
          ))}
          <text
            x="300"
            y="304"
            textAnchor="middle"
            fontSize="14"
            fill="currentColor"
          >
            {graph.xLabel}
          </text>
          <text
            x="17"
            y="155"
            transform="rotate(-90 17 155)"
            textAnchor="middle"
            fontSize="14"
            fill="currentColor"
          >
            {graph.yLabel}
          </text>
        </svg>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {graph.series.map((s, i) => (
          <span key={s.label} style={{ color: colors[i % colors.length] }}>
            {i === 1 ? "Dashed" : "Solid"} · {s.label}
          </span>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary>View exact plotted values</summary>
        {graph.series.map((s) => (
          <p className="mt-2" key={s.label}>
            {s.label}: {s.points.map((p) => `(${p[0]}, ${p[1]})`).join("; ")}
          </p>
        ))}
      </details>
    </figure>
  );
}
export function PassageView({
  passage,
  scrollHint = false,
}: {
  passage: Passage;
  scrollHint?: boolean;
}) {
  const tableHelpId = useId();
  return (
    <section
      aria-label="Practice passage"
      className="min-w-0 rounded-xl border border-border bg-bg-raised p-5"
    >
      <h2 className="text-lg font-semibold">{passage.title}</h2>
      {scrollHint && (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Scroll within the passage to continue reading.
        </p>
      )}
      <div className="prose-study mt-3 space-y-4 text-sm">
        {passage.context.split(/\n\s*\n/).map((paragraph, index) => (
          <p key={index}>
            <MathText>{paragraph}</MathText>
          </p>
        ))}
      </div>
      {passage.diagram && <ScienceDiagram kind={passage.diagram} />}
      {passage.table && (
        <div className="mt-5">
          <p id={tableHelpId} className="mb-3 text-xs text-ink-soft sm:sr-only">
            Scroll sideways if a column is hidden. Arrow keys work when the
            table is focused.
          </p>
          <div
            role="region"
            aria-label={`${passage.title} scrollable data table`}
            aria-describedby={tableHelpId}
            tabIndex={0}
            className="overflow-x-auto"
          >
            <table className="study-data w-full text-sm">
              <caption className="sr-only">Data for {passage.title}</caption>
              <thead>
                <tr>
                  {passage.table.columns.map((c, i) => (
                    <th scope="col" key={i}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {passage.table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((v, j) => (
                      <td key={j}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {passage.graph && (
        <Plot graph={passage.graph} passageTitle={passage.title} />
      )}
    </section>
  );
}
export function QuestionView({
  q,
  chosen,
  onChoose,
  revealed = false,
  disabled = false,
  eliminated = [],
  onEliminate,
  zoom = 1,
  evidenceRef,
  questionRef,
}: {
  q: Question;
  chosen: number | null;
  onChoose: (i: number | null) => void;
  revealed?: boolean;
  disabled?: boolean;
  eliminated?: number[];
  onEliminate?: (i: number) => void;
  zoom?: number;
  evidenceRef?: Ref<HTMLDivElement>;
  questionRef?: Ref<HTMLElement>;
}) {
  const method = revealed ? questionMethod(q) : null;
  const choiceOrder = displayChoiceOrder(q);
  return (
    <div
      ref={evidenceRef}
      tabIndex={evidenceRef ? -1 : undefined}
      role={evidenceRef ? "region" : undefined}
      aria-label={evidenceRef ? "Current question and evidence" : undefined}
      className={`scroll-mt-40 ${q.passage ? "grid min-w-0 gap-6 lg:grid-cols-2" : "min-w-0"}`}
      style={{ zoom }}
    >
      {q.passage && (
        <div
          key={q.passage.id}
          role={q.subject === "reading" ? "region" : undefined}
          aria-label={
            q.subject === "reading"
              ? "Scrollable reading passage; use arrow keys or scroll to read"
              : undefined
          }
          tabIndex={q.subject === "reading" ? 0 : undefined}
          className={
            q.subject === "reading"
              ? "reading-passage-pane max-h-[min(30rem,46dvh)] overflow-y-auto overscroll-contain rounded-xl"
              : "min-w-0"
          }
        >
          <PassageView
            passage={q.passage}
            scrollHint={q.subject === "reading"}
          />
        </div>
      )}
      <section
        ref={questionRef}
        tabIndex={questionRef ? -1 : undefined}
        className="min-w-0 scroll-mt-40"
        aria-label="Current question"
      >
        {q.stem && q.stem.trim() !== q.questionText.trim() && (
          <p className="prose-study mb-4">
            <MathText>{q.stem}</MathText>
          </p>
        )}
        <h2 className="mb-5 whitespace-pre-line text-lg font-semibold">
          <MathText>{q.questionText}</MathText>
        </h2>
        <MathDiagram id={q.id} />
        <div
          className={q.passage ? "space-y-3" : "grid gap-3 sm:grid-cols-2"}
          role="group"
          aria-label="Answer choices"
        >
          {choiceOrder.map((i, displayIndex) => (
            <div key={i} className="flex items-stretch gap-2">
              <button
                className="choice"
                aria-pressed={chosen === i}
                data-selected={chosen === i}
                data-correct={revealed && i === q.answer}
                data-wrong={revealed && chosen === i && i !== q.answer}
                onClick={() => onChoose(chosen === i ? null : i)}
                disabled={disabled || revealed || eliminated.includes(i)}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/25 text-xs font-semibold">
                  {letters[displayIndex]}
                </span>
                <span
                  className={
                    eliminated.includes(i) ? "line-through opacity-60" : ""
                  }
                >
                  <MathText>{q.choices[i]}</MathText>
                  {revealed && i === q.answer && (
                    <span className="ml-2 font-semibold">(correct)</span>
                  )}
                  {revealed && chosen === i && i !== q.answer && (
                    <span className="ml-2 font-semibold">(your answer)</span>
                  )}
                </span>
              </button>
              {onEliminate && !revealed && (
                <button
                  className="min-h-11 min-w-11 rounded-lg border border-border px-2 py-3 text-sm hover:bg-bg-raised"
                  onClick={() => onEliminate(i)}
                  aria-label={`${eliminated.includes(i) ? "Restore" : "Eliminate"} choice ${letters[displayIndex]}`}
                  aria-pressed={eliminated.includes(i)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="m3 3 10 10M13 3 3 13" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        {revealed && (
          <AnswerFeedback
            choices={choiceOrder.map((i) => q.choices[i])}
            answer={choiceOrder.indexOf(q.answer)}
            chosen={chosen === null ? null : choiceOrder.indexOf(chosen)}
            explanation={q.explanation}
          />
        )}
        {method && (
          <Link
            href={method.href}
            target="_blank"
            className="mt-4 inline-flex min-h-11 items-center text-sm text-brand underline"
          >
            Review the method: {method.label}
          </Link>
        )}
      </section>
    </div>
  );
}
