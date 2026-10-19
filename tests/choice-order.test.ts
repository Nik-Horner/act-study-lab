import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { displayChoiceOrder } from "../src/lib/act/choice-order";
import { getAllQuestions, getExamQuestions } from "../src/lib/act/content";
import {
  createDefaultState,
  recordAnswer,
  recordExam,
} from "../src/lib/act/progress-model";
import { QuestionView } from "../src/components/act/QuestionView";
import { AnswerFeedback } from "../src/components/AnswerFeedback";

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Record<string, unknown>>(child)) return [];
    return [child, ...elements(child.props.children as ReactNode)];
  });
}

function click(button: ReactElement<Record<string, unknown>>) {
  assert.equal(button.type, "button");
  assert.equal(typeof button.props.onClick, "function");
  (button.props.onClick as () => void)();
}

test("Reading display order is a stable invertible permutation while other subjects retain their order", () => {
  for (const question of getAllQuestions()) {
    const order = displayChoiceOrder(question);
    assert.deepEqual(
      [...order].sort(),
      question.choices.map((_, index) => index),
      question.id,
    );
    assert.deepEqual(
      displayChoiceOrder(JSON.parse(JSON.stringify(question))),
      order,
      question.id,
    );
    for (const canonical of order)
      assert.equal(order[order.indexOf(canonical)], canonical, question.id);
    if (question.subject !== "reading")
      assert.deepEqual(
        order,
        question.choices.map((_, index) => index),
        question.id,
      );
  }
  assert.deepEqual(
    displayChoiceOrder(getExamQuestions("reading-1")[0]),
    [0, 3, 2, 1],
  );
  assert.deepEqual(
    displayChoiceOrder(getExamQuestions("reading-2")[0]),
    [1, 0, 2, 3],
  );
});

test("Reading forms no longer expose their repeating authored answer-position sequence", () => {
  for (const examId of ["reading-1", "reading-2"]) {
    const questions = getExamQuestions(examId);
    const authored = questions.map((question) => question.answer);
    const displayed = questions.map((question) =>
      displayChoiceOrder(question).indexOf(question.answer),
    );
    assert.notDeepEqual(displayed, authored);
    assert.equal(new Set(displayed).size, 4);
    assert(
      displayed.filter((position, index) => position !== authored[index])
        .length > 18,
    );
    assert.notDeepEqual(displayed.slice(0, 9), displayed.slice(9, 18));
  }
});

test("visible buttons submit canonical Reading indices to both drill and section persistence", () => {
  const questions = getExamQuestions("reading-1");
  const answers: Record<string, number | null> = {};
  let state = createDefaultState();
  for (const question of questions) {
    let selected: number | null = null;
    const buttons = elements(
      QuestionView({
        q: question,
        chosen: null,
        onChoose: (canonical) => {
          selected = canonical;
        },
      }),
    ).filter(
      (element) =>
        element.type === "button" && element.props.className === "choice",
    );
    const displayIndex = displayChoiceOrder(question).indexOf(question.answer);
    click(buttons[displayIndex]);
    assert.equal(selected, question.answer, question.id);
    answers[question.id] = selected;
    state = recordAnswer(state, {
      id: `drill-${question.id}`,
      questionId: question.id,
      chosen: selected,
      elapsedMs: 1000,
      confidence: "high",
      cause: null,
      at: "2026-10-14T12:00:00.000Z",
      mode: "drill",
    });
  }
  const submitted = recordExam(
    state,
    {
      id: "permutation-section",
      examId: "reading-1",
      startedAt: "2026-10-14T12:00:00.000Z",
      completedAt: "2026-10-14T12:40:00.000Z",
      answers,
      elapsedSeconds: 2400,
    },
    questions,
  );
  for (const question of questions) {
    assert.equal(
      submitted.answers.find((record) => record.id === `drill-${question.id}`)
        ?.chosen,
      question.answer,
    );
    assert.equal(submitted.attempts[0].answers[question.id], question.answer);
    assert.equal(
      submitted.answers.find(
        (record) => record.id === `permutation-section:${question.id}`,
      )?.chosen,
      question.answer,
    );
  }
});

