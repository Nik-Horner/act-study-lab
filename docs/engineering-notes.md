# ACT Study Lab

English, Math, Reading, and Science on the existing English Lab website, with the same Supabase sign-in, accounts, database, and English history.

## Daily study

The dashboard has one primary action: Start daily lesson. English → Reading → Math → optional Science each teaches a category and gives practice with explanations. All four share the account's 60/75/90-minute daily budget, with more time allocated to sections below the saved target score. Answers, completed lessons, and an absolute daily deadline save to the existing account database. Reloading or switching devices does not restart the timer. Unfinished work resumes on the next day without doubling the workload; categories advance after completion. Extra practice preserves the full subject dashboards, libraries, and timed forms.

English's detailed plan uses the Chicago calendar, starts preparation at least 12 days before the test, and ends before test day while preserving existing manual completion keys.

## Run locally (existing deployment)

Create an ignored `.env.local` with the existing project's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Install with `npm ci`, then run `npm run dev`. `npm run check` runs lint, content audits, unit tests, and a production build.

## Practice coverage

| Subject | Full digital practice            | Additional study material                  |
| ------- | -------------------------------- | ------------------------------------------ |
| English | Two 50-question, 35-minute forms | Existing 15-topic lesson and drill library |
| Math    | Two 45-question, 50-minute forms | Eight lessons, 384 drills, 24 checks       |
| Reading | Two 36-question, 40-minute forms | Six lessons, 292 drills, 18 checks         |
| Science | Two 40-question, 40-minute forms | Six lessons, 216 drills, 18 checks         |

Reading forms have four nine-question units, including a literary narrative, informational passages, a paired-text unit, and a table. Three passages are approximately 750 words and the paired unit approximately 650, totaling about 2,900 words per form. Lessons include seven sections, six worked examples, and three independent checks. Timed questions and passages are held out of topic drill pools. The lab reports raw accuracy on original questions; it does not claim an official scaled-score prediction. English results also show raw accuracy; historical estimate fields remain stored for compatibility.

