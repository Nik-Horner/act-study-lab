# ACT Study Lab quality audit — October 12, 2026

## Scope and evidence

Reviewed the daily plan, account/settings, sign-in, lesson and drill renderers, answer saving, score evidence, all subject lesson bodies, shared question rendering, and the English exam path. Assumed personal study with occasional concurrent tabs, not a measured high-load service. Browser checks use synthetic progress at desktop and 390px phone widths; isolated Supabase checks avoid the student's account.

The main failures were excessive reading and repeated material, plain-text math, too much on one lesson screen, unnecessary database work on every answer, and progress labels that could overstate learning.

## Fixed in this change

- **Lesson clarity:** shorter teaching across English, Math, Reading, and Science. New vocabulary is explained in ordinary language. Rules, exceptions, worked examples, evidence and saved concept positions stay intact. Word-count minimums no longer reward filler.
- **One task at a time:** daily non-English lessons separate Learn from Try it. The method remains available while practicing. Consistent navigation stays within reach; optional score checks and advanced settings are collapsed.
- **Readable math:** explicit authored TeX renders fractions, roots, exponents, equations and matrices with KaTeX and accessible MathML across teaching, questions, choices and explanations. Currency and ordinary prose remain plain text. Strict parsing checks cover the authored math.
- **Faster saving:** ordinary daily actions return their saved state without another complete load or coverage simulation. Current plans load their cumulative history snapshot instead of the previous 100 full plans. Legacy history retains a fallback. The final concept and lesson checkpoint save together.
- **Honest answer evidence:** wrong, slow and unsure answers stay in review. Clearing a weakness requires two distinct new, correctly answered, timed questions. An exact question and answer already supplied by the current worked example does not count as fresh evidence. Retries retain the original answer timing and uncertainty.
- **Target-aware plan:** the actual target score controls spare study-time allocation. The dashboard names today's skills and uses the saved target, instead of hardcoding 36. Coverage remains a first-pass estimate, not score readiness.
- **Optional Science:** Account has an Include Science in daily study checkbox. New sessions divide the full daily budget among the selected subjects. Saved sessions and Science history remain intact; extra practice stays available.
- **Score checkpoints:** students can record scores from official timed forms. The goal check uses the latest two different, first-attempt forms from the last 30 days, with clear self-reporting and no score promise.
- **Content corrections:** fixed overly broad comma/clause rules and invented claims about a student's prior mistakes. Replaced 18 repeated Reading activities with distinct passage-based tasks.
- **Account and failure states:** auth return paths stay on the app's origin. Account read failures do not show blank settings. Sign-up handles email confirmation. English drills show save failures and block advancing on an unconfirmed save.
- **English exam recovery:** answers, flags, current question and the fixed deadline survive reload on the same device, scoped to the account. Submission retries use one attempt ID and retain their original answers/time. Malformed and cross-account requests are rejected.
- **Accessibility and consistency:** corrected light-theme warning/success/error text contrast, kept labeled native controls and keyboard behavior, removed nested teaching surfaces, and retained light/dark support.
- **Saved teaching updates:** wording edits refresh in place. Only explicitly revised prerequisites or missing sections add required teaching, preventing duplicate lessons after editorial changes.

## Still requires work or stronger evidence

1. **The practice bank is not a validated ACT score predictor.** Question difficulty has not been calibrated against real test-taker performance. Some distractors are easier to reject than official ACT distractors. A measured target-score guarantee is not supported.
2. **Some Reading drills reuse worked questions.** The audit identified 36 such drill items. The evidence filter now prevents exact exposed answers in a unit from clearing its weakness, but these items still serve as teaching practice. Replace them with independent questions before treating the bank as an assessment. The exposure check is exact text matching, not a complete model of everything a student has seen.
3. **Standalone English counters are not transactional.** Two tabs can update the same topic counter from the same starting value; the review list is a separate database write. Failures are visible and unsafe automatic retries are blocked, but a database transaction with idempotent attempt records is the remaining root fix. Old open clients retain a temporary correctness-field compatibility path.
4. **Small question pools can run out of unseen items.** The system then keeps a skill in review rather than manufacturing evidence of mastery. More independent questions are needed for sustained study.
5. **Coverage forecasts use estimated reading and answering speeds.** Completing every lesson does not prove that the knowledge is retained or transferable. Timed official forms remain the independent check.

## Verification limits

Automated checks verify structure, selected answer proofs, mathematical markup, persistence and regression behavior. They do not constitute expert solving of every authored question. No physical-phone, screen-reader, broad concurrent-load or real test-day validation was performed. Scores used in tests are synthetic; the student's actual saved session was not modified or graded.

The final wording pass adds short definitions for technical terms rather than relying on a reading-grade score. Browser QA also confirmed that disabling Science updates the Account description to three subjects, and that the 390px layout does not overflow horizontally. Request-race assertions exercise the actual handlers: a late score-history response cannot replace newly saved scores, and an answer retry cannot erase the original uncertainty flag or duration.

English exam browser recovery was verified with synthetic progress: answer C and a flag on question 1 survived moving to question 2 and reloading; the clock continued rather than restarting. Returning to question 1 retained the selection and flag.

Final local validation: 143 unit/regression tests passed; TypeScript, ESLint and all content validators passed. Isolated cloud integration passed for daily resume, immutable retries, coverage snapshots, score corrections, optional Science, and English exam idempotency/input validation. Already-open legacy English exams can still submit; those old clients lack the new retry ID until reloaded. Production packaging/deployment is verified separately at handoff.
