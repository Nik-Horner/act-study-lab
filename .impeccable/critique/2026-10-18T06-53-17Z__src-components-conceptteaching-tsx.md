---
target: Entire ACT app visual discrepancies; primary shared lesson component
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/nikhorner/Documents/Codex/2026-10-05/on-x20/work/act-rework-2026-10-17/src/components/ConceptTeaching.tsx"
target_fingerprint: "sha256:408ce62065fe13ddeb9e7bda56e71572f0fc9619c787b3b2507e85ad2a58fa8d"
target_path: /Users/nikhorner/Documents/Codex/2026-10-05/on-x20/work/act-rework-2026-10-17/src/components/ConceptTeaching.tsx
timestamp: 2026-10-18T06-53-17Z
slug: src-components-conceptteaching-tsx
closed: true
---
Method: dual-agent (A: critique_design_a · B: critique_detector_b)

# Assessment A — independent design review

Method: isolated Assessment A, completed before any detector findings or other assessments were seen. Target: `/Users/nikhorner/Documents/Codex/2026-10-05/on-x20/work/act-rework-2026-10-17/src`; live authenticated isolated learner at https://act-study-lab.nikhorner.chatgpt.site. Approved references inspected directly: `.impeccable/mocks/daily-path.png`, `.impeccable/mocks/lesson-first.png`; binding DESIGN.md section from line195. No ignore file exists.

## Design specificity verdict

This feels authored for ACT Study Lab. Heavy Mona Sans, navy/cobalt hierarchy, cool white surfaces, the four-tile mark, subject colors, path nodes, real marked sentences, and the evidence/lilac-coach pairing form a coherent learning world. It closely follows the approved visual direction. Do not replace the real advanced English lesson with the reference's illustrative Math content or invent completed work to imitate its screenshot.

The main discrepancy is composition under real content and smaller heights. The references put substantial learning evidence and a strong action into a coordinated scene. Live content retains the colors and parts but stacks too many status and orientation layers before the scene. The first screen can feel like preparation for learning rather than learning. No detector output informed this verdict.

## Design health: 29/40 — Good

| Heuristic | Score | Evidence / limitation |
|---|---:|---|
| Visibility of system status | 3 | Loading labels, selected navigation, saved-place language, question position. Too many simultaneous progress axes obscure the next unit of work. |
| Match between system and real world | 3 | Concrete sentences, subjects, course and independent practice language. Challenge/Round/Concept/Idea vocabulary needs interpretation. |
| User control and freedom | 3 | Today’s path, course/topic/practice links, campaign back link; fixed phone navigation. Deep guided-stage navigation not exercised because saved work was protected. |
| Consistency and standards | 3 | Same palette, subject roles, artifact and coach across lesson/drill/campaign. Course prerequisite opening lacks an explicit connection to the requested advanced skill. |
| Error prevention | 3 | Disabled future stages, clear score/planning constraints, unscored guidance separated from independent practice. Submission not exercised. |
| Recognition rather than recall | 2 | Labels and retained source help; users must mentally reconcile Lesson1/2, Concept3/3, Round1/3 and Idea1/3. |
| Flexibility and efficiency | 3 | Drill advertises A–D and Enter; topic practice and campaign paths coexist; settings are grouped. Daily primary action requires unnecessary scrolling. |
| Aesthetic and minimalist design | 3 | Strong approved visual world; large status/header stack consumes learning space. |
| Error recognition and recovery | 3 | Source has retry/account routes and supported correction; preserving first answers is explicit. No live error induced. |
| Help and documentation | 3 | Contextual hints, topic contents, practice explanations, planning descriptions. Some explanation precedes the action it supports. |
| Total | 29/40 | Good; spatial hierarchy and orientation need the next pass. |

Scores are design judgments from representative screenshots and connected source, not claims that all submission/error states were validated.

## What works

