# Personalized planning repair — 2026-10-18

The Daily plan remains the primary action. Removed the separate mission card above the lesson; Play remains available in navigation and practice. No new dependencies, settings, database tables, migrations, or rewards.

## Scheduling changes

- Latest recorded official, timed, first-attempt section scores now feed future Daily plans and coverage forecasts. Scores can rise or fall. Starting scores remain stored and editable; sections without qualifying evidence use them.
- Planning keeps the latest qualifying score after 30 days. The existing readiness checkpoint still requires recent distinct forms; expiring readiness evidence must not reset a learned baseline to an older starting score.
- Short days allocate more time to larger section-to-goal gaps while retaining maintenance subjects. Whole lesson/application pairs stay together, within the saved daily budget. Unknown baselines receive practice without an assumed ACT 28.
- Existing unfinished/same-day sessions retain their questions, answers, concept checkpoints, identity, and deadline. New inputs apply to future sessions. No game accuracy or XP is converted into an ACT scaled score.

## Validation

- 411 unit/scenario tests pass; TypeScript, lint, and production build pass.
- Isolated-account real API check: starting Math 18 with goal 30 prioritizes Math. Recording Math 30 and English 18 changes the next priority to English. Untimed English 36 is ignored. All prior practice/exam records, active session state, and original starting scores remain unchanged; wrong-owner writes are rejected.
- Live resume: 13 saved answers plus checkpoints, timing, uncertainty, and deadline preserved; concurrent retries retain original evidence.
- Historical recovery: ten completed sessions, nine canonical skills recovered, stable reload.
- Fresh Daily flow: all four subjects taught and drilled; 16 concepts, 25 answers, 46 requests; ordered teaching, idempotent answer, completion/reload, and deadline checks pass.
- Codex in-app browser: score save/feedback, retained lesson, original starting scores in Settings, simplified Daily home, and no horizontal overflow at 390, 768, and desktop widths.
- Full compiled-Worker route sweep: 1,044/1,044 passed, including all 325 lesson routes, 325 skill drills, 204 missions, subject/course pages, exam/results, authentication, ownership and invalid-route boundaries. Ten prior non-plan records and all three historical fixture files remained unchanged.

The first development-server sweep returned one transient dashboard 500 during hot reload. A direct retry passed; the full compiled-Worker sweep passed with zero failures. Complete receipts and viewport captures are retained locally under `.impeccable/review/personalized-plan/`.

These checks verify scheduling, adaptation, and preservation. They do not establish measured learning efficacy or guarantee a future ACT score; that requires real student outcomes and fresh timed official practice.
