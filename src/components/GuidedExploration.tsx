"use client";

import { useState } from "react";
import { bikeRentalCost, explorationContent } from "@/lib/lesson-interaction";
import { Button } from "./ui/Button";

/** These original examples are attached only to the exact method they teach. */
export function GuidedExploration({
  skillId,
  compact = false,
}: {
  skillId?: string;
  compact?: boolean;
}) {
  switch (skillId) {
    case "math-modeling-linear-models":
      return <CostExploration compact={compact} />;
    case "dependent-boundary":
      return <ClauseExploration compact={compact} />;
    case "reading-inference-evidence-link":
      return <ReadingExploration compact={compact} />;
    case "science-experimental-design-confounds":
      return <ScienceExploration compact={compact} />;
    default:
      return null;
  }
}

export function ClauseRecognitionExploration({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [dependent, setDependent] = useState(false);
  const [focus, setFocus] = useState<"subject" | "verb">("subject");
  return (
    <section
      className={`exploration ${compact ? "exploration-compact" : ""}`}
      aria-label="Explore subjects, verbs, and complete clauses"
    >
      <div className="exploration-scene">
        <h3>Make a complete thought.</h3>
        <p>Find the subject and verb. Then add “while” and see what changes.</p>
        <div className="clause-assembly" aria-live="polite">
          <span>
            {dependent ? "While the " : "The "}
            {focus === "subject" ? <mark>lantern</mark> : "lantern"}{" "}
            {focus === "verb" ? <mark>flickered</mark> : "flickered"}
            {dependent ? "…" : "."}
          </span>
        </div>
        <div
          className="exploration-controls"
          role="group"
          aria-label="Find each word’s job"
        >
          <Button
            variant="ghost"
            aria-pressed={focus === "subject"}
            onClick={() => setFocus("subject")}
          >
            Find the subject
          </Button>
          <Button
            variant="ghost"
            aria-pressed={focus === "verb"}
            onClick={() => setFocus("verb")}
          >
            Find the verb
          </Button>
        </div>
        <div
          className="exploration-controls"
          role="group"
          aria-label="Change the clause"
        >
          <Button
            variant="ghost"
            aria-pressed={!dependent}
            onClick={() => setDependent(false)}
          >
            Stand-alone sentence
          </Button>
          <Button
            variant="ghost"
            aria-pressed={dependent}
            onClick={() => setDependent(true)}
          >
            Add “while”
          </Button>
        </div>
        <p className="exploration-answer" aria-live="polite">
          {dependent
            ? "The subject and verb are still here. “While” makes us wait for the rest of the thought."
            : "The lantern flickered. We know what happened; the thought can stand alone."}
        </p>
      </div>
      <div className="exploration-task" hidden={compact}>
        <h3>
          {focus === "subject"
            ? "Who or what is doing it?"
            : "What is happening?"}
        </h3>
        <p aria-live="polite">
          {focus === "subject"
            ? "Lantern is the subject: the thing the sentence is about."
            : "Flickered is the main verb: it tells what the lantern did. Its past-tense form can serve as the sentence’s main action."}
        </p>
        <div className="exploration-relationship">
          <span>Subject: lantern</span>
          <span>Verb: flickered</span>
          <strong>
            {dependent ? "Dependent clause" : "Independent clause"}
          </strong>
        </div>
        <p>
          A clause has a subject and a verb. An independent clause also
          expresses a complete thought. A dependent clause needs a main clause
          to finish its meaning.
        </p>
        <p>
          {dependent
            ? "While the lantern flickered, the guide checked the map. The added main clause finishes the thought."
            : "Try adding “while.” A subject and verb alone do not guarantee a complete sentence."}
        </p>
      </div>
    </section>
  );
}

function CostExploration({ compact }: { compact: boolean }) {
  const [hours, setHours] = useState(2);
  const [oneHourAnswer, setOneHourAnswer] = useState<number | null>(null);
  const cost = bikeRentalCost(hours);
  const x = (h: number) => 60 + h * 95;
  const y = (amount: number) => 300 - amount * 22;
  return (
    <section
      className="exploration"
      data-compact={compact}
      aria-label="Explore a linear cost model"
    >
      <div className="exploration-scene">
        <h3>
          {compact
            ? "$3 to start. Add $2 per hour."
            : "Build the cost, one hour at a time."}
        </h3>
        {!compact && (
          <p>A bike rental costs $3 to start, plus $2 for each hour.</p>
        )}
        <svg
          viewBox="0 0 500 350"
          role="img"
          aria-label={`Hours versus total cost. A zero-hour rental costs 3 dollars; each hour adds 2 dollars. ${hours} hours costs ${cost} dollars.`}
        >
          {[0, 2, 4, 6, 8, 10, 12].map((amount) => (
            <g key={amount}>
              <path d={`M60 ${y(amount)}H455`} stroke="var(--color-border)" />
              <text
                x="45"
                y={y(amount) + 5}
                textAnchor="end"
                fill="currentColor"
                fontSize="15"
              >
                {amount}
              </text>
            </g>
          ))}
          <path d="M60 20V300H465" fill="none" stroke="currentColor" />
          <polyline
            points={[0, 1, 2, 3, 4]
              .map((h) => `${x(h)},${y(bikeRentalCost(h))}`)
              .join(" ")}
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="4"
          />
          {[0, 1, 2, 3, 4].map((h) => (
            <g key={h}>
              <circle
                cx={x(h)}
                cy={y(bikeRentalCost(h))}
                r={h === hours ? 8 : 5}
                fill="var(--color-brand)"
                stroke={h === hours ? "var(--color-good-soft)" : "none"}
                strokeWidth="6"
              />
              <text
                x={x(h)}
                y="323"
                textAnchor="middle"
                fill="currentColor"
                fontSize="16"
              >
                {h}
              </text>
              {!compact && (
                <text
                  x={x(h) + (h === 4 ? -8 : 12)}
                  y={y(bikeRentalCost(h)) + 22}
                  textAnchor={h === 4 ? "end" : "start"}
                  fill="currentColor"
                  fontSize="14"
                >
                  ({h}, {bikeRentalCost(h)})
                </text>
              )}
            </g>
          ))}
          <rect
            x={Math.min(425, Math.max(85, x(hours))) - 27}
            y={y(cost) - 51}
            width="54"
            height="34"
            rx="8"
            fill="var(--subject-english-soft)"
          />
          <text
            x={Math.min(425, Math.max(85, x(hours)))}
            y={y(cost) - 27}
            textAnchor="middle"
            fontWeight="700"
            fontSize="22"
            fill="currentColor"
          >
            ${cost}
          </text>
          <text
            x="275"
            y="347"
            textAnchor="middle"
            fontSize="15"
            fill="currentColor"
          >
            Hours
          </text>
          <text
            x="18"
            y="160"
            transform="rotate(-90 18 160)"
            textAnchor="middle"
            fontSize="15"
            fill="currentColor"
          >
            Total cost ($)
          </text>
        </svg>
        <div
          className="exploration-controls"
          role="group"
          aria-label="Change rental hours"
        >
          <Button
            variant="ghost"
            disabled={hours === 0}
            onClick={() => setHours(hours - 1)}
            aria-label="One fewer rental hour"
          >
            −
          </Button>
          <output aria-live="polite">
            {hours} {hours === 1 ? "hour" : "hours"}
          </output>
          <Button
            variant="ghost"
            disabled={hours === 4}
            onClick={() => setHours(hours + 1)}
            aria-label="One more rental hour"
          >
            +
          </Button>
        </div>
        <p className="exploration-equation" aria-live="polite">
          3 + 2 × {hours} = <strong>{cost}</strong>
        </p>
      </div>
      <div className="exploration-task" hidden={compact}>
        <h3>First, a smaller step.</h3>
        <p>Keep the $3 starting cost. Add $2 once.</p>
        <div className="cost-reasoning">
          <div>
            <strong>$3</strong>
            <span>starting cost</span>
          </div>
          <b aria-hidden="true">+</b>
          <div>
            <strong>$2</strong>
            <span>for 1 hour</span>
          </div>
          <b aria-hidden="true">=</b>
          <div>
            <strong>$5</strong>
            <span>total cost</span>
          </div>
        </div>
        <h4 className="cost-prompt">What does 1 hour cost?</h4>
        <div
          className="cost-answers"
          role="group"
          aria-label="One-hour cost choices"
        >
          {[2, 3, 5, 6].map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={oneHourAnswer === value}
              data-selected={oneHourAnswer === value}
              data-correct={
                oneHourAnswer === value && value === bikeRentalCost(1)
              }
              onClick={() => setOneHourAnswer(value)}
            >
              ${value}
              {oneHourAnswer === value && value === bikeRentalCost(1) && (
                <span aria-label="Correct">✓</span>
              )}
            </button>
          ))}
        </div>
        {oneHourAnswer !== null && (
          <p
            role="status"
            className={`cost-feedback ${oneHourAnswer === bikeRentalCost(1) ? "is-correct" : ""}`}
          >
            {oneHourAnswer === bikeRentalCost(1)
              ? "Yes. Starting cost + one hour."
              : "Keep both parts: the $3 starting cost and $2 for one hour."}
          </p>
        )}
        <p className="study-caption">
          This example is unscored. Independent practice uses new questions.
        </p>
      </div>
    </section>
  );
}