1. Artifact and coach have clear complementary roles. The course clause scene highlights the actual subject and pairs it with an explanation, rather than adding unrelated illustration. The independent drill retains the source sentence and four original choices in the same world.
2. Progress is unusually honest. XP requires saved completed Daily sessions; covered skills, formula recall, campaign stars and practice proficiency remain separate. The zero-state does not manufacture mastery.
3. Phone navigation adapts well: four labeled bottom tabs, consistent top brand/account controls, usable subject selectors, and the Daily next-lesson panel moves ahead of the long rail. Settings give clear reassurance that existing work stays saved.

## Priority issues

### [P1] Learning and launch actions arrive too far below the first screen

Observed desktop approximately1270×714: Daily lesson evidence starts around y530 after route bar, formula reminder, subject rail, lesson label, title/subtitle and challenge tracker. Only a sliver of the teaching is visible; Next idea is far below the fold. On390×844 phone, the entire first Daily lesson screen contains chrome/title/status, with neither sentence evidence nor coach visible. On phone dashboard the current lesson card comes first correctly, but its long title, subtitle and word-marking preview push Continue lesson below the first viewport. Phone Play puts Play next mission at the bottom edge under/adjacent to the fixed tab bar in the initial view; the map starts later.

Why: the approved composition's strongest property is immediate substantive learning plus a clear next move. Repeated preparatory layers dilute that property and create a scrolling tax before any progress.

Fix: keep the approved palette/type/paired scene. Compact lesson metadata into one short line, move the optional formula reminder into the path/secondary disclosure, reduce gaps between rail/title/scene, and keep the Daily launch action before or immediately after a bounded preview. Bring Play next mission ahead of the long reward explanation. Do not fix by shrinking body text or globally pinning controls over evidence.

Likely surfaces: `src/components/DailyStudy.tsx` formulaPending block and runner metadata; `src/components/ConceptTeaching.tsx`; `src/app/workspaces.css` `.lesson-player-heading`, `.lesson-quest`, `.daily-subject-rail`; `src/app/globals.css` `.daily-next-preview`, `.daily-next-card`; `src/components/Campaign.tsx`, `src/app/campaign.css`.
Suggested command: `/impeccable layout` then `/impeccable adapt`.

### [P2] Four progress vocabularies compete within the same lesson

The isolated advanced English Daily state simultaneously reads English·Lesson1/2, Concept3of3, Challenge Round1of3·Learn, and Idea1of3, plus the Learn/Explore/Practice footer. These are different denominators, not data corruption, but a learner has to infer their nesting. Round also duplicates the stage footer. The approved reference has one clear Learn/Explore/Practice progression beneath the scene.

Fix: preserve the saved identities and stage logic; simplify only presentation. Show one local progress statement such as Learn·Idea1of3, keep one stage sequence, and put subject/lesson position in compact contextual text. If Challenge is instructional difficulty, label it as such rather than another mission/round layer.

Likely surfaces: `src/components/ConceptTeaching.tsx` `.lesson-quest`, `.lesson-position`, `.lesson-coach-position`, footer; `src/components/DailyStudy.tsx` lesson count; `src/app/workspaces.css` corresponding classes.
Suggested command: `/impeccable distill` and `/impeccable clarify`.

### [P2] Course entry silently changes the visible topic to a prerequisite

Following the Daily visible course destination `/learn/sentence-structure?skill=nested-main-clause` shows Make a complete thought / Clauses and phrases / Concept1of3. The requested advanced skill is not visible in the opening title or a prerequisite label. This is consistent with `focusLesson` retaining source precursor sections and `SkillLesson` starting at index0; it is an orientation issue, not evidence the advanced content disappeared.

Why: a learner opening course help for layered modifiers may think the link went to the wrong lesson. The large child-scene heading hides the parent learning goal.

Fix: retain the pedagogical prerequisite, but name the selected skill in a concise trail and label the early section Prerequisite refresher, with its relationship to the advanced task. Do not skip prerequisite content automatically or alter saved checkpoints just to shorten the view.

Likely surfaces: `src/components/SkillLesson.tsx`, `src/components/ConceptTeaching.tsx`; source selection confirmed in `src/lib/learning-skills.ts:179`.
Suggested command: `/impeccable clarify`.

### [P2] Campaign progress mixes global and selected-subject scope

