# ACT Study Lab redesign and integration

Mode: Operate for Daily, course, practice, formula tools, exams, progress, and account; Read within teaching and passages.

## Current direction — original approval reaffirmed October 17, 2026

The user explicitly reaffirmed the first approved Daily path + focused lesson mockups. They rejected reopening the design decision: the missing work was full implementation of that game-like lesson experience. The binding visual references are `.impeccable/mocks/daily-path.png` and `.impeccable/mocks/lesson-first.png`; later Fieldwork/Chapters/Orbit proposals are rejected and archived under ignored review evidence. No design choice or new mockup approval is pending.

THESIS: The original game-like Daily path leads into an artifact-first lesson player across all four subjects and every published skill. Teaching is a large interactive canvas beside a focused lilac coach, with clear progress and a strong next action.

OWN-WORLD: Original Mona Sans, white and cool-blue ground, navy text, cobalt controls, lime/lilac/coral subject roles, the approved tile mark and left navigation. Default light matches the comp; an explicit saved dark choice is retained. Original mockup sample streaks, levels, dates, and answers are illustrative, never copied into real account state.

STORY: Resume an existing saved path; manipulate the actual lesson's graph, sentence, passage, or experiment; learn one authored idea at a time; explore worked examples with their matching evidence; complete a supported check; answer genuinely separate independent questions. Preserve original answer records and checkpoints.

FIRST VIEWPORT: The lesson title and subject trail lead into an approximately 1.35:1 canvas/coach split. The cost lesson implements the approved graph and one-hour smaller-step composition directly. Other skills use their own authored evidence, diagrams, examples, and rules in the same composition. Footer Learn / Explore / Practice progress and large cobalt actions continue through study and review. Phone layouts stack the same evidence and coach with no covered controls.

FORM: Implement the existing approved Daily path + focused lesson composition, direction ae378b3b. Generic settings apply to all students: no implicit geometry-first rule at 32+, no default Desmos exclusions or special serious-attempt switch. Earlier explicitly stored preferences are preserved unless their owner chooses standard planning. New onboarding leaves time, target, test date, and prior scores for the student to supply.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implemented mechanisms

- `ConceptTeaching` is the shared large-artifact/lilac-coach player for `SkillLesson` and both Daily adapters. Learn / Explore / Practice appear in the footer. Learn and Explore advance one authored idea/example at a time; the guided check remains unscored before independent practice. Original source indices and Daily checkpoint keys remain stable.
- `LessonArtifact` preserves exact section or case-specific authored evidence across the 325-skill corpus. Full scenes exist for `math-modeling-linear-models`, `dependent-boundary`, `reading-inference-evidence-link`, `science-experimental-design-confounds`, and the English clause prerequisite. The cost scene implements the approved movable graph, coordinate labels, green callout, and one-hour 3 + 2 = 5 smaller step with unscored choices. Other skills retain their own evidence/stimulus in the same composition.
- `DailyPath` now previews the next concept through real interactive activity evidence, the compact clause-recognition scene for the matching prerequisite, or `LessonArtifact` for other authored sources. The old paragraph/icon fallback is removed for authored lesson sections.
- `LessonSubjectTrail` shows all four subjects with only the actual current state. Daily's rail uses saved current/completed snapshots. `StudyWorkspace` integrates English/non-English drills, timed exams, and formula recall. `AuthLayout`, the structured account editor, four-subject `ResultSummary`/`ReviewFilter`, English answer review, and full `TopicReference` pages carry the same visual system into actual working pages.
- Standard settings have no score-triggered geometry priority, default Desmos exclusions, or special serious-attempt UI for new accounts. Unsaved onboarding time/date/goal/prior scores are blank. Existing explicit custom preferences persist through ordinary saves; only an explicit standard-planning reset clears those overrides. Active work and historical records remain retained.
- Account planning remains test date + goal + 15–240 whole minutes per day, with estimated Daily duration, rotation on short days, resumable sessions, and optional formula recall. Timed exams stay distinct. Actual completed Daily counts earn 100 XP each and one level per five sessions from level 1. Guided support cannot inflate independent mastery or completion records.
- Source-based layout: 2.65rem/850 lesson heading; 1.35:1 artifact/coach grid, 14px gap/corners; white artifact and lilac coach; stacked at 900px and below. The footer remains after the evidence, with large cobalt controls. Wide introductory explorations now reset stage margins, cap graph height at `min(36vh, 360px)`, use 1.35rem coach padding, and give cost answers a 68px minimum height. Light initializes by default; saved dark preferences remain supported.

## Evidence and release state

**Published baseline:** version 31, commit `6cbd8aedd4ed23a9b6f274c5067d73bf7c244e5a`, published the approved-spec lesson/workspace changes after the user authorized release with the disclosed comparison limitation. Earlier versions 29/30 and the 400-test/831-route approved-spec QA are historical release evidence, not current campaign verification.

The old Daily comparison remains **68.63%**, below its 72% gate, in `.impeccable/review/diff/hero/report.json`. It was not forced or marked passed. Earlier targeted findings 1/2 were resolved, while procedural comparison work remained incomplete. Real account state was never replaced with the mockup's illustrative Math progress. This gate neither supplies campaign approval nor becomes a new pending user design choice.

