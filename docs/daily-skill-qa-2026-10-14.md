# Daily course skill and QA repair — 2026-10-14

The primary course is Daily study. A student should receive the teaching and matched application needed for every authored skill there, without depending on Extra practice. This follows the earlier platform repair ledger in `quality-repair-2026-10-14.md`.

## Findings and repairs

1. **Broad topic pools assigned untaught methods.** Daily now schedules 325 primary skills: 106 English, 143 Mathematics, 24 Reading and 52 Science. Every assignment identifies its exact primary method, teaching sections and assessment pool. Math cards explain the full task rather than requiring an unrelated topic example.
2. **English prerequisites could be omitted.** Each primary Daily unit includes the explicit prerequisite sections required by any of its assigned questions. Final English strategy skills are also scheduled in Daily.
3. **Learning and practice repeated.** Focused units use authored teaching, a different try-it, then independent questions on the same method. Added 93 English and 80 Math questions; every primary pool has at least two active items. Reading has 292 active questions on 48 independent passages.
4. **Reading repeated texts across topics.** Freshness now considers passage IDs across the student's whole history before choosing difficulty. A new question on a known passage is distinguished from a new passage. Standalone English history also informs Daily selection.
5. **Reading examples and choices were weak.** Rewrote 42 worked excerpts, removed recycled teaching scenarios, expanded independent passages and repaired narrative similarity, source quotation mismatches, grammatical answer leaks, implausible distractors and repeated evidence targets. The final peer review covered all 42 worked excerpts and 24 Daily activities, repairing 9 worked-example defects and 8 activity near-repeats or missing-context cases. Worked excerpts demonstrate the local method; independent passage sets supply longer transfer contexts.
6. **Science examples did not always teach the assigned task.** Focused bodies, examples and try-its now teach their exact methods. Added 13 questions to close thin coverage. Relabeled the simple mode-versus-majority application medium.
7. **Math coverage and presentation were incomplete.** Added focused explanations for conics, transformations, complex numbers, matrices, modeling, probability and other audited methods; corrected mathematical inconsistencies and misleading shortcuts. Trigonometry reports under Geometry; Modeling is cross-cutting.
8. **Saved broad lessons could retain mismatched pending practice.** Convert the pending task to its precise skill while preserving the session UUID, answered IDs, source checkpoint prefix and clock. Newly required teaching is appended. An old pending review selected for initial conversion follows its teaching immediately.
9. **Refresh changed upcoming work after an answer.** Ordinary focused units retain their main/review assignments. Review promotion occurs only during initial legacy conversion. Answering does not silently move a later review ahead of the next lesson.
10. **Legacy course bootstrap rebuilt the active plan.** Attach recovered coverage to the refreshed saved plan instead of generating a new session. Tested with actual pre-release 1f4fd548 fixtures, rather than a fabricated current-plan approximation.
11. **Hidden or duplicate Reading checkpoints gave false teaching evidence.** Only visible current teaching can establish completion for a matching focused skill. Shared historical snapshots do not stand in for a newly required method or activity.
12. **Reading response and reload progression could disagree.** Apply the same concept-completion normalization after each write and during load, before deciding the next step or completion.
13. **Legacy weaknesses selected a related-looking but wrong skill.** Resolve old scopes through their authored assessment IDs to current primary methods. Fresh timed evidence clears only the method assessed; unrelated weaknesses remain queued.
14. **A topic could earn a practice milestone from one narrow skill.** Require correct evidence across the topic's authored primary skills, in addition to the independent accuracy, recent hard-question and timed-evidence requirements. Historical failures can revoke breadth evidence.
15. **Empty snapshot positions became blank lessons or unbudgeted repairs.** Visible teaching checkpoints drive rendering, ordering, completion and time estimates. Appended repaired content is counted even when its source index appeared earlier.
16. **Daily feedback could jump straight to another lesson.** Keep answer feedback visible until the student advances. Spaced review does not automatically repeat the full lesson; genuinely new prerequisites still require teaching.
17. **Secondary course discovery was misleading.** Extra practice groups named methods under ACT reporting categories, links drills back to the exact repair lesson, and reports actual skill/question counts. Daily remains the primary action.
18. **Mobile controls and Science settings needed checks.** The Science daily toggle remains in Account. Enlarged brand/footer and account input targets, corrected singular lesson copy, and verified responsive wrapping and horizontal overflow.

19. **Daily English repeated identical prerequisites.** Reuse explicit completion of an identical visible prerequisite within the session. Changed teaching, different examples and every primary activity remain required.
20. **A reason/concession skill inherited the wrong example.** Added its own causal-versus-concessive teaching and worked example, preserving existing section positions.

## Content evidence

- `english-content-review.json`, `english-prerequisites.test.ts`: explicit mappings, authored activities and source-bound review records.
- `math-skill-alignment-review.json`, `math-skill-solution-proofs.json`: 474 question assignments, 143 try-its and 80 new questions. 213 executable solution checks and 10 manual conceptual checks; independent review solved the new question keys.
- `reading-science-skill-alignment.json`: frozen prior correct-answer contracts, teaching/skill snapshots and reviewed new-item source hashes. All 144 original Reading keys were independently reviewed against all 24 original passages; 139 choice sets and 409 wrong alternatives were improved, with all 144 explanations revised. All 144 newly authored Reading keys were independently solved; revised narratives and final additions received a subsequent peer review. All 13 Science additions were independently solved.
- Official category references: [ACT Math](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/description-of-math-test.html), [Reading](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/description-of-reading-test.html), and the English/Science standards linked in the preceding ledger.

## Validation boundaries

Automated checks cover every authored skill, exact teaching-to-drill containment, goal/baseline/budget combinations, complete course forecasts, fresh passage selection, held-out separation and actual saved-plan migration. `live-daily-focused.ts` exercises authenticated four-subject teaching, required ordering, matching drills, answer retries, completion and reload against an isolated synthetic account.

These are original learning materials. Difficulty and practice milestones are authored heuristics, not calibrated ACT scores or a guaranteed 36. A near-term test date cannot create time for a multi-month curriculum; Daily reports the actual coverage shortfall. Physical-device and screen-reader certification, sustained load testing and external ACT expert certification are outside this pass.

## Release checks

- `npm run check`: 284 tests, all content validators and the Sites build pass.
- Clean `npm run build:next` passes; native TypeScript generation and type checking are verified separately from Vite's generated types.
- Responsive browser checks at 375×812 and 1280×900 cover the primary page families; authenticated Daily teaching/try/drill/resume was exercised across English, Reading, Mathematics and Science. A modern saved session completed/reloaded with 28 answers. Science is visible in mobile Account settings; inspected pages have no horizontal overflow.
- Native authenticated preflight: 800 URLs across 35 topics, 325 focused lessons and their drills, full references, study routes, exams and results. No route failures; invalid and anonymous paths were checked separately.
- The interface detector reports no findings. The temporary local QA sign-in route was removed before release builds.
- Production URLs, exact source provenance and terminal deployment statuses are reported in the release follow-up after both providers finish.
