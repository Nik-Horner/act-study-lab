# Course integration QA — October 17, 2026

This follow-up responds to the user's feedback that version 29 was too personal and did not integrate the actual study pages. It retains the existing visual identity and adaptive Daily plan, while making the course, subjects, lessons, practice, tools, results, and progress coherent.

## Changes verified

- `/learn` opens the complete four-subject course, with topic groups, skill search, and a useful empty state.
- All four subject pages share course, independent-practice, mistake-review, and saved topic-statistic layouts. Competing per-subject schedule interfaces were removed; their stored records were not deleted or rewritten.
- Daily and standalone focused lessons share Understand, Worked example, Guided check, and independent-practice handoff. A stage exists only when the actual authored content exists. The shared renderer keeps supporting experiment tables and passages visible with worked examples.
- Supported corrections are unscored. Original independent answers remain saved. Daily retries still use distinct eligible same-skill questions, with explicit handling when none remain.
- Internal page headers and navigation use the same system. Lesson actions follow the teaching content and do not cover it on phones.

## Automated and account checks

- 393 tests passed, including all 325 skill teaching-stage/content-immutability checks and a regression that renders the real Science experiment table beside its worked question.
- TypeScript, ESLint, bundled content validators, and `git diff --check` passed.
- The authenticated read-only sweep passed 831 route cases: all focused lesson/drill routes, topic catalogs/references/drills, subject pages, practice modes, section runners, owned results, auth boundaries, and expected not-found cases. Six pre-existing isolated QA records retained identical answer payloads, scores, and timestamps. Three historical fixtures remained byte-for-byte unchanged. See `qa-redesign-route-sweep.json`.
- Isolated legacy Daily integration: 25 requests, 13 answers, eight visible concepts; saved identity/answers/deadline retained, ordered teaching enforced, completion reloaded.
- Isolated fresh Daily integration: 46 requests, 25 answers, 16 visible concepts; all four subjects taught/practiced and completion reloaded.
- Isolated retry integration: 13 requests; original miss retained, distinct same-skill question, duplicate retry stable, ordinary grading/save/reload, null/numeric revision guards, stale completion rejected.
- Broader isolated-account checks passed all-subject persistence, authoritative grading, English compatibility, idempotence, timestamps, owned results, and two-account row isolation.

## Codex-browser checks

`qa-course-integration-browser.json` indexes 72 final captures and explicit stage/viewport proofs. Checks use 1440×1000 and 390×844. The final evidence files begin `verified-` or `fix-`; older `final-` captures had timing/full-page artifacts and are superseded.

All four representative subject lessons reached the actual guided-check stage. Math exercised an incorrect response, worked reasoning, a smaller step, and independent-practice handoff. A scored Math miss opened the matching supported method without replacing its recorded choice. Keyboard course search returned six triangle skills and handled unmatched text. Daily advanced and resumed at Concept 2 of 3 after reload. All eight section entry screens and two owned result screens were inspected at both sizes. Science worked evidence was checked in dark and light themes, with controls reachable above phone navigation.

A fresh independent finish review found one material teaching defect: the Worked example stage omitted its source experiment table. The shared renderer, responsive layout, and focused regression check repaired it. The reviewer scored that single fix resolved with `disposition: ship`; the verdict covers that correction, and the earlier full review covers the sampled integration. It does not validate every curriculum statement or production behavior.

## Progress and limits

No schema, API save contract, historical question ID, grading key, formula identity, plan identity, or checkpoint key changed. No existing real student account was written to; live mutations used newly created isolated QA accounts. Temporary login credential files are removed after UI verification.

The IES learning guide (https://ies.ed.gov/ncee/wwc/PracticeGuide/1) supports the teaching sequence's use of worked examples, visual/verbal explanation, retrieval, and spaced practice. These principles do not establish measured optimal results for this application. No external educator calibration, physical-device/screen-reader audit, load test, or controlled learning-outcome study was performed.

Release state at packaging: pre-production checks complete; the exact built source and native Sites deployment receipt are recorded in the ignored `.impeccable/review/integration/release.json` after publication. Version 29 remains the published baseline until that deployment succeeds.