function ClauseExploration({ compact }: { compact: boolean }) {
  const [join, setJoin] = useState(",");
  const { first, second } = explorationContent.sentence;
  return (
    <section
      className="exploration"
      data-compact={compact}
      aria-label="Build a sentence with a dependent clause"
    >
      <div className="exploration-scene">
        <h3>Make the two parts work together.</h3>
        <div className="clause-assembly">
          <span>
            <mark>Although</mark> the trail was muddy
          </span>
          <strong>{join}</strong>
          <span>{second}.</span>
        </div>
        <div
          className="exploration-controls"
          role="group"
          aria-label="Choose a sentence boundary"
        >
          {[",", ";", "."].map((punctuation) => (
            <Button
              key={punctuation}
              variant="ghost"
              aria-pressed={join === punctuation}
              aria-label={
                punctuation === ","
                  ? "Comma"
                  : punctuation === ";"
                    ? "Semicolon"
                    : "Period"
              }
              onClick={() => setJoin(punctuation)}
            >
              {punctuation}
            </Button>
          ))}
        </div>
        <p className="exploration-answer" aria-live="polite">
          {join === ","
            ? `${first}, ${second}.`
            : "Although makes the opening dependent. It cannot stand as its own sentence."}
        </p>
      </div>
      <div className="exploration-task" hidden={compact}>
        <h3>Find the part that needs support.</h3>
        <p>
          <strong>Although the trail was muddy</strong> has a subject and a
          verb, but “although” leaves the thought unfinished.
        </p>
        <p>
          <strong>The hikers reached the lookout</strong> can stand alone.
        </p>
        <div className="exploration-relationship">
          <span>Dependent opening</span>
          <strong>comma</strong>
          <span>Complete main clause</span>
        </div>
        <p>
          A comma attaches the opening to its main clause. A semicolon would
          need a complete clause on both sides.
        </p>
      </div>
    </section>
  );
}