The English-selected map displays0/204 missions cleared in the reward badge and5 missions·14 question families in the section below. `Campaign.tsx` uses catalog.length for the first and selected.length for the second, so the counts are valid but their scope is not labeled. The giant global denominator is particularly discouraging in a fresh learner's first screen.

Fix: label the badge All subjects, or make the main count reflect the selected subject with an explicitly secondary overall total. Keep saved star arithmetic unchanged. Use one short earned-star explanation and reveal full percentage rules on demand.

Likely surfaces: `src/components/Campaign.tsx` map header and selected-subject description; `.campaign-hero` and reward styles in `src/app/campaign.css`.
Suggested command: `/impeccable clarify`.

## Cognitive load

Three checklist failures = moderate load: single focus (optional formula work competes with active lesson), visual hierarchy (orientation occupies most of first screen), working-memory demand (nested progress counters and unlabeled campaign scope). Chunking, grouping and staged teaching are generally good. Choices are not generally excessive inside a question: four answer options, four subject selectors, four phone tabs. More-than-four decision sets: six desktop destinations including Settings; five English campaign missions; fourteen question-family filter options when expanded. The native collapsed filter is appropriate progressive disclosure; these are observations, not a blanket demand to remove navigation.

Intrinsic load is the actual nested-clause task and should remain. Germane load is supported by marking real words and reading source beside method. Extraneous load is chiefly status/counter interpretation and scrolling before the task.

## Emotional journey

Arrival: reassuring, with a clear next lesson, saved-place message, familiar subject roles and no invented achievement. Valley: opening a lesson first reveals formula obligations and a long list of positional signals. On phone the promised teaching starts beyond the first screen. Learning peak: the actual clause scene and lilac coach are clear and concrete once reached. Progress ending: honest record keeping, but several zero denominators plus distant milestones can feel like a ledger of unfinished obligations. First-answer feedback, completion celebration and error recovery were not exercised; no outcome claims are made about them.

## Personas

- Jordan, first-timer: Continue lesson is below the phone fold; course help displays Make a complete thought rather than the selected advanced skill; Lesson/Concept/Round/Idea nesting makes remaining work hard to estimate.
- Casey, distracted phone learner: phone tabs are strong and labeled, but the initial Daily lesson has no visible learning artifact or coach. The learner must scroll past optional formulas and status before resuming actual work. Phone Play likewise spends most of a screen on headline/reward rules before its primary action/map.
- Sam, accessibility-dependent learner: real labels, skip link and native-looking controls are positive; the sentence exposes every word as a checkbox, creating eighteen sequential stops before the coach in the observed example. That follows the marking task, so not a failure claim without keyboard/VoiceOver testing. Check whether a skip-marking/skip-to-coach route is needed. Full contrast, screen-reader output,200% zoom and keyboard progression were not tested.

No project-specific personas generated: no Design Context section found in CLAUDE.md.

## Minor observations

- Drill repeats the same long skill name in the page headline and workspace heading, consuming space before the sentence. Keep the workspace context, shorten the outer page title.
- Introductory clause scene is notably more concrete than the generic advanced sentence plus long coach paragraph. Improve authored advanced examples inside the existing world, not by adding decorative graphs.
- The progress milestone label1 sessions should be singular.
- The global ledger is factual; add a nearby achievable next step rather than inventing percent mastery from coverage.
- Clicked navigation links sometimes left the AX state unchanged; direct navigation to the observed href reached the destination. This review does not diagnose a routing bug from that behavior.

## Questions for synthesis

1. Should the first phone lesson screen prioritize the actual evidence/coach, or the optional formula reminder and full positional trail? Recommended: evidence/coach.
2. Should course prerequisites be labeled explicitly while retaining sequence, or should the entry screen present a short prerequisite summary first? Recommended: explicit label with retained sequence.
3. Should Play's main completion count follow the selected subject or remain global with a clear All subjects label? Recommended: selected subject with secondary overall total.

## Boundaries

