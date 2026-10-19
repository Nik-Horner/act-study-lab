# Redesign QA status — October 17, 2026

> Historical pre-release snapshot for version 29. Version 29 was subsequently published; the integration follow-up and current verification are in `qa-course-integration.md`.

Functional pre-production QA has passed. Publication awaits the final built-design choice; no deployment has been performed for this redesign. The user explicitly requires extensive QA of every user-facing screen before production, with existing progress retained.

## Completed evidence

- Production build helper completed successfully locally.
- 390 automated tests passed; TypeScript, ESLint, and content validation passed.
- `qa-redesign-route-sweep.json`: 831 authenticated/public HTTP and server-rendered route cases passed, covering all 325 skill lesson/drill pairs, all 35 topics, subject dashboards, courses, practice modes, exam runners, owned results, authorization boundaries, and expected not-found cases.
- That sweep retained six original isolated QA answer/exam records with identical answer payloads, raw/scaled scores, and timestamps. Three historical progress fixture files matched HEAD and their pre-run hashes. No existing student account was written to.
- Legacy and fresh isolated-account Daily integrations taught/practiced all four subjects, preserved original answers and plan identity, enforced prerequisites, retained answer duration on retry, completed, and reloaded successfully.
- A real Supabase retry integration verified same-skill unseen retries, unchanged original grades, duplicate retry idempotence, save/reload, correct-answer rejection, and revision-based concurrent-save protection.
- Broad isolated-account smoke verified all-subject saving, authoritative grading, English compatibility, row-level account isolation, and owned-result routes.
- `qa-redesign-browser.json` records 8 public and 82 authenticated viewport observations. These are coverage observations, not a declaration that every capture is final. Screenshot files are under `.impeccable/review/redesign/`.
- Browser interactions verified formula filtering/reveal/recall, Daily checkpoint reload, changed time/Science/date settings without losing the active checkpoint, Science feedback/mistake cause/set completion, Reading result filtering, Math exam answer/flag/position/timer retention, embedded Desmos equation entry, and permanent Math result reload.

## Issues repaired during QA

- Phone bottom navigation covered sticky lesson actions; actions now sit above navigation and the safe area.
- Mobile skill catalog titles were squeezed by metadata; shared rows now stack on phones.
- Teaching labels ran together; their semantic groups now have explicit spacing.
- Daily lesson/formula routing relied on local storage; explicit URL intent now survives a new mount without storage.
- Optional formulas hid completed lesson credit; they are separate extra practice.
- A miss on the final drill lacked a fresh related retry; server-selected retries now use distinct same-skill unseen questions, preserve the original response, and survive refresh. Exhausted pools are explicitly identified.
- Home concatenated every lesson title and showed decimal minutes; it now shows the current lesson, lesson count, and rounded estimates. Changed settings are explained while preserving the active plan.
- The first English prerequisite was text-only; it now has an authored subject/verb/clause exploration without changing stored content identities or proof keys.
- Successful non-English exam submission stayed on the start URL; it now navigates to the saved result URL after confirmed saving.
- English runner/results lacked page headings; headings were added. Its phone question index now has five columns and accessible answer/flag labels.
- The native English confirmation stalled the in-app browser; it has been replaced with inline confirmation through the existing guarded submission function.

## Final browser pass

The remaining checks were completed in Codex's own browser against the built Worker. English confirmation/cancellation/submission and permanent-result reload passed. Daily saved-miss recovery opened a distinct same-skill retry without replacing the original grade and survived reload. Daily formula recall saved and resumed at 1/27. Sign-out protected the dashboard. The phone home, corrected catalogs, first English visual prerequisite, and intact quoted English corrections were inspected.

The temporary preview route and its retained client chunk were removed before publication. The final local build succeeded. A separate comparison fixture used clearly labeled example data and the real UI components; it never wrote to user accounts.

## Remaining release decision

The mechanical comparison to the generated mockup scored 80%, above its 72% overall threshold, but still flags differences in account metrics, typography, and graph controls. The user has been shown the finished design and asked whether these small differences are acceptable. No comparison override or release verdict is claimed while that answer is pending. The source package will be published only after that decision and final review.

## Scope limits

All live writes were confined to newly created isolated QA accounts. Temporary login credential files were removed; do not copy credentials into reports. User records, historical question IDs/answer keys, and schema were not rewritten. No official ACT content was republished. Content checks are not external educator validation or official score calibration.

The mechanical design scan has one warning for the approved tactile button bottom edge and 120 typography/radius documentation advisories, mainly inherited styles; it is not a functional test failure. The independent reviewer found no remaining material code issue in the addressed fixes. The final visual disposition awaits the built-design decision.
