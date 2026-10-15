# Daily teaching repair — October 15, 2026

Daily Science dropped the evidence attached to focused lessons, so students learned graph skills without a visible graph. Some reference examples also used different quantities from their tables. Reading methods used abstract language where a concrete question and proof would help. This release repairs the shared teaching path without changing account settings, existing question identifiers, answer choices, or grading keys.

## Teaching changes

- All 52 focused Science skills have short steps, matching worked evidence, a solved question, a specific trap and tip, and a separate visible try-it dataset. Nine worked lessons and seven try-it tasks use graphs. All 43 reference sections and their activities were repaired. Thirty drill explanations and one misleading sample-proportion prompt were clarified.
- All 24 focused Reading skills have two short steps, one source-based worked answer, a trap, a practical tip, and an independent try-it. All 42 reference sections were simplified. Method prose fell from 1,900 to 1,075 words; meaningful source excerpts remain. Tables show writer comparisons and count-versus-share calculations. Assessed Reading questions were preserved.
- Fourteen Math teaching, reference, and feedback errors were corrected, including fractions, doubling-time exponents, impossible probability/triangle examples, and descriptions of answer options. All 80 live formula-recall cards and their current review flow were retained and synchronized from Sites.
- English teaching and its tips remain. One concision check now explicitly asks for the most concise choice instead of implying that grammatical alternatives are wrong.

Visible evidence is kept beside its worked answer on wide screens and stacks on smaller screens. Graph ticks use measured values when sufficiently spaced; close brightness measurements use an explicit labeled range. Accessible exact values remain available. A verified phone overflow was repaired.

Reading learning drills retain answer durations but no longer label a new passage as a weakness merely for exceeding the 67-second whole-section average. Accuracy, uncertainty, independent evidence, and later errors still matter. The 40-minute Reading section and all other full-section timers are unchanged. Study-time estimates include newly visible worked evidence. Corrected Math prerequisites reopen only where pending practice needs them; saved answers and historical completion remain.

The extensive student QA pass also repaired missing teaching bridges in six Science methods and three Reading methods, stale or misleading Reading feedback/context, two grammatical distractor giveaways, and an English contraction tip. A later explicit review of two distinct correctly answered items can resolve the review-needed flag without pretending those repeats are fresh mastery evidence. Weak reviews reserve time before extra new lessons and rotate. New-plan extra lessons follow the existing target-score gaps relative to current subject time. In the 75-minute representative QA case, Science increased from 13 to 36 minutes and English decreased from 27 to 13; existing saved assignments stay intact.

Formula review can be deferred and reopened without marking a card recalled. The same account/day choice survives reload, pending cards remain visible, and completed lessons show the actual recall count. Formula review time remains separately disclosed; an 80-card packet is estimated at 40 additional minutes. Daily completion links to official timed practice.

## Basis for study advice

The tips are original explanations of the tested skills, informed by [ACT Reading guidance](https://www.act.org/content/act/en/students-and-parents/high-school-success/testing-advice-for-the-act/act-reading-test-tips.html), [ACT Science's skill description](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/description-of-science-test.html), and [ACT's enhanced-format preparation guide](https://www.act.org/content/dam/act/unsecured/documents/Preparing-for-the-ACT-e.pdf). Reading answers need passage evidence, including supported inferences. Science requires interpreting figures, experimental design, competing claims, and some introductory scientific knowledge. We do not teach a blanket instruction to skip Science text. ACT's current overview gives Science 40 questions in 40 minutes; an older tips article still contains 35 minutes.

The worked-example → new-application sequence follows the [IES learning practice guide](https://ies.ed.gov/ncee/wwc/practiceguide/1). Formula recall before reveal and delayed review follow retrieval/spacing principles, not an ACT-specific score guarantee. [Official digital practice](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep.html) remains the independent check of format, timing, and transfer.

## Verification

The final source passes all 349 regression tests, content validators, ESLint, TypeScript, the native Next.js production build, and the Sites/Vinext production build. The UI detector reports no findings. Deployment results are verified separately for the same release source.

An independent semantic review checked all 76 rewritten focused lessons, their evidence, worked answers and try-it tasks. It caught three unsupported or overbroad statements, which were corrected. The extended pass traced all 52 Science methods through 216 drills and 80 reserved section items, and read all 292 Reading drills and 72 reserved section items against their full passages. Math review covered all 143 focused methods, eight active topic lessons, 75 reference entries, 80 recall cards, and 474 question stems/choices/keys; not every Math explanation received a separate independent solve.

Browser checks used actual Daily lesson/drill components with temporary sample state at 1280px and 390px. They verified Learn → Try it → new drill, wrong-answer teaching, correct-answer feedback, tables/graphs, and no page overflow. Screenshots are in `docs/screenshots/teaching-repair`. The temporary route was removed before publication.

All 325 published skill lessons (106 English, 143 Math, 24 Reading, 52 Science) were rendered with their real shared components at 1280px and 390px. Automated bounds, empty-table and SVG-label clipping checks found no failures. All 22 distinct assessed graphs passed the same two-width checks. These measurements are recorded in the lesson/graph layout QA JSON files; they are not a claim that every screen received manual visual review. The real browser student journey used a separate origin and disposable account to verify signup/setup, formula rating, continuing into lessons, and reload to the saved second concept with all 80 formula cards still pending. The existing student's session was not changed.

Per-skill editorial grades and their reasons are recorded in `science-student-qa-2026-10-15.json`, `reading-student-qa-2026-10-15.json`, and `daily-math-student-qa-2026-10-15.json`. Science has 40 A and 12 B transfer grades; Reading remains B overall. Skill drills teach focused methods; they do not simulate the whole timed section.

The final isolated Supabase integration check passed saved plan identity, 15 prior answers, concept checkpoints, timing, uncertainty, deadline, concurrent retries, historical coverage, score correction, optional Science, and English exam idempotency/validation. A separate two-account check passed all-subject saves/reloads, authoritative grading, timestamps, owner-only row access, English compatibility, and authenticated routes. No existing student's answers or account settings were changed.

## Limits

Original practice is not calibrated to predict a 36. Some focused skills still have small independent question pools; repeating an exposed answer does not become fresh mastery evidence. Browser checks use representative routes and emulated widths, not every screen on physical hardware. No external educator certification or sustained-load validation is claimed.