Inspected live desktop Daily, Daily lesson, course lesson, drill, Play map/mission intro, account and progress; phone Daily, Daily lesson and Play. No answers, markers, settings, progress or campaign start were submitted. No detector was run or read. No source files were edited. No screen-reader/contrast/exhaustive curriculum or error-path validation; mission player beyond Start mission was excluded to protect saved state. Source and live can differ; findings above distinguish source inference from visible evidence.


# Assessment B — detector and browser evidence

Independent of Assessment A. Read-only review; no source changes. Target: /Users/nikhorner/Documents/Codex/2026-10-05/on-x20/work/act-rework-2026-10-17/src.

## Deterministic scan

Executed `/Users/nikhorner/.agents/skills/impeccable/scripts/impeccable detect --json src` from actualRoot. 78 scannable markup files (<500); exit 2 means findings. Complete valid JSON array saved to `detector.json` beside this report. No ignore file exists at `.impeccable/critique/ignore.md`.

295 findings total: 294 advisory and 1 warning. Rules: design-system-font-size 252; design-system-radius 36; design-system-color 6; border-accent-on-rounded 1. Files: campaign.css 28, globals.css 167, workspaces.css 100.

All locations (relative to src):

- `app/campaign.css` — `design-system-font-size`: 26, 39, 44, 78, 96, 150, 167, 194, 198, 239, 292, 311, 376, 386, 408, 460, 483, 497, 522, 531, 589, 598, 607, 626, 637.
- `app/campaign.css` — `design-system-radius`: 106, 457, 557.
- `app/globals.css` — `border-accent-on-rounded`: 810.
- `app/globals.css` — `design-system-color`: 712, 716, 719, 968, 1104, 1355.
- `app/globals.css` — `design-system-font-size`: 261, 271, 515, 558, 563, 683, 694, 735, 772, 833, 852, 872, 912, 981, 988, 1000, 1004, 1010, 1036, 1042, 1058, 1076, 1080, 1086, 1098, 1122, 1125, 1129, 1164, 1202, 1212, 1219, 1254, 1358, 1361, 1376, 1382, 1393, 1417, 1423, 1541, 1562, 1580, 1583, 1617, 1631, 1646, 1659, 1671, 1734, 1782, 1789, 1824, 1831, 1854, 1866, 1873, 1878, 1886, 1907, 1916, 1933, 1954, 1977, 1980, 1996, 1999, 2035, 2059, 2062, 2068, 2097, 2132, 2141, 2146, 2157, 2179, 2185, 2200, 2217, 2240, 2243, 2262, 2265, 2289, 2294, 2313, 2322, 2345, 2413, 2422, 2431, 2434, 2437, 2443, 2446, 2452, 2502, 2516, 2538, 2552, 2561, 2577, 2591, 2670, 2674, 2680, 2691, 2698, 2704, 2735, 2755, 2765, 2802, 2807, 2813, 2837, 2843, 2868, 2872, 2892, 2899, 2910, 2924, 2937, 2961, 2968, 3019, 3031, 3035, 3058, 3067, 3115, 3126, 3134.
- `app/globals.css` — `design-system-radius`: 203, 708, 713, 713, 713, 720, 720, 720, 865, 1176, 1241, 1250, 1261, 1282, 1293, 1299, 1564, 1891, 1926, 1995, 2006, 2016, 2027, 2111, 2312.
- `app/workspaces.css` — `design-system-font-size`: 13, 47, 54, 63, 117, 138, 151, 191, 210, 227, 240, 291, 306, 315, 322, 328, 364, 374, 392, 410, 463, 468, 482, 503, 547, 551, 607, 645, 653, 678, 703, 718, 722, 729, 742, 793, 802, 831, 840, 852, 856, 873, 900, 911, 961, 964, 984, 989, 994, 1004, 1046, 1051, 1057, 1084, 1089, 1102, 1113, 1118, 1129, 1157, 1195, 1199, 1214, 1248, 1252, 1255, 1273, 1290, 1304, 1379, 1430, 1447, 1455, 1458, 1481, 1537, 1542, 1548, 1559, 1565, 1575, 1580, 1593, 1607, 1633, 1637, 1659, 1663, 1673, 1686, 1694, 1722.
- `app/workspaces.css` — `design-system-radius`: 11, 42, 137, 251, 258, 476, 481, 541.

