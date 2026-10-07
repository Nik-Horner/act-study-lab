# All-subject extension of English Lab

Mode: Operate for dashboard, drills, account, and timed sections; Read for lessons.

This is an ordinary extension of an incumbent visual system, not a new or replacement visual world. Preserve the English Lab palette, Geist typography, rounded controls, understated cards, theme support, and recognizably similar lesson → drill → results flow. The user explicitly rejected an earlier Math + Science draft that felt less polished than English Lab. No new aesthetic direction, comp, concept seed, or replacement identity was requested.

## Direction contract

THESIS: One daily session guides the account through two bounded lessons, matching drills, and review per subject within the saved daily budget.

OWN-WORLD: Inherit English Lab's calm neutral surfaces, indigo primary action, Geist typography, rounded controls, and quiet cards. `DESIGN.md` and `.impeccable/design.json` remain visual authority.

STORY: Continue saved concepts, apply them in a matched drill, learn the next unit, answer cumulative questions, and complete recap before changing subject. Save each transition; preserve unfinished work within the next budget.

FIRST VIEWPORT: A centered daily-study card contains the budget, one wide Start/Continue action, and four compact subject rows with lessons/drills/review and allocated minutes. The runner prioritizes active subject, lesson/concept position, teaching or evidence, and the next action; countdown remains visible.

FORM: Ordinary extension of the incumbent responsive study interface. No new-world seed or comp applies. Reading preserves readable evidence; phone controls wrap without clipping. The signature interaction is saved concept → matched drill → correction → mandatory recap. Use incumbent state transitions and reduced-motion behavior.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Scope and behavior

Daily format 5 uses authored section/question eligibility in `src/lib/daily-curriculum.ts`. The full topic remains reachable; Reading daily examples are limited to one complete worked example per section without removing full-topic examples. Determinate English clauses/fragments support classification, other examples support labeled comparison, Reading examples reveal supported answers, and every subject offers retrieval from memory.

Saved 60/75/90-minute allocations cover estimated teaching, interactions, unique Reading passage time, answer time, corrections, and recap before distributing spare time by score needs. Additional matched questions must fit their block estimate. Revisit exact weak scopes and prefer fresh eligible questions. Concept positions, answers, frozen durations, recap checks, daily deadline, and carryover persist to the account. Upgrades preserve answered question IDs and plan identity. Pace labels use 42/67/67/60 seconds for English/Math/Reading/Science; duration freezes before saving and survives a same-answer retry.

The shared `AnswerFeedback` retains question evidence and selected/correct choices with concrete explanation steps in both corrections and saved history. Math/Science practice opens the hosted ACT Desmos iframe; Science explicitly labels it a learning tool and excludes it from the calculator-free Science timed exam. Calculator expressions survive panel hiding while that screen remains mounted, not a promised cross-device calculator session.

Content repairs include removal of Reading filler, corrected paragraph references, canonical evidence for Science drills, and Heron/polygon rules in geometry. Structural and arithmetic validation does not establish exhaustive human semantic review.

## Incumbent comparison and evidence

Source comparison: `DESIGN.md`, `.impeccable/design.json`, `src/app/globals.css`, shared UI controls, `TopNav`, `LessonSections`, and `EnglishDashboard` supply the established palette, type, navigation, cards, and lesson flow. This pass changes product/surface documentation only; no token or component authority is replaced. The current dashboard, lesson, and correction captures visibly retain that system while reducing the hub to one action and exposing durable sequential teaching.

Current capture directory: `/Users/nikhorner/Documents/Codex/2026-10-05/on-x20/.impeccable/review/segments/`. Required pairs are `dashboard-{desktop,mobile}.png`, `lesson-{desktop,mobile}.png`, `correction-{desktop,mobile}.png`, `review-{desktop,mobile}.png`, `desmos-{desktop,mobile}.png`, and `history-{desktop,mobile}.png`. Both hub captures are valid viewport captures containing the complete short page, not full-page screenshots; malformed full-page backend output was replaced. Lesson, correction, recap, and history are full-page captures. Desmos captures are viewport evidence from current standalone Math practice, recaptured after the heading-before-metadata, SVG icon, and baseline-copy fixes. Supplemental English, Reading-example, and pacing pairs cover those specific states. This documentation pass independently inspected dashboard desktop, lesson mobile, correction desktop, and history mobile before the final recaptures; it did not recapture them or independently run live QA.

`desmos-official-graph.png` separately shows a curve entered on the official hosted calculator. Embedded calculator loading and layout are evidenced; embedded expression entry was not verified because the CUA coordinate backend could not operate that input. Direct official-calculator input does not prove input within the application iframe.

The implementation handoff reports isolated-account live QA of all four subjects, save-gated concepts and recaps, completion/reload, same-answer retry, and persisted durations. It also reports the last `npm run check` passing 79 tests, lint, and build, including structural content, Math arithmetic, and Science data validation. Those results are supplied QA evidence, not independently rerun by this documentation pass. QA history is synthetic test activity, not the user's actual study record. Production has not yet been deployed or live-verified at this boundary.

Final independent finish verdict: SHIP, with all reviewed scores 3. The final reviewer checked resolution of three material fixes: generic Math introduction without an assumed baseline, authored SVG theme/menu icons, and full-topic heading before metadata. The prior full-review matrix covered the main daily features and the earlier budget/history/example/counter repairs; the final focused verdict does not represent a new exhaustive semantic content audit. The shipped reviewer definition was unavailable, so the fresh reviewer used the supplied fallback instructions.

Classification-feedback follow-up: `LessonExample` now colors the student's classification by prediction correctness, so correctly identifying a fragment receives success feedback; status text names sentence type separately, and the dependent “When” example includes its completed sentence. The handoff reports 79 checks passing and three browser states captured in `docs/screenshots/lesson-feedback.png`; fresh `classification_feedback_review` returned SHIP with no scoped findings, supported by those three states and no Reading/comparison regressions. Main PR #4 is merged and deployed at `93fa718`; this follow-up on `codex/clear-lesson-classification-feedback` is not yet deployed.

Earlier `.impeccable/review/daily/` and Reading dashboard/exam captures remain historical evidence. Their earlier viewport-only limitation does not describe the current lesson, correction, recap, and history full-page segment captures. No generated raster assets ship in this extension; screenshots are QA evidence, not product imagery.
