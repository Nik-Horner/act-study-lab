"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  CampaignAction,
  CampaignMission,
  CampaignSnapshot,
} from "@/lib/campaign-types";
import { groupParagraphs, parsePassage } from "@/lib/passage";
import { StudyIcon } from "./StudyIcon";
import { Button, ButtonLink } from "./ui/Button";
import { MathText } from "./MathText";
import { PassageView } from "./act/QuestionView";
import { MathDiagram } from "./act/MathDiagram";
import { DesmosPanel } from "./act/DesmosPanel";
import { AnswerFeedback } from "./AnswerFeedback";

type Progress = {
  missionId: string;
  cursor: number;
  completed: boolean;
  correct: number;
  stars: number;
};
const subjects = ["english", "math", "reading", "science"] as const;
const objectives = {
  english: "Edit in context. Sometimes the winning move is NO CHANGE.",
  math: "Choose the model, work the problem, check the result.",
  reading: "Read the passage. Make every answer earn its evidence.",
  science: "Read the data, track the experiment, test the claim.",
};
function Stars({ count }: { count: number }) {
  return (
    <span className="campaign-stars" aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <StudyIcon key={i} name="star" data-earned={i <= count} />
      ))}
    </span>
  );
}

export function Campaign({
  ownerId,
  catalog,
  missionId,
  selectedSubject,
}: {
  ownerId: string;
  catalog: CampaignMission[];
  missionId?: string;
  selectedSubject?: string;
}) {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [snapshot, setSnapshot] = useState<CampaignSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [mobilePane, setMobilePane] = useState("passage");
  const [topicFilter, setTopicFilter] = useState("");
  const guard = useRef(false),
    started = useRef(0),
    retry = useRef<CampaignAction | null>(null);
  const movePanel = useRef<HTMLElement>(null);
  const focusStep = useRef<"feedback" | "question" | null>(null);
  const mission = catalog.find((m) => m.id === missionId);
  const subject =
    mission?.subject ??
    subjects.find((s) => s === selectedSubject) ??
    "english";
  const current = reviewIndex ?? snapshot?.state?.cursor ?? 0;
  const question = snapshot?.questions[current];
  const feedback = snapshot?.feedback[current];
  const complete = !!snapshot?.state?.completedAt;
  const reviewed = reviewIndex !== null;

  useEffect(() => {
    if (!pending && focusStep.current) {
      const target =
        focusStep.current === "feedback"
          ? movePanel.current?.querySelector<HTMLButtonElement>(
              "[data-next-round]",
            )
          : movePanel.current;
      target?.focus({ preventScroll: true });
      focusStep.current = null;
    }
  }, [snapshot, pending]);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      ownerId,
      ...(missionId ? { mission: missionId } : {}),
    });
    fetch(`/api/campaign?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error ?? "Your mission could not load.");
        if (controller.signal.aborted) return;
        if (missionId) {
          setSnapshot(result);
          setChoice(null);
          setEliminated([]);
          setReviewIndex(null);
          setMobilePane(
            result.state?.cursor || result.feedback?.length
              ? "question"
              : "passage",
          );
        } else setProgress(result.states);
        setLoaded(true);
        setError(null);
        started.current = Date.now();
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setError(failure.message);
          setLoaded(true);
        }
      });
    return () => controller.abort();
  }, [ownerId, missionId, refresh]);

  async function move(action: CampaignAction) {
    if (guard.current) return;
    guard.current = true;
    setPending(true);
    setError(null);
    retry.current = action;
    try {
      const response = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...action, ownerId, missionId }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "Move not saved. Retry before continuing.",
        );
      setSnapshot(result);
      focusStep.current =
        action.action === "answer"
          ? "feedback"
          : action.action === "next"
            ? "question"
            : null;
      retry.current = null;
      setChoice(null);
      setEliminated([]);
      if (action.action !== "answer") {
        started.current = Date.now();
        setMobilePane(action.action === "start" ? "passage" : "question");
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Your move could not save. Retry.",
      );
    } finally {
      guard.current = false;
      setPending(false);
    }
  }
  const errorView = error && (
    <div role="alert" className="campaign-error">
      <p>{error}</p>
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() =>
          retry.current ? void move(retry.current) : setRefresh((v) => v + 1)
        }
      >
        Retry
      </Button>
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() => {
          retry.current = null;
          setRefresh((v) => v + 1);
        }}
      >
        Reload saved progress
      </Button>
    </div>
  );

  if (!mission) {
    const selected = catalog.filter((m) => m.subject === subject);
    const topics = [
      ...new Map(
        selected.flatMap((m) => m.topics.map((t) => [t.slug, t] as const)),
      ).values(),
    ];
    const visible = selected.filter(
      (m) => !topicFilter || m.topics.some((t) => t.slug === topicFilter),
    );
    const cleared = progress.filter((p) => p.completed).length;
    const stars = progress.reduce((sum, p) => sum + p.stars, 0);
    const next =
      selected.find((m) =>
        progress.some((p) => p.missionId === m.id && !p.completed),
      ) ?? selected.find((m) => !progress.some((p) => p.missionId === m.id));
    return (
      <div className="campaign-map" data-subject={subject}>
        <header className="campaign-heading">
          <div>
            <h1>
              Learn the rules.
              <br />
              <span>Play the ACT.</span>
            </h1>
            <p>
              Real passage and problem-set decisions. One mission at a time.
            </p>
          </div>
          <div className="campaign-earned" aria-live="polite">
            <StudyIcon name="star" />
            <strong>{stars} stars</strong>
            <span>
              All subjects · {cleared}/{catalog.length} missions cleared
            </span>
          </div>
        </header>
        <nav className="campaign-subjects" aria-label="Campaign subjects">
          {subjects.map((s) => (
            <Link
              key={s}
              href={`/play?subject=${s}`}
              aria-current={s === subject ? "page" : undefined}
              data-subject={s}
            >
              <StudyIcon name={s} />
              <span>{s}</span>
            </Link>
          ))}
        </nav>
        {errorView}
        {!loaded ? (
          <p role="status">Loading your saved campaign…</p>
        ) : (
          <>
            <div className="campaign-map-intro">
              <div>
                <h2>{objectives[subject]}</h2>
                <p>
                  {selected.length} missions · {topics.length} question
                  families. Practice at your pace.
                </p>
              </div>
              {next && (
                <ButtonLink href={`/play?mission=${next.id}`}>
                  {progress.some((p) => p.missionId === next.id)
                    ? "Resume mission"
                    : "Play next mission"}
                </ButtonLink>
              )}
            </div>
            <details className="campaign-star-rules">
              <summary>How stars work</summary>
              <p>
                Finish a mission for one star, reach 60% first-attempt accuracy
                for two, or 85% for three. Replays do not add stars.
              </p>
            </details>
            <label className="campaign-topic-filter">
              Practice a question family
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
              >
                <option value="">All question families</option>
                {topics.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <ol className="campaign-path" aria-label={`${subject} missions`}>
              {visible.map((m, index) => {
                const saved = progress.find((p) => p.missionId === m.id);
                return (
                  <li key={m.id} data-complete={saved?.completed}>
                    <Link href={`/play?mission=${m.id}`}>
                      <span className="campaign-node">
                        {saved?.completed ? (
                          <StudyIcon name="check" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="campaign-stop-copy">
                        <strong>{m.title}</strong>
                        <small>
                          {m.count} questions ·{" "}
                          {m.topics.length === 1
                            ? m.topics[0].title
                            : `${m.topics.length} question families in context`}
                        </small>
                        {saved && !saved.completed && (
                          <small>Round {saved.cursor + 1} · place saved</small>
                        )}
                      </span>
                      <Stars count={saved?.stars ?? 0} />
                      <StudyIcon name="arrow" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </>
        )}
        <section className="campaign-truth">
          <h2>Same decisions. A different way to train.</h2>
          <p>
            English keeps full passages, highlighted edits, NO CHANGE, and
            whole-passage questions. Reading and Science keep their shared
            texts, tables, graphs, and diagrams. Math keeps its original
            problems and answer choices. The coach appears after you commit your
            answer.
          </p>
          <p>
            Some missions use questions you may have practiced elsewhere.
            Campaign stars are separate from Daily XP and course coverage. Your
            earlier progress stays saved. These are original practice materials,
            not official ACT questions or a scaled-score prediction.
          </p>
          <Link href="/exam">Practice a full timed section</Link> ·{" "}
          <Link href="/learn">Learn a rule in the course</Link> ·{" "}
          <a
            href="https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep.html"
            target="_blank"
            rel="noreferrer"
          >
            Official ACT practice
          </a>
        </section>
      </div>
    );
  }
  if (!loaded || (!snapshot && !error))
    return <p role="status">Loading the mission…</p>;
  if (!snapshot)
    return (
      <div>
        <h1>{mission.title}</h1>
        {errorView}
      </div>
    );
  if (!snapshot.state)
    return (
      <section className="campaign-briefing" data-subject={subject}>
        <Link href={`/play?subject=${subject}`}>Back to the campaign</Link>
        <StudyIcon name={subject} size={48} />
        <h1>{mission.title}</h1>
        <p>{objectives[subject]}</p>
        <ol>
          <li>Read the passage or problem in its original context.</li>
          <li>Choose an answer and lock in your move.</li>
          <li>See the rule and the trap, then play the next round.</li>
        </ol>
        <p>
          {mission.count} questions · No countdown · Progress saves after each
          move.
        </p>
        <p>
          First answers determine stars. Reviewing a completed mission earns no
          additional stars. A miss keeps its original result while you learn
          from the explanation.
        </p>
        {errorView}
        <Button
          disabled={pending}
          onClick={() => void move({ action: "start" })}
        >
          {pending ? "Saving…" : "Start mission"}
        </Button>
      </section>
    );
  if (complete && !reviewed)
    return (
      <section className="campaign-clear" data-subject={subject}>
        <Stars count={snapshot.stars} />
        <h1>Mission cleared.</h1>
        <h2>{mission.title}</h2>
        <p>
          <strong>
            {snapshot.correct} / {mission.count}
          </strong>{" "}
          correct on the first attempt in this mission
        </p>
        <p>
          {snapshot.stars === 3
            ? "Strong run. Take these rules into your next mission."
            : "You finished the mission. Review the tricky moves, then test the rules in another set."}
        </p>
        <p>
          Your first answers and stars are saved. These stars measure this
          mission, not an ACT score or full skill mastery.
        </p>
        <div>
          <ButtonLink href={`/play?subject=${subject}`}>
            Choose your next mission
          </ButtonLink>
          <Button
            variant="ghost"
            onClick={() => {
              setReviewIndex(0);
              setMobilePane("question");
              window.scrollTo({ top: 0, behavior: "auto" });
            }}
          >
            Review saved moves
          </Button>
        </div>
        <Link href="/dashboard">Back to today’s lessons</Link>
      </section>
    );
  if (!question)
    return (
      <div role="alert">
        This mission could not be read.{" "}
        <Link href="/play">Return to your campaign</Link>
      </div>
    );
  return (
    <article className="campaign-run" data-subject={subject}>
      <header className="campaign-run-header">
        <Link href={`/play?subject=${subject}`}>Campaign map</Link>
        <span>
          {reviewed
            ? "Saved review · no new stars"
            : `Round ${current + 1} of ${mission.count}`}
        </span>
        <span>
          {snapshot.correct} correct · {snapshot.state.answers.length} saved
        </span>
      </header>
      <h1>{mission.title}</h1>
      <div className="campaign-rounds" aria-label="Mission rounds">
        {snapshot.questions.map((q, i) => (
          <span
            key={q.id}
            data-state={
              i === current
                ? "current"
                : snapshot.feedback[i]
                  ? snapshot.feedback[i].chosen === snapshot.feedback[i].answer
                    ? "correct"
                    : "review"
                  : "next"
            }
            aria-label={`Round ${i + 1}: ${i === current ? "current" : snapshot.feedback[i] ? (snapshot.feedback[i].chosen === snapshot.feedback[i].answer ? "correct" : "review") : "next"}`}
          >
            {snapshot.feedback[i]?.chosen === snapshot.feedback[i]?.answer &&
            snapshot.feedback[i] ? (
              <StudyIcon name="check" size={16} />
            ) : (
              i + 1
            )}
          </span>
        ))}
      </div>
      {errorView}
      <div
        className="campaign-pane-tabs"
        role="group"
        aria-label="Question view"
      >
        <button
          aria-pressed={mobilePane === "passage"}
          onClick={() => setMobilePane("passage")}
        >
          {question.englishPassage || question.passage
            ? "Passage & evidence"
            : "Problem"}
        </button>
        <button
          aria-pressed={mobilePane === "question"}
          onClick={() => setMobilePane("question")}
        >
          Question {current + 1}
        </button>
      </div>
      {subject === "math" && <DesmosPanel subject="math" />}
      <div className="campaign-board" data-mobile-pane={mobilePane}>
        <section
          className="campaign-evidence"
          aria-label="Passage and evidence"
          tabIndex={0}
        >
          {question.englishPassage ? (
            <>
              <h2>{question.englishPassage.title}</h2>
              <p className="campaign-instruction">
                Read the full passage. Highlighted text belongs to this
                question; some questions refer to the passage as a whole.
              </p>
              {groupParagraphs(parsePassage(question.englishPassage.html)).map(
                (parts, i) => (
                  <p key={i}>
                    {parts.map((part, j) =>
                      part.type === "text" ? (
                        <span key={j}>{part.value}</span>
                      ) : (
                        <span
                          key={j}
                          className="campaign-mark"
                          data-active={part.number === question.number}
                        >
                          <sup>{part.number}</sup>
                          {part.text || " [insertion point] "}
                        </span>
                      ),
                    )}
                  </p>
                ),
              )}
            </>
          ) : question.passage ? (
            <>
              <PassageView passage={question.passage} />
              <MathDiagram id={question.id} />
            </>
          ) : (
            <>
              <h2>The problem</h2>
              <div className="campaign-problem">
                <MathText>{question.stem || question.questionText}</MathText>
                <MathDiagram id={question.id} />
              </div>
            </>
          )}
          <button
            className="campaign-to-question"
            onClick={() => setMobilePane("question")}
          >
            Answer question {current + 1}
            <StudyIcon name="arrow" size={18} />
          </button>
        </section>
        <section
          ref={movePanel}
          tabIndex={-1}
          className="campaign-move"
          aria-label="Your move"
        >
          {question.passage &&
            question.stem &&
            question.stem !== question.questionText && (
              <p>
                <MathText>{question.stem}</MathText>
              </p>
            )}
          <h2>
            <MathText>{question.questionText}</MathText>
          </h2>
          <div
            role="group"
            aria-label="Answer choices"
            className="answer-choices campaign-choices"
          >
            {question.choices.map((text, index) => (
              <div key={index} className="answer-choice-row">
                <button
                  className="choice"
                  aria-pressed={(feedback?.chosen ?? choice) === index}
                  data-selected={(feedback?.chosen ?? choice) === index}
                  data-correct={
                    feedback ? feedback.answer === index : undefined
                  }
                  data-wrong={
                    feedback
                      ? feedback.chosen === index && feedback.answer !== index
                      : undefined
                  }
                  data-eliminated={eliminated.includes(index)}
                  disabled={!!feedback || pending || !!error}
                  onClick={() => {
                    setChoice(index);
                    setEliminated(eliminated.filter((i) => i !== index));
                  }}
                >
                  <span className="answer-letter">{"ABCD"[index]}</span>
                  <span
                    className={
                      eliminated.includes(index) ? "campaign-eliminated" : ""
                    }
                  >
                    <MathText>{text}</MathText>
                  </span>
                </button>
                {!feedback && (
                  <button
                    className="answer-eliminate"
                    aria-label={`${eliminated.includes(index) ? "Restore" : "Eliminate"} choice ${"ABCD"[index]}`}
                    aria-pressed={eliminated.includes(index)}
                    disabled={pending || !!error}
                    onClick={() => {
                      setEliminated(
                        eliminated.includes(index)
                          ? eliminated.filter((i) => i !== index)
                          : [...eliminated, index],
                      );
                      if (choice === index) setChoice(null);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {!feedback ? (
            <>
              <Button
                disabled={choice === null || pending || !!error}
                onClick={() =>
                  choice !== null &&
                  void move({
                    action: "answer",
                    revision: snapshot.state!.revision,
                    choice,
                    seconds: Math.min(
                      86400,
                      Math.max(0, (Date.now() - started.current) / 1000),
                    ),
                  })
                }
              >
                {pending ? "Saving your move…" : "Lock in answer"}
              </Button>
              <p className="campaign-instruction">
                Commit first. The rule and explanation appear after your answer
                saves.
              </p>
            </>
          ) : (
            <>
              <AnswerFeedback
                choices={question.choices}
                answer={feedback.answer}
                chosen={feedback.chosen}
                explanation={feedback.explanation}
              />
              <Link
                className="campaign-rule-link"
                href={`/learn/${feedback.topic.slug}?reference=1`}
                target="_blank"
              >
                Open the rulebook: {feedback.topic.title}
              </Link>
              <Button
                data-next-round
                disabled={pending || !!error}
                onClick={() => {
                  if (reviewed) {
                    setReviewIndex(
                      current + 1 < mission.count ? current + 1 : null,
                    );
                    window.scrollTo({ top: 0, behavior: "auto" });
                  } else
                    void move({
                      action: "next",
                      revision: snapshot.state!.revision,
                    });
                }}
              >
                {pending
                  ? "Saving…"
                  : current + 1 === mission.count
                    ? reviewed
                      ? "Back to mission result"
                      : "Clear mission"
                    : "Next round"}
              </Button>
            </>
          )}
        </section>
      </div>
      <p className="campaign-instruction">
        Original ACT-style training. Coaching is between questions; full timed
        sections keep test-day timing.
      </p>
    </article>
  );
}
