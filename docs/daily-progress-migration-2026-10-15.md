# Daily history recovery

The focused curriculum changed canonical coverage identifiers. Saved legacy identifiers were retained in the database but filtered out of the new skill counter and scheduler. Existing coverage arrays also prevented the API from loading older sessions to recover their credit.

The API now paginates the owner's full Daily plan history once, even when an older coverage array exists. Completed plan snapshots map their actual assigned assessment questions to current primary skills; broad practice pools do not grant unassessed skills. Original identifiers remain intact. Previously credited units in an unfinished legacy snapshot keep their credit. A versioned snapshot preserves the recovered coverage and completed session IDs for subsequent loads and new plans. Answers, plan identity, concept checkpoints, pacing, and uncertain answers are retained.

Daily now labels completed sessions separately from focused skills covered. Expanded curriculum size no longer masquerades as a count of study days. Forecasting and future selection use the recovered skill coverage.

Regression coverage includes a ten-session legacy history, current snapshots with coverage arrays, deduplication, independent session counts, incomplete plans, partial unit credit, stable reloads, and future scheduling. The authenticated integration script creates an isolated auto-confirmed QA account, seeds ten historical completed plans and a current saved plan, and verifies migration, two reloads, checkpoint retention, and ownership-filtered persistence. It does not access existing student accounts.

The GPT site's existing formula review update (source 43178dfdfcdd12fc0cf51b9e086e93ef561455f1, version 20) is preserved and synchronized to the Vercel codebase with this release.

## Platform-wide follow-up

The subject dashboard used only active assessment questions for its practice count and status. Retired Reading questions were still loaded and their mistakes remained available, but a student with only historical practice could see “Not started.” The dashboard now counts all distinct completed drill questions for visible practice history, including retired items, and explicitly notes when prior lesson practice is included. Mastery continues to require independent evidence on the current skills; historical attempts are not erased or promoted into unearned new mastery.

A frozen catalog from pre-update source `1f4fd548f508243826216d619ecce513662c052f` checks all 1,557 historical question IDs, topics and grading keys. Every historical non-English drill is hydrated with its original answer identity, choice, timing, confidence and mistake classification. All six Math/Reading/Science forms and both English forms retain question/passage identities and answer keys. Existing English baseline totals/streaks, immutable events, Daily checkpoints, saved exam attempts, offline retry state, account isolation, and score-check histories are covered by the full suite and authenticated account/resume integration scripts.

The automatic Daily migration is owner-scoped and runs for each account on its first Daily load. Verification uses isolated QA accounts, not a bulk inspection of real students' records. Authenticated production history recovery and full account save/reload smoke checks passed on both providers for the first release.