test("selection, deselection and elimination retain canonical indices and visible labels on resume", () => {
  const question = getExamQuestions("reading-1")[0];
  const order = displayChoiceOrder(question);
  const saved = JSON.parse(
    JSON.stringify({ chosen: order[2], eliminated: [order[1]] }),
  );
  let selected: number | null = saved.chosen;
  let eliminated: number | null = null;
  const rendered = elements(
    QuestionView({
      q: question,
      chosen: saved.chosen,
      eliminated: saved.eliminated,
      onChoose: (canonical) => {
        selected = canonical;
      },
      onEliminate: (canonical) => {
        eliminated = canonical;
      },
    }),
  );
  const choices = rendered.filter(
    (element) =>
      element.type === "button" && element.props.className === "choice",
  );
  assert.equal(choices[2].props["aria-pressed"], true);
  assert.equal(choices[1].props.disabled, true);
  click(choices[2]);
  assert.equal(selected, null);
  click(choices[0]);
  assert.equal(selected, order[0]);
  const exclusions = rendered.filter(
    (element) =>
      element.type === "button" &&
      typeof element.props["aria-label"] === "string",
  );
  assert.equal(exclusions[1].props["aria-label"], "Restore choice B");
  click(exclusions[1]);
  assert.equal(eliminated, order[1]);
});

test("review feedback maps the same saved answer to the same displayed text and letter", () => {
  const question = getExamQuestions("reading-1")[0];
  const order = displayChoiceOrder(question);
  const savedChoice = order[0];
  const rendered = QuestionView({
    q: question,
    chosen: savedChoice,
    onChoose: () => {},
    revealed: true,
  });
  const feedback = elements(rendered).find(
    (element) => element.type === AnswerFeedback,
  )!;
  assert(feedback);
  assert.deepEqual(
    feedback.props.choices,
    order.map((canonical) => question.choices[canonical]),
  );
  assert.equal(feedback.props.chosen, 0);
  assert.equal(feedback.props.answer, order.indexOf(question.answer));
  const html = renderToStaticMarkup(feedback);
  assert(html.includes("Your answer: A."));
  assert(html.includes(question.choices[savedChoice]));
  assert(html.includes("D."));
  const skipped = elements(
    QuestionView({
      q: question,
      chosen: null,
      onChoose: () => {},
      revealed: true,
    }),
  ).find((element) => element.type === AnswerFeedback)!;
  assert.equal(skipped.props.chosen, null);
});

test("full-width answer rows keep long text, canonical states, and elimination controls separate", () => {
  const original = getExamQuestions("reading-1")[0];
  const long =
    "The result supports only the tested group because the experiment did not include participants from the other groups described in the question.";
  const question = {
    ...original,
    choices: [long, ...original.choices.slice(1)],
  };
  const wrong = (question.answer + 1) % question.choices.length;
  const rendered = elements(
    QuestionView({
      q: question,
      chosen: wrong,
      onChoose: () => {},
      revealed: true,
    }),
  );
  const buttons = rendered.filter(
    (element) =>
      element.type === "button" && element.props.className === "choice",
  );
  const order = displayChoiceOrder(question);
  for (const [position, button] of buttons.entries()) {
    const canonical = order[position];
    assert.equal(button.props["data-correct"], canonical === question.answer);
    assert.equal(button.props["data-wrong"], canonical === wrong);
    assert.equal(button.props["aria-pressed"], canonical === wrong);
    assert.equal(button.props.disabled, true);
  }
  const html = renderToStaticMarkup(
    QuestionView({
      q: question,
      chosen: null,
      onChoose: () => {},
      onEliminate: () => {},
    }),
  );
  assert(html.includes(long), "the entire answer text remains available");
  assert.equal(
    (html.match(/class="answer-choice-row"/g) ?? []).length,
    question.choices.length,
  );
  assert.equal(
    (html.match(/class="answer-eliminate"/g) ?? []).length,
    question.choices.length,
  );
  assert(
    !html.includes("sm:grid-cols-2"),
    "answer text must not share a narrow two-column grid",
  );
});