## False positives and interpretation

- The 294 token advisories are not 294 confirmed user-facing defects. DESIGN.md explicitly documents coach body 1.15rem and responsive lesson title 2.1rem in prose, yet these are flagged (campaign.css:167 and globals.css/workspaces.css responsive values are examples of an incompletely machine-readable ramp). 12–14px metadata and differing headline scales also have deliberate roles. Assess type readability in context before normalizing every value.
- Radius detection flags literal equivalents and deliberate special shapes, including repeated corner values within a single declaration; these are not independent usability failures. DESIGN.md frontmatter only includes eight radii, while source includes intentional mark tiles and custom controls.
- Color findings in globals.css:712,716,719 are brand mark tiles. Do not remove product-specific colors merely because literal values were detected. Other hardcoded completion greens at 968,1104,1355 merit token consistency review, especially dark theme, but no live dark-theme failure was tested.
- The single warning at globals.css:810 is `.study-button {border-bottom:3px solid rgb(15 35 80 / 13%)}`. This is a subtle shared press/elevation cue, not a thick colored side accent on a card. Detector description overstates it; treat as style preference/cascade cleanup at most.

## Browser method and limitations

Fresh isolated IAB tab created with browser ID 2 at the live Daily lesson URL; authenticated QA learner already present. Inspected four representative pages using screenshots, AX snapshots, read-only DOM/computed styles: `/daily?view=lesson`, `/progress`, `/math-formulas`, `/dashboard`. Desktop viewport 1280×720. No answer submissions, authentication/settings changes, or profile data edits. Navigation only; no lesson stage advancement.

The browser evaluate API is explicitly read-only and prohibits DOM mutation. Therefore mutable document-title/script preflight, detector script injection, localhost live server, console overlay findings, and user-visible overlay presentation were skipped. No live overlay exists. Concrete fallback: native screenshots, AX observations, read-only geometry/computed-style measurements, plus CLI scan. No server was started and no stop action is necessary.

## Concrete live evidence

### 1. Primary study actions are below the initial desktop viewport (P2)

- Daily dashboard: at 1280×720, Continue lesson starts y=722.61 and is 62px tall. The heading, plan banner, and sentence preview fill the screen before the action appears. This raises the effort to resume, despite a clear card composition. DailyPath.tsx:235–306; globals.css daily-next-card/preview/action styles around 990–1042 and 2494 onward.
- Daily lesson: Next idea y=1003.89, height 56px. Header/title/source/coach consume the first screen; the next action is almost 284px below the initial viewport bottom. User must scroll each dense learning screen. ConceptTeaching.tsx footer begins 282; workspaces.css:1135–1197. Preserve document-flow accessibility and evidence; reduce top/blank space or provide a nearby continuation affordance where it does not cover content.
- Formula recall: Reveal formula y=849, height48px. The unrevealed prompt is a 250px minimum blank panel (workspaces.css:424) containing only “What is the formula?”. Top filter/progress/header consumes ~450px. The primary control is below fold before any formula is visible. FormulaCards.tsx:80–134. Shrink the unrevealed placeholder or bring Reveal adjacent to the prompt; keep revealed worked content full size.
- These are discoverability/efficiency issues, not blockers. Scrolling works; do not claim primary actions are unreachable.

### 2. Small touch affordances and secondary type need targeted polish (P2/P3)

- Theme toggle is 32×32px on all four inspected desktop pages. Confirmed in ThemeToggle.tsx class h-8 w-8. Below 44px enhanced target convention, but above 24px WCAG2.2 AA target minimum; do not label as a blanket WCAG failure.
- Lesson word-marking controls are ~43.19px high; smallest widths measured 27.22px for blank,30.52px “the”,33.48px “two”. Interactive prose is intentionally inline; increasing all words to44px squares would damage reading flow. A larger selection affordance or enough inline spacing is preferable if phone evidence confirms difficulty. No answer or scratch mark was changed.
- Formula reference links are20px tall, with widths86–175px. They are secondary inline links; spacing/exceptions matter before making a compliance claim.
- Lesson artifact instructions are12px at 1280px, saved-progress note12.8px, whereas lesson subtitle20px and headline42.4px. This makes “scratch work” and “check against explanation” easy to miss compared with the task title. globals.css:1877 and workspaces.css:1197.