The binding comps and provenance are `.impeccable/mocks/daily-path.png` and `lesson-first.png`. Later Fieldwork/Chapters/Orbit proposals are rejected, archived under `.impeccable/review/rejected-design-directions/`, and excluded from current design authority. There is no pending design choice.

## Learning rationale and limits

[IES learning guidance](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) supports worked examples, problem solving, visual/verbal explanations, retrieval, and spacing. This informs the mechanism; it does not prove optimal learning or establish measured app outcomes. Original ACT-style practice remains distinct from official tests and score claims.

The existing course player has custom introductory simulations for its named skills; other lessons render their authored source evidence and ideas. The campaign adds 204 full-context missions across 34 topic families without claiming a bespoke simulation for every question. Fresh retries depend on the unseen eligible bank; guided correction remains unscored. Historical account preferences are preserved until explicitly reset. Current testing has not established physical-device, screen-reader, sustained-load, or measured learning-outcome results.

## Campaign extension contract — October 18

THESIS: Train ACT decisions as a sequence of saved missions, preserving their actual passage/problem format rather than reducing each subject to one puzzle mechanic.

OWN-WORLD: Extend the approved Mona Sans/navy/cobalt/lilac/lime system. Connected circular map nodes and earned stars carry game progression; white evidence and lilac choices retain the focused lesson composition. No new visual-world choice is requested.

STORY: Pick a subject and mission, read its full context, commit an answer, inspect the rule and trap, advance through saved rounds, and clear a mission. The source bank spans 34 topic families, with five original English passages including argument/counterargument practice.

FIRST VIEWPORT: A large game headline and real earned-star total lead a four-subject selector and connected mission path. The player leads with a round trail, complete passage/problem at left, and original choices at right. Phone tabs expose evidence and question separately with a persistent route back to each.

FORM: Commit-before-feedback, optional answer elimination, account-saved cursor and original answers, server grading, revision checks, result stars, and saved review. Completion earns one star; 60% in the mission earns two; 85% earns three. Replay cannot mint rewards. Daily XP and historical course progress remain separate.

GUARDRAILS: Timed-test banks remain held out. English NO CHANGE is sometimes correct; whole-passage and placement items remain full-context decisions. No official question text is republished. Game stars are not an ACT score. No screenshot similarity or learning-outcome claim is implied by functional QA. Existing design-gate limitations remain recorded rather than forced.


## Campaign implementation and verification

The frozen catalog has 204 missions and 929 questions across 34 topic families: five new original English passages/37 questions plus 199 manifest missions/892 existing independent Math, Reading, and Science questions. English includes argument/claim/counterclaim, editing and whole-passage decisions, placement, and both correct/incorrect NO CHANGE options. Complete contexts and choices remain intact; timed-test and teaching-only questions are excluded. `docs/act-game-research.md` records primary ACT sources and explicit format limits. Official material was studied and linked, not republished.

`/play` is integrated into Today, Play navigation, the practice hub, lesson transfer, and Progress. Commit-before-feedback, optional elimination, saved round markers, mission completion, and review form the game. Stars are 1 for completion, 2 at 60%, and 3 at 85% first-attempt accuracy within a mission; replay adds none. Stars are separate from Daily XP/course coverage and are not an ACT score. Math alone offers optional ACT Desmos. Mobile Passage & evidence / Question tabs retain the complete context.

Campaign records use the existing owner-isolated storage with version `campaign:v1`, stable owner/mission IDs, immutable first choices, revision compare-and-save, and idempotent retries. There is no database migration or old-bank question-ID edit. The English paragraph grouping helper was extracted unchanged from the exam renderer. Daily, exam, prior answer, and preference identities remain authoritative.

**Scoped review:** the finisher reviewed 37 new English questions and 26 valid primary captures in `.impeccable/review/campaign/`, then correction captures 27/28. The one finding was an ambiguous distractor in Library question 5; “Therefore” became “In other words” while the key stayed unchanged. The reviewer marked finding 1 Resolved, found no regression, and returned disposition SHIP. This verdict is campaign-scoped: no whole-app, old-gate, pixel-perfect, or learning-outcome approval is implied.

**Verification:** the implementation task reports 407 passing tests, TypeScript, ESLint, and content checks; 1,044 HTTP route cases with no errors; 12 original QA rows and three historical fixtures unchanged. A 159-request live campaign exercise passed initial saves, reloads, completion, review/replay, concurrent tabs, and row-level isolation across all four subjects. A follow-up preserved the active Daily checkpoint and seven original rows. Desktop 1440 × 1000, phone 390 × 844, and dark theme were sampled; question and evidence panes for all four subjects had no overflow at 320px. `browser-proof.json`, `narrow-proof.json`, and `live-local.json` record local evidence. Native screenshots are slightly scaled; exact screenshot-pixel equivalence is not established.

**Release boundary:** version 31 remains published. The campaign is not yet published; packaging and Worker QA remain. No additional design approval is pending, and no gate is forced. Physical-device, screen-reader, and controlled learning-outcome validation have not been established.
