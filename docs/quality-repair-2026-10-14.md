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

Math has 75 formula/method references across eight topics, including conditions and worked examples; missing rules were added in existing section slots. Forty-eight independent method questions explicitly name their teaching prerequisites and enter matching daily scopes. Coverage includes quadratic/discriminant methods, functions/logs, coordinate circles and transformations, plane/solid geometry, trigonometry, number properties, matrices/vectors, sequences, probability/counting, rates and modeling.

Science has 43 separate teaching datasets, 43 prediction activities, 18 fresh quick checks and 11 additional transfer items, including Earth/space, measurement/calibration, atomic identity, respiration and complex evidence integration. Existing drill/exam IDs and legacy checks remain readable.

The topic categories and advanced coverage were checked against ACT's published [Mathematics standards](https://www.act.org/content/act/en/college-and-career-readiness/standards/mathematics-standards.html) and [Science standards](https://www.act.org/content/act/en/college-and-career-readiness/standards/science-standards.html). These are original teaching and practice materials, not official ACT questions.

## Personalization and evidence

Account baselines, target, test date, selected subjects, budget, saved progress and weak skills determine the work. Loading defaults contain no particular student's scores. Higher goals require more fresh, correctly answered, paced hard-question evidence. Corrected repeats and worked/retired questions cannot establish fresh mastery. Old retired mistakes resolve through their independent replacement rather than permanently blocking a high target. Missed held-out exam concepts receive active practice; original exam questions remain in section review.

All worked examples now contribute to the time estimate, even when a section also has an activity. An independent review ran 10,080 plans across supported budgets, Science preferences, goals, baselines, deadlines and curriculum positions without an exception or estimated overrun. An impossible short deadline is reported; it is not converted into a promised score.

## Complete legacy-content review and progression follow-up

The three content review ledgers in this directory bind individual reviewed records to their exact questions, keys, explanations and, for English forms, full editing passages. They are an internal editorial/solution review, not external educator certification or score calibration.

- English: reviewed 635 legacy questions/checks in full context; repaired 44 topic items and 43 form items, including 35 missing prompts. Added 15 advanced lesson sections, 30 worked examples and 30 independent transfer questions. Reclassified 87 inflated hard labels. The 665-item ledger preserves original identifiers and answer indices.
- Math: reviewed 346 legacy questions, all 48 method questions, 24 active checks, 56 lesson sections and 75 references. Replaced 28 worked-example blocks that repeated assessed tasks, removed equivalent distractors and reclassified 146 inflated difficulty labels. Added missing number-system, recursion, angle/triangle-center and integrated-modeling instruction. Each new transfer answer has a separately recorded derivation.
- Science and Reading: reviewed 272 original Science questions and 72 held-out Reading questions against their full passages. Repaired ambiguous alternatives and shuffled feedback references, strengthened distractors, and replaced generic Reading form explanations with passage evidence. The prior review of the 144 independent Reading drills and 43 Science teaching datasets remains applicable.

All 141 formative activities were also reviewed: 42 Reading, 43 Science and 56 Math. Revised activities use plausible misreadings and calculation errors as distractors. Math teaching diagrams use separate activity measurements where assessed measurements had been reused; the seven added schematics were visually checked at mobile width. Reading/Science activity keys and correct-answer text remain stable.

Practice now uses short fresh-first sets, with Math/Reading/Science difficulty adjusting to the baseline, goal and recent independent performance. Later failures can revoke challenge status; correcting an exposed answer cannot supply fresh evidence. Later fresh success can establish a practice threshold without requiring a memorized repeat of an early miss. Mistake repair selects relevant methods, and feedback links to the corresponding lesson section. Reading display choices use a stable per-question permutation, while grading, saved answers and eliminations retain canonical indices.

Standalone English prioritizes unseen questions across immutable daily/standalone history before goal difficulty. Existing legacy aggregate totals cannot recover the identities of old correct answers. The eight-answer streak is explicitly a practice milestone. Daily English separates core and advanced work, preserves the original course IDs and global core positions, and prioritizes advanced transfer for higher reported baselines with high targets. Saved sessions keep their assigned questions and concept positions. Legacy migration tests cover later core topics after the new scopes are appended.

Expanded instruction is counted in the study budget. Completing the course before a near test date may require more time than the previous curriculum; the coverage forecast reports the shortfall. Internal independent checks generated a further 1,512 personalized plans without budget overruns, exceptions or non-idempotent content refreshes.

Follow-up integration findings and repairs:

12. Historical accuracy blocked later independent mastery. Practice thresholds now use the required fresh window, while lifetime accuracy remains visible. A later miss on that evidence can revoke the threshold.
13. Challenge selection ignored a later failure on an earlier successful item. Its latest response must still be correct; a repeated correction still cannot create first-attempt evidence.
14. Appending English scopes initially changed the order used by the old-plan migration. Both planner and migration now use the same stable core-first ordering; later-topic legacy fixtures retain their position.
15. Reading display permutations initially left daily keyboard shortcuts using visible positions as stored indices. Daily shortcuts now map through the same display policy as the rendered choices. Regression coverage exercises the keyboard effect rather than only clicking the shared question component.

The content standard uses ACT's published [English](https://www.act.org/content/act/en/college-and-career-readiness/standards/english-standards.html), [Reading](https://www.act.org/content/act/en/college-and-career-readiness/standards/reading-standards.html), Mathematics and Science categories, including the advanced skills. The material is original practice; authored difficulty tiers do not measure an ACT score.

## Verification and limits

The initial reliability release passed 196 regression tests, content validators, lint, TypeScript and both production builds. Focused tests reproduce each persistence/account/transition bug and the Reading migration/mastery edges. That release's independent review solved all 144 new Reading keys, 32 Math method questions, 11 Science transfer items, 18 replacement checks and inspected its 71 Math references and 43 Science teaching units. The subsequent complete legacy review extends that evidence as described above; its regression suite also covers adaptive sets, canonical choice persistence, lesson-method feedback and English history-aware ordering.

The final follow-up source passes all 239 regression tests, content validators, lint, TypeScript, Sites/Vinext production build and native Next.js production build. Browser checks exercised the actual daily keyboard submission and mapped feedback, lesson/recall components and all seven new schematics at 375px width. The temporary verification route was removed before final builds.

Isolated Supabase checks verify account isolation, authoritative grading, idempotent saves, saved concepts/answers/timing/uncertainty, coverage snapshots, score corrections, optional Science and ownerless-client rejection. Browser checks use the actual reference and lesson/question components in a temporary harness on desktop and 375px mobile, including the transition from a worked example through an activity to an independent new passage; the harness is removed before release.

Difficulty labels and practice thresholds are authored learning heuristics, not psychometrically calibrated ACT scores. English and other original forms report raw accuracy. Two different official timed forms remain the independent score-goal check. No guaranteed 36, physical-device/screen-reader verification, sustained load test or external expert certification is claimed. Historical wrong-choice wording may reflect a repaired distractor; IDs, saved indices and correct-answer text remain stable.