function ReadingExploration({ compact }: { compact: boolean }) {
  const [clue, setClue] = useState<number | null>(null);
  const { sentences, inference } = explorationContent.reading;
  return (
    <section
      className="exploration"
      data-compact={compact}
      aria-label="Link an inference to text evidence"
    >
      <div className="exploration-scene">
        <h3>Find the clue behind the feeling.</h3>
        <p>Tap the sentence that best supports “Mina is nervous.”</p>
        <div
          className="exploration-excerpt"
          role="group"
          aria-label="Select the strongest evidence"
        >
          {sentences.map((sentence, index) => (
            <button
              key={sentence}
              type="button"
              aria-pressed={clue === index}
              onClick={() => setClue(index)}
            >
              {sentence}
            </button>
          ))}
        </div>
      </div>
      <div className="exploration-task" hidden={compact}>
        <h3>One clue. One small inference.</h3>
        <div className="exploration-evidence-link" aria-live="polite">
          <p>
            <strong>Clue</strong>
            {clue === null
              ? "Choose a sentence from the scene."
              : sentences[clue]}
          </p>
          <p>
            <strong>What it supports</strong>
            {clue === explorationContent.reading.clue
              ? inference
              : clue === 0
                ? "She prepared for the recital. Preparation alone does not tell us how she feels now."
                : clue === 2
                  ? "She goes onstage despite her pause. Her damp palms in the previous sentence are the clearest clue to nervousness."
                  : "Use an action or detail to support the feeling."}
          </p>
        </div>
        <p>
          Do not jump from “nervous” to “unprepared” or “certain to fail.”
          Neither conclusion is supported.
        </p>
      </div>
    </section>
  );
}

function ScienceExploration({ compact }: { compact: boolean }) {
  const [pair, setPair] = useState("A–B");
  const { columns, rows } = explorationContent.science;
  const fair = pair === "A–C";
  return (
    <section
      className="exploration"
      data-compact={compact}
      aria-label="Compare controlled fertilizer treatments"
    >
      <div className="exploration-scene">
        <h3>Change one cause at a time.</h3>
        <p>
          Plants of the same species grow for 14 days with the same soil and
          light. Which comparison isolates fertilizer?
        </p>
        <div
          className="overflow-x-auto"
          role="region"
          tabIndex={0}
          aria-label="Fertilizer experiment data"
        >
          <table className="study-data">
            <caption className="sr-only">
              Fertilizer and water experiment
            </caption>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th scope="col" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[0]} data-selected={pair.includes(String(row[0]))}>
                  {row.map((value, index) =>
                    index === 0 ? (
                      <th key={index} scope="row">
                        {value}
                      </th>
                    ) : (
                      <td key={index}>{value}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="exploration-controls"
          role="group"
          aria-label="Compare two treatment groups"
        >
          {["A–B", "A–C", "B–C"].map((value) => (
            <Button
              key={value}
              variant="ghost"
              aria-pressed={pair === value}
              onClick={() => setPair(value)}
            >
              Groups {value}
            </Button>
          ))}
        </div>
      </div>
      <div className="exploration-task" hidden={compact}>
        <h3>{fair ? "Now the comparison is fair." : "What else changed?"}</h3>
        <div className="exploration-relationship" aria-live="polite">
          <span>
            {pair === "B–C"
              ? "Fertilizer stays at 5 g"
              : "Fertilizer changes: 0 → 5 g"}
          </span>
          <span>
            {fair ? "Water stays at 50 mL" : "Water changes: 50 ↔ 100 mL"}
          </span>
        </div>
        <p>
          {fair
            ? "A and C receive the same water. Their fertilizer differs, so this comparison tests fertilizer under the stated conditions. Mean growth differs by 3 cm."
            : pair === "A–B"
              ? "Both fertilizer and water change. The growth difference cannot be attributed to fertilizer alone."
              : "B and C receive the same fertilizer but different water. This pair tests the water change."}
        </p>
        <p>
          Compare groups that differ in the variable you want to test. Keep
          other conditions the same.
        </p>
      </div>
    </section>
  );
}
