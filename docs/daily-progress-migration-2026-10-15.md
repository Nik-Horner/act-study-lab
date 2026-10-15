# Daily history recovery

The focused curriculum changed canonical coverage identifiers. Saved legacy identifiers were retained in the database but filtered out of the new skill counter and scheduler. Existing coverage arrays also prevented the API from loading older sessions to recover their credit.

The API now paginates the owner's full Daily plan history once, even when an older coverage array exists. Completed plan snapshots map their actual assigned assessment questions to current primary skills; broad practice pools do not grant unassessed skills. Original identifiers remain intact. Previously credited units in an unfinished legacy snapshot keep their credit. A versioned snapshot preserves the recovered coverage and completed session IDs for subsequent loads and new plans. Answers, plan identity, concept checkpoints, pacing, and uncertain answers are retained.

Daily now labels completed sessions separately from focused skills covered. Expanded curriculum size no longer masquerades as a count of study days. Forecasting and future selection use the recovered skill coverage.

Regression coverage includes a ten-session legacy history, current snapshots with coverage arrays, deduplication, independent session counts, incomplete plans, partial unit credit, stable reloads, and future scheduling. The authenticated integration script creates an isolated auto-confirmed QA account, seeds ten historical completed plans and a current saved plan, and verifies migration, two reloads, checkpoint retention, and ownership-filtered persistence. It does not access existing student accounts.

The GPT site's existing formula review update (source 43178dfdfcdd12fc0cf51b9e086e93ef561455f1, version 20) is preserved and synchronized to the Vercel codebase with this release.