### 3. No horizontal overflow or sampled contrast defect at desktop

- Document scrollWidth1269 within innerWidth1280 across inspected pages, including lesson, Progress, Formula recall, and dashboard. Long lesson title fits one desktop line; dashboard repeats it in narrower path/preview columns but wraps without overflow.
- Secondary text rgb(82,101,129) on white has5.94:1 contrast; on rgb(248,250,255)5.69:1. White on brand rgb(40,86,237)5.76:1. These sampled text pairs pass4.5:1. Do not claim full WCAG audit: no exhaustive chart/state/disabled/hover/dark coverage.

### 4. Honest saved-record semantics observed

- QA Progress shows0 completed sessions,0/325 skills,0/80 formulas recalled on two days, Level1 and0XP. These are explicit separate measures; saved completion is not conflated with coverage. Desktop screenshot shows Subject practice records starts at y658.42 after large learning/milestone cards, so per-subject progress is below fold. This is hierarchy density, not missing information.
- Formula recall clearly says a new visit starts a fresh round. Current card/card-count and recall-round total are both shown, though text instructions repeat “Recall before revealing” in several places. Potential simplification without changing progress behavior.

## Unchecked boundaries

Did not submit answers, reveal/rate cards, complete lessons, test saves, change theme, or test errors/empty states by writing data. Keyboard/screen-reader behavior was inspected semantically only; no full assistive-technology pass. No local/live deployment equivalence assertion: CLI scans current local source; browser evidence is the published site. Screenshots inspected in native tool output; no image files were persisted. Initial parent viewport override did not affect this isolated session. After explicit coordination, set browser2 viewport to390×844, completed a bounded three-page phone sweep, reset viewport, and closed the temporary tab.


## Coordinated phone evidence (390×844)

Inspected Daily lesson, dashboard, and Daily formula recall with native screenshots and read-only geometry. Viewport override applied only after parent coordination; reset and temporary tab closed afterward. No answers/reveals/ratings submitted.

- **P1 candidate: the phone lesson first screen contains no learning evidence or next action.** At390×844 the header, formula reminder, subject trail, repeated lesson label/title/subtitle, and Concept3of3 chip consume the first screen. First word-marking controls start y881.95; Next idea starts y1743.64 (56px tall). Sticky bottom nav starts y779.95, so usable first-screen content ends earlier. Header density pushes the actual task more than a screen down and next action more than two screen heights into the document. Scrolling remains available, so this is serious friction rather than a completion blocker. Compress mobile lesson metadata/reminder/trail spacing and give source/coach the first-screen priority while retaining exact authored evidence.
- Dashboard mobile correctly puts next-lesson card before the subject path. But Continue lesson still starts y871.70 with54px height, below viewport and fixed navigation, because the interactive preview is presented before the entry action. Put a resume affordance beside the card heading or compact the preview rather than discarding actual source evidence.
- Daily formula recall mobile: Continue to lessons starts y234.59 and is48px tall; primary Reveal formula starts y875.41 and is48px tall. Empty formula prompt dominates bottom of first screen; “Recall before revealing” is repeated in header/status/body. Shrink unrevealed panel or pull Reveal next to the prompt. Header also exposes raw date2026-12-17 instead of the dashboard’s “Dec17”; minor consistency/copy issue.
- No horizontal document overflow in three phone pages: scrollWidth379 within innerWidth390. Long lesson titles wrap without clipping.
- Phone global theme and account targets are44×44px, and bottom tabs88.75×56.05px. Thus the desktop32px theme target does **not** carry over to phone. Inline lesson words are44px high but smallest widths27–34px; note enhanced target concern, not AA failure.
- Fixed bottom navigation present and clearly labeled. No observation proved persistent content occlusion; a control being below fold is distinct from being unreachable under navigation. Do not claim answers/next controls are blocked.

Questions skipped: user already requested all visual fixes against the approved direction.