Format references: [ACT enhanced test FAQ](https://www.act.org/content/act/en/products-and-services/the-act-educator/the-act-test/enhancements-k12/faqs.html), [2026 design framework](https://www.act.org/content/dam/act/unsecured/documents/R2519-Design-Framework-for-the-ACT-Enhancements-2026-02.pdf), and [official digital practice](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep/act-online-test-sample-questions.html). This is independent original practice, not an ACT platform replica or endorsed product.

## Existing database compatibility

No schema migration or new service credentials are required. English continues using its existing topic progress, question misses, exam attempts, and plan checks. New drill events use `exam_attempts` with `practice:math`, `practice:reading`, or `practice:science`; full sections use subject-specific form IDs. Their JSON records are discriminated by `kind`, and the server validates questions, choices, timing, and ownership before grading. `scale_score = 0` is an internal unscaled marker, never displayed as an ACT score. Existing English IDs and stored historical values remain intact. The shared exam index filters to published full-section IDs, so individual practice events never become spurious exam history.

All reads and writes use the signed-in user's session and the existing owner-only RLS policies. Daily and new-subject answer retries are idempotent. Standalone English answers now append immutable, idempotent events; topic totals and misses combine those events with preserved legacy history without a counter-update race. Failed saves block advancement and explain recovery. Answer choices cannot be replaced after submission; a mistake's classification can be updated. Signed-out API requests return JSON 401 responses. Cloud hydration paginates history and surfaces failures rather than silently presenting incomplete progress.

An active timed section is saved on its current device with an absolute deadline and an account-scoped key; completed results sync to the account. Unsaved events are queued with a device recovery copy, retried on return, and shown with a visible save error. Blocked local storage does not prevent cloud progress loading. Pending work from another account is never displayed or sent as the current account's work.

The account's target and test date apply across subjects. Math + Science share one focused preparation plan; Reading has its own focus plan. All four previous section scores and daily 60/75/90-minute focus budgets are account preferences saved in Supabase Auth user metadata; the legacy English score remains in profiles for compatibility. Unfinished tasks retain IDs and completion dates, carry forward within the focus budget, and show overflow separately. The day before the test remains light.

## Verification and deployment

Publish each release to both the existing Vercel app and the GPT Site identified in `.openai/hosting.json`. Vercel builds native Next.js with `npm run build:next` through `vercel.json`; Sites uses `npm run build` for its Worker. Deploy the same application source to both and verify both production URLs. Keep the existing Supabase environment variables and domains.

Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must also be available during the Sites build, through the build environment or ignored `.env.local`. Runtime settings alone do not configure the browser bundle. The Vite configuration refuses a build when either value is missing.

Reuse the Sites release checkout: the build retains the preceding build's manifest-listed static assets and Vinext layout CSS so a page opened during deployment can still load its files. It keeps one prior generation and does not overwrite new files or restore old HTML/manifests. When moving to a fresh release checkout, seed `dist/client` and `dist/server/__vite_rsc_assets_manifest.js` from the currently published archive before building.

GitHub Actions runs `npm run check`. The current publication uses Sites and the project identity in `.openai/hosting.json`. Keep the existing Supabase environment variables and domain. The explicit `tests/live-account.ts` smoke test requires a local server and the real Supabase public configuration; it creates isolated QA accounts only when email auto-confirmation is enabled, verifies two-account RLS and all-subject compatibility, and writes ignored QA session files for subsequent UI verification. It is not run in CI or against an existing user's account.

## Daily visual lessons

The daily runner uses 140 authored non-English prediction activities with immediate reasoning, experiment tables, geometry diagrams, Reading evidence excerpts, and an interactive unit circle. English keeps its original teaching in a concept-by-concept flow. The daily drill workbench retains the question banks, saved answers, keyboard controls, and pacing, with larger choices and more space for evidence.

In Account, scores of 32+ automatically prioritize geometry and trigonometry for upcoming Math plans. Students can explicitly mark calculator-covered topics and flag a Science score that does not reflect a serious attempt. Existing unfinished plans carry forward without resetting progress. The current source and Sites configuration are maintained in this project folder.

Daily review also revisits correct answers that were slow or flagged uncertain. Historical answer IDs guide fresh-question selection, and unfinished sessions carry their answered weaknesses forward. Repeating a known answer does not clear an old weakness. The daily dashboard links official ACT forms for independent, timed score checks; lesson completion is not a scaled-score prediction.

Daily teaching now shows the complete rules and worked examples before its interactive activity. Trig elevation and probability counting drills follow their required methods, and Math lessons include explicit formulas for the affected drill setups. Saved daily sessions reopen at their next unfinished concept or question; the dashboard names the saved subject and lesson. Run the isolated returning-student integration check explicitly with `node --env-file=.env.local --import tsx tests/live-daily-resume.ts` against a local server on port 3100 (`ACT_TEST_BASE` can override it). It creates a QA account only when confirmation emails are disabled and verifies answer, concept, timing, uncertainty, and deadline persistence without touching a student account.

Account → Include Science in daily study controls future sessions. Existing saved work is not reset. Methods use short explanations and typeset math, with Learn → Try it navigation. See [the quality audit](quality-audit-2026-10-12.md) for findings, fixes and verification limits.

## Teaching and independent practice standard

Every section teaches the rule, conditions and a worked example before application. Reading uses 144 separate assessment items on 24 new passages; lesson and activity passages stay outside that bank. Science uses separate teaching datasets, prediction tasks and quick checks, with 203 drills and 80 held-out exam questions. Math includes a 71-item formula/method reference, 32 new independent method questions and explicit prerequisite mapping.

Daily questions respond to each subject baseline and the account target, date, budget, weaknesses and optional Science choice. Higher targets require more independent, paced, high-confidence hard-question evidence. Retrying a demonstrated or previously missed question does not turn it into new evidence. Formative/retired items remain in saved history; unanswered legacy Reading items migrate deterministically to the new pool. Coverage counts lessons, not a score guarantee. Two different official timed forms are the independent goal check.

The repair ledger and verification limits are in `docs/quality-repair-2026-10-14.md`.

The October 15 Daily teaching repair restores matching visual evidence to all 52 Science skills, simplifies all 24 Reading skills, adds short practical tips, and preserves English teaching and all 80 formula-recall cards. Reading learning time is recorded without a per-question speed penalty; full-section timing is unchanged. See `docs/teaching-repair-2026-10-15.md` for the review scope, study sources, account-preservation checks, and limits.

The lesson-completeness follow-up repairs 28 weaker Science/Reading methods with 30 short worked variants and visible seasons/rock-order diagrams, and presents worked steps clearly for all 143 Math methods. Existing lesson positions, completed concept keys, answers and history are retained. New plans adjust lesson time around the complete formula packet to keep the estimated combined session within two hours; saved sessions keep their existing minutes and clock. The A teaching checklist, individual repairs and verification scope are in `docs/daily-lesson-completeness-2026-10-15.json`.
