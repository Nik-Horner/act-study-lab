# Quality and reliability repair — October 14, 2026

The release repairs all eleven findings from the platform audit and the teaching/practice quality failures reported by the student. It preserves account data and publishes the same application source to Vercel and GPT Sites.

## Audit ledger

1. Account-switched active exams: sessions are owner-bound; persistence refuses stale ownership, including restored drafts.
2. Stale-account forms: settings, score checks, checklists, English drills and exam submissions carry an expected owner. Ownerless old clients must reload.
3. Offline recovery: separate job keys preserve simultaneous tabs and migrate prior recovery snapshots without deleting unrelated work.
4. English counters: one immutable answer event per submission ID; totals and misses derive from events plus the untouched legacy baseline. No database migration is required.
5. Prior-day completion: the runner starts a new unsaved plan even when today's clock already exists.
6. Failed exam submission: the first finalized answers and timing are locked and retried unchanged.
7. English editing contexts: corrected marked replacement boundaries, parallel constructions, sentence duplication, punctuation and transition capitalization. Choice keys are verified in their actual contexts.
8. Matrices: explicit TeX/MathML preserves matrix structure; nested literal brackets are not English underline markup.
9. Failed English history reads: an explicit reload state replaces false zero mastery or "all misses cleared" claims.
10. Coverage suggestions: alternative budgets preserve an active saved plan; an unsaved preview may be recalculated.
11. Even-function explanation: corrected the stale positional claim about the keyed option.

## Teaching standard

The visible sequence remains complete method and worked example, formative application with feedback, then independent practice. New Reading assessment uses 144 questions on 24 original passages, separate from all worked examples, activities and held-out forms. All six skills have easy, medium and hard items; tiers are interleaved so current scope and target can both influence selection. Historical question IDs and answered choices remain readable. Only unanswered retired Reading assignments migrate, deterministically, so reload cannot exchange a saved answer for another problem.

Math has 71 formula/method references across eight topics, including conditions and worked examples; missing rules were added in 19 existing section slots. Thirty-two additional independent questions explicitly name their teaching prerequisites and enter matching daily scopes. Coverage includes quadratic/discriminant methods, functions/logs, coordinate circles and transformations, plane/solid geometry, trigonometry, number properties, matrices/vectors, sequences, probability/counting, rates and modeling.

Science has 43 separate teaching datasets, 43 prediction activities, 18 fresh quick checks and 11 additional transfer items, including Earth/space, measurement/calibration, atomic identity, respiration and complex evidence integration. Existing drill/exam IDs and legacy checks remain readable.

The topic categories and advanced coverage were checked against ACT's published [Mathematics standards](https://www.act.org/content/act/en/college-and-career-readiness/standards/mathematics-standards.html) and [Science standards](https://www.act.org/content/act/en/college-and-career-readiness/standards/science-standards.html). These are original teaching and practice materials, not official ACT questions.

## Personalization and evidence

Account baselines, target, test date, selected subjects, budget, saved progress and weak skills determine the work. Loading defaults contain no particular student's scores. Higher goals require more fresh, correctly answered, paced hard-question evidence. Corrected repeats and worked/retired questions cannot establish fresh mastery. Old retired mistakes resolve through their independent replacement rather than permanently blocking a high target. Missed held-out exam concepts receive active practice; original exam questions remain in section review.

All worked examples now contribute to the time estimate, even when a section also has an activity. An independent review ran 10,080 plans across supported budgets, Science preferences, goals, baselines, deadlines and curriculum positions without an exception or estimated overrun. An impossible short deadline is reported; it is not converted into a promised score.

## Verification and limits

The full 196-test regression suite, content validators, lint, TypeScript and both production builds pass. Focused tests reproduce each persistence/account/transition bug and the Reading migration/mastery edges. Independent review solved all 144 new Reading keys, 32 Math method questions, 11 Science transfer items, 18 replacement checks and inspected all 71 Math references and 43 Science teaching units. One Science feedback-position error found in review was fixed.

Isolated Supabase checks verify account isolation, authoritative grading, idempotent saves, saved concepts/answers/timing/uncertainty, coverage snapshots, score corrections, optional Science and ownerless-client rejection. Browser checks use the actual reference and lesson/question components in a temporary harness on desktop and 375px mobile, including the transition from a worked example through an activity to an independent new passage; the harness is removed before release.

Difficulty labels and practice thresholds are authored learning heuristics, not psychometrically calibrated ACT scores. English and other original forms report raw accuracy. Two different official timed forms remain the independent score-goal check. No guaranteed 36, physical-device/screen-reader verification, sustained load test or expert re-solving of every legacy item is claimed.
