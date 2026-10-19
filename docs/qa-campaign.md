# ACT campaign QA — October 18, 2026

This release adds a game campaign in the approved visual world. It preserves ACT-style question decisions and existing learning records. Research and the content/format mapping are in `act-game-research.md`.

## Coverage

- 204 missions, 929 questions, 34 topic families: five original full English passages with 37 questions; 892 existing independent Math/Reading/Science questions in a frozen 199-mission manifest.
- English includes valid and invalid NO CHANGE choices, numbered highlights, passage context, placement references, writing goals, additions/deletions, and argumentative claim/counterclaim decisions. Math retains problems/diagrams/calculator access; Reading and Science retain shared source evidence.
- Timed-test and teaching-only questions are excluded from the campaign. Existing question IDs, choices, keys, saved grades, and active Daily snapshots are not migrated or replaced.

## Checks

- 407 tests pass. New tests cover all mission sources, reserved-bank exclusion, English context/NO CHANGE/whole-passage items, hidden future feedback, immutable first choices, stale revisions, malformed snapshots, explicit star thresholds, stable per-owner identity, and source immutability.
- TypeScript, ESLint, the existing content validators, and diff whitespace checks pass. New English content is validated by campaign tests and the scoped content review; the older content validator's 2,022-record count does not include the 37 new English campaign questions.
- 1,044 authenticated/unauthenticated route cases pass, including all 204 mission URLs, four subject maps, campaign owner guards, expected not-found routes, all existing lessons/drills, results, account, and auth routes. Twelve original QA rows and three historical fixture files were unchanged during the read-only sweep.
- A fresh isolated-account campaign run passed 159 requests across all four subjects: original wrong answer retained, server grading, duplicate answer/next/start retries, reload, completion, replay without rewards, competing-tab choice conflict, and two-account row isolation.
- A subsequent preservation check retained seven pre-existing records and the exact active Daily plan, answers, concept checkpoints, and deadline while loading saved campaigns. No real student account was used for writes.

## Codex in-app browser

Desktop 1440×1000 and phone 390×844 captures cover the map, briefing, unanswered English passage, saved correct NO CHANGE, all four subjects' evidence/questions, argumentative English, miss feedback, two/three-star completion, reload, saved review, topic filters, subject switching, and dark theme. Both evidence and question panes also pass page-overflow checks at 320px.

Actual play verified commit-before-feedback, answer elimination, keeping a valid original, choosing an edit, sequential saved rounds, immutable misses after reload, two-star 4/5 and three-star 7/8 results, and replay without additional stars. Mobile missions begin with the passage/problem; later rounds keep the question reachable through the evidence/question tabs. Keyboard continuation was checked after a committed answer. Captures and receipts are under ignored `.impeccable/review/campaign/`; native screenshot bytes are slightly scaled from the logical viewport dimensions.

## Review

The fresh finish reviewer inspected all 26 supplied captures and all 37 authored English keys/explanations. One competing transition distractor in tool-library question 5 was confirmed. “Therefore,” was replaced with “In other words,” while keeping the question identity and intended NO CHANGE key. Updated desktop/phone captures and the explanation were reviewed; the targeted verdict scored the one fix **resolved**, with no regression, disposition **ship**. This is scoped campaign review, not independent ACT calibration or whole-app pixel approval.

The earlier Daily mockup similarity failure remains recorded and unpassed. This extension does not claim to close that historical gate. No new visual-direction approval was requested.

## Release and limits

The Sites source helper builds, commits, pushes, and packages the exact release. Its saved-version/deployment and production-smoke receipts are recorded separately after publication. Production claims depend on those receipts, not this pre-release checklist.

Stars are mission feedback, not ACT scaled scores or validated mastery. Questions may have been practiced in another app mode; first-attempt accuracy refers to this mission. Physical devices, screen readers, and controlled learning-outcome studies were not performed. Full timed forms remain separate from coaching missions.
