# Approved mockup implementation QA — October 17, 2026

The original Daily path and focused lesson mockups remain binding. This pass extends that world into actual teaching, independent practice, timed exams, answer review, formula recall, topic references, authentication, progress, and generic account settings. It does not replace the approved direction with the rejected later boards.

## Implementation

- All 325 focused skills use the common Learn / Explore / Practice player. Authored ideas and worked cases remain complete; the player shows the evidence belonging to the current section or example.
- The four signature interactive scenes and the English clause prerequisite use functional controls. Other skills use their original sentence, passage, experiment, diagram, or problem. Independent scored questions remain separate from demonstrations and supported checks.
- Daily now previews the actual next saved concept with its source evidence. Sentence markers and clause controls replace the old paragraph/icon fallback. At 1536×1024 the cost graph, lilac coach, choices, stage sequence, and next action are visible together; measured footer bottom: 996.3px.
- Common task frames, choices, result summaries, references, auth screens, progress records, and settings share the approved visual grammar. Light is the default; an explicitly saved theme remains honored.
- General planning no longer silently favors geometry at higher Math baselines. Saved special preferences persist until the student explicitly chooses standard planning. New onboarding does not prefill another student's schedule, goals, or prior scores.

## Automated and preservation checks

- 400 tests pass, including all-skill evidence rendering, teaching order, source immutability, saved-concept preview, historical-credit recovery, and preference compatibility.
- TypeScript, ESLint, content validation, and diff whitespace checks pass. Content validation covers 39 topic lessons and 2,022 question records.
- The authenticated HTTP/render sweep passes 831 cases across focused lessons/drills, catalogs/references, subject pages, practice modes, runners, owned results, auth boundaries, and expected not-found states. This is route coverage, not 831 manually inspected screens.
- Isolated-account checks cover all-subject saved answers, authoritative grading, original English compatibility, idempotence/timestamps, results ownership, and two-account row isolation.
- Legacy and fresh Daily sessions pass resume, canonical question identity, answer/checkpoint/deadline preservation, prerequisites, completion, and reload checks. Retry tests retain the original missed answer, use a distinct same-skill question, and reject stale completion writes.
- Normal settings save, explicit standard-planning reset, and blank onboarding were checked against full record snapshots. Existing answer/exam/Daily records stayed unchanged.
- Production build completes. No data schema, answer key, question identity, ownership guard, or saved-session contract was replaced.

## Codex in-app browser

Desktop 1440×1000, original comparison 1536×1024, and phone 390×844 were inspected in Codex's own browser. Ninety-one viewport captures were collected and opened in contact sheets; key comp and footer captures were opened individually. Two initially invalid captures were replaced before the fresh review. Screenshots are in the ignored `.impeccable/review/approved-spec/` directory.

These are logical viewport sizes. Native desktop screenshot bytes are slightly scaled (the 1536×1024 viewport produced 1525×1017 pixels); the comparison report retains that actual size. No exact pixel reproduction is claimed.

- All four subjects: actual Learn, Explore, guided Practice, and phone continuation controls; Math miss → reasoning → smaller supported choice → independent fresh set; separate graded practice feedback in every subject.
- Daily: a completed prerequisite advances to the next concept and survives reload with the same session. Home reflects that actual next concept. Evidence marks are unscored scratch work.
- Timed sections: all eight routes inspected; original English routes immediately resume an active section. English, Math, Reading, and Science answer/flag/question position/deadline survive reload. Science submission confirmation, saved result, and result reload pass.
- English and Reading owned results retain real accuracy/time/unanswered counts and missed/all-answer filtering. Science's newly submitted result reports one correct and 39 unanswered without invented scaled scores.
- Formula reveal and self-rating advance from card 1 to card 2. Complete references, course, study pages, practice, progress, settings, public landing, login, signup, auth error, and sign-out were inspected on both sizes.
- The built Worker was signed into with an isolated QA account; the cost stepper updates the plotted value and equation consistently. The built route sweep is recorded separately in `qa-redesign-route-sweep.json`.

## Design review and release state

The fresh reviewer scored the Daily artifact and first-viewport lesson action fixes **resolved**, with no regression in those targeted recaptures. This is a targeted verdict, not whole-app approval.

The current mechanical Daily-comp comparison remains failed at 68.63% against its 72% threshold. It labels visibly present path/progress/Continue controls as missing and expects the mockup's illustrative Math graph while this real saved account is studying English. Current comparison reports and paired images were regenerated; no failed gate was relabeled as passed and no sample progress was fabricated. The current cost comparison is also preserved under `.impeccable/review/diff/final/`.

Build-phase finish is recorded as **fix**. Hero remains open; subsequent mechanical phases remain pending. After this limitation was disclosed, the user explicitly requested extensive QA and production deployment. Publication follows that instruction without representing the mechanical gate as passed. The native saved-version/deployment receipt records the exact released source; final whole-app pixel fidelity remains unverified.

## Release verification — October 18, 2026

Fresh checks against the built Worker pass: 400 tests, TypeScript, ESLint, all content validators, and 831 route cases. Account integration, legacy Daily resume, fresh four-subject Daily completion (46 requests, 25 answers, 16 concepts), same-skill retry, and historical-credit recovery (10 completed sessions, nine recovered skills) pass. Settings checks repeat normal save, explicit standard-planning reset, and blank onboarding against full original record snapshots. All five settings scenarios pass without changing the saved answer/exam/Daily rows.

Additional Codex-browser checks cover all four lesson scenes at 320, 768, and 1440 CSS pixels with no page overflow, saved dark-theme reload, keyboard skip-to-content, search empty/matching results, and onboarding with blank date/time/score fields. A confirmed accessibility gap in login/signup error announcements was fixed with alert semantics; the final build and live checks verify that correction. Previous 91 captures and the additional release captures remain separate evidence sets.

Physical devices, screen readers, educational-expert review, controlled learning outcomes, and motion quality were not verified. Passing tests and browser checks do not establish optimal learning outcomes or a guaranteed ACT score improvement.
