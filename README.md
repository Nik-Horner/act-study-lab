# ACT Study Lab

English, Math, Reading, and Science on the existing English Lab website, with the same Supabase sign-in, accounts, database, and English history.

## Run locally

Create an ignored `.env.local` with the existing project's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Install with `npm ci`, then run `npm run dev`. `npm run check` runs lint, content audits, unit tests, and a production build.

## Practice coverage

| Subject | Full digital practice            | Additional study material                  |
| ------- | -------------------------------- | ------------------------------------------ |
| English | Two 50-question, 35-minute forms | Existing 15-topic lesson and drill library |
| Math    | Two 45-question, 50-minute forms | Eight lessons, 256 drills, 24 checks       |
| Reading | Two 36-question, 40-minute forms | Six lessons, 144 drills, 18 checks         |
| Science | Two 40-question, 40-minute forms | Six lessons, 192 drills, 18 checks         |

Reading forms have four nine-question units, including a literary narrative, informational passages, a paired-text unit, and a table. Three passages are approximately 750 words and the paired unit approximately 650, totaling about 2,900 words per form. Lessons include seven sections, six worked examples, and three independent checks. Timed questions and passages are held out of topic drill pools. The lab reports raw accuracy on original questions; it does not claim an official scaled-score prediction. Legacy English estimates remain clearly labeled in their existing results.

Format references: [ACT enhanced test FAQ](https://www.act.org/content/act/en/products-and-services/the-act-educator/the-act-test/enhancements-k12/faqs.html), [2026 design framework](https://www.act.org/content/dam/act/unsecured/documents/R2519-Design-Framework-for-the-ACT-Enhancements-2026-02.pdf), and [official digital practice](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep/act-online-test-sample-questions.html). This is independent original practice, not an ACT platform replica or endorsed product.

## Existing database compatibility

No schema migration or new service credentials are required. English continues using its existing topic progress, question misses, exam attempts, and plan checks. New drill events use `exam_attempts` with `practice:math`, `practice:reading`, or `practice:science`; full sections use subject-specific form IDs. Their JSON records are discriminated by `kind`, and the server validates questions, choices, timing, and ownership before grading. `scale_score = 0` is an internal unscaled marker, never displayed as an ACT score. Existing English IDs and score values remain intact. The shared exam index filters to published full-section IDs, so individual practice events never become spurious exam history.

All reads and writes use the signed-in user's session and the existing owner-only RLS policies. Retries are idempotent. Answer choices cannot be replaced after submission; a mistake's classification can be updated. Signed-out API requests return JSON 401 responses. Cloud hydration paginates history and surfaces failures rather than silently presenting incomplete progress.

An active timed section is saved on its current device with an absolute deadline and an account-scoped key; completed results sync to the account. Unsaved events are queued with a device recovery copy, retried on return, and shown with a visible save error. Blocked local storage does not prevent cloud progress loading. Pending work from another account is never displayed or sent as the current account's work.

The account's target and test date apply across subjects. Math + Science share one focused preparation plan; Reading has its own focus plan. All four previous section scores and daily 60/75/90-minute focus budgets are account preferences saved in Supabase Auth user metadata; the legacy English score remains in profiles for compatibility. Unfinished tasks retain IDs and completion dates, carry forward within the focus budget, and show overflow separately. The day before the test remains light.

## Verification and deployment

GitHub Actions runs `npm run check`; the existing Vercel Git integration deploys this repository. Keep the existing project's Supabase environment variables and domain. The explicit `tests/live-account.ts` smoke test requires a local server and the real Supabase public configuration; it creates isolated QA accounts only when email auto-confirmation is enabled, verifies two-account RLS and all-subject compatibility, and writes ignored QA session files for subsequent UI verification. It is not run in CI or against an existing user's account.
