---
name: ACT Study Lab
description: The approved Daily path and large-artifact lesson experience across all study pages
colors:
  bg: "#f8faff"
  bg-soft: "#ffffff"
  bg-raised: "#edf2fc"
  ink: "#14213d"
  ink-soft: "#526581"
  ink-faint: "#65728c"
  border: "#dfe7f5"
  brand: "#2856ed"
  brand-dark: "#1c42c5"
  brand-soft: "#eaf0ff"
  on-brand: "#fff"
  accent: "#a85c18"
  accent-soft: "#fff1e0"
  data-accent: "#9a4e19"
  good: "#286d45"
  good-soft: "#dff1e6"
  warn: "#80601f"
  warn-soft: "#f7ecd8"
  bad: "#a63730"
  bad-soft: "#f9e2df"
  subject-english: "#477b15"
  subject-english-soft: "#d9f4a8"
  subject-math: "#2856ed"
  subject-math-soft: "#e9efff"
  subject-reading: "#7243be"
  subject-reading-soft: "#eee6ff"
  subject-science: "#b34530"
  subject-science-soft: "#ffe8e1"
  dark-bg: "#111a2b"
  dark-bg-soft: "#172338"
  dark-bg-raised: "#20304a"
  dark-ink: "#f2f6ff"
  dark-ink-soft: "#b6c5df"
  dark-ink-faint: "#9cafcd"
  dark-border: "#334662"
  dark-brand: "#93afff"
  dark-brand-dark: "#bdccff"
  dark-brand-soft: "#223765"
  dark-on-brand: "#111a2b"
  dark-accent: "#eb9c5c"
  dark-accent-soft: "#3a2c1c"
  dark-data-accent: "#eb9c5c"
  dark-good: "#59c98a"
  dark-good-soft: "#17301f"
  dark-warn: "#e0b45c"
  dark-warn-soft: "#3a2f16"
  dark-bad: "#e2766c"
  dark-bad-soft: "#3a1e1b"
  dark-subject-english: "#b9df90"
  dark-subject-english-soft: "#263f27"
  dark-subject-math: "#a7bdff"
  dark-subject-math-soft: "#223765"
  dark-subject-reading: "#ccb4fa"
  dark-subject-reading-soft: "#302d4e"
  dark-subject-science: "#ffb3a5"
  dark-subject-science-soft: "#492d2c"
typography:
  display:
    fontFamily: "Mona Sans, Arial, Helvetica, sans-serif"
    fontSize: "clamp(48px, 6vw, 76px)"
    fontWeight: 800
    lineHeight: "1.04"
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Mona Sans, Arial, Helvetica, sans-serif"
    fontSize: "2rem"
    fontWeight: 780
    lineHeight: "1.2"
    letterSpacing: "-0.035em"
  daily-title:
    fontSize: "clamp(32px, 3.5vw, 50px)"
    fontWeight: 800
    lineHeight: "1.12"
    letterSpacing: "-0.04em"
  lesson-title:
    fontSize: "2.65rem"
    fontWeight: 850
    lineHeight: "1.15"
    letterSpacing: "-0.04em"
  coach-title:
    fontSize: "1.85rem"
    fontWeight: 850
    lineHeight: "1.2"
    letterSpacing: "-0.035em"
  campaign-title:
    fontSize: "clamp(2.3rem, 4.5vw, 4.2rem)"
    fontWeight: 850
    lineHeight: "1.03"
    letterSpacing: "-0.04em"
  mission-title:
    fontSize: "clamp(1.6rem, 3vw, 2.5rem)"
    fontWeight: 850
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Mona Sans, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    lineHeight: "1.55"
  action:
    fontSize: "15px"
    fontWeight: 600
rounded:
  input: "8px"
  control: "12px"
  choice: "12px"
  inset: "14px"
  card: "16px"
  next-lesson: "17px"
  focused-lesson: "18px"
  pill: "9999px"
  mission-node: "50%"
spacing:
  page-inline: "32px"
  page-inline-phone: "18px"
  workspace-gap: "24px"
  path-gap: "28px"
  course-gap: "2rem"
  lesson-scene-gap: "14px"
  campaign-board-gap: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.brand-dark}"
  button-ghost:
    backgroundColor: "{colors.bg-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  button-danger:
    backgroundColor: "{colors.bad}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.bg-soft}"
    rounded: "{rounded.card}"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "8px 12px"
  answer-choice:
    backgroundColor: "{colors.bg-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.choice}"
    padding: "0.9rem 1rem"
  course-search:
    backgroundColor: "{colors.bg-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "0.7rem 0.9rem"
  learning-stage-current:
    backgroundColor: "transparent"
    textColor: "{colors.brand}"
    padding: "0.4rem 0.65rem"
  lesson-canvas:
    backgroundColor: "{colors.bg-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inset}"
    padding: "1.5rem"
  lesson-coach:
    backgroundColor: "{colors.subject-reading-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inset}"
    padding: "1.75rem"
  lesson-coach-wide-exploration:
    backgroundColor: "{colors.subject-reading-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inset}"
    padding: "1.35rem"
  campaign-evidence:
    backgroundColor: "{colors.bg-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inset}"
    padding: "1.5rem"
  campaign-move:
    backgroundColor: "{colors.subject-reading-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inset}"
    padding: "1.5rem"
  campaign-node:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.mission-node}"
    width: "76px"
    height: "76px"
  campaign-node-mobile:
    width: "58px"
    height: "58px"
---

# Design System: ACT Study Lab

## Overview

The first approved Daily path and focused lesson mockups are binding: `.impeccable/mocks/daily-path.png` and `.impeccable/mocks/lesson-first.png`. The user reaffirmed this exact world and rejected later alternatives. Mona Sans, white/cool-blue surfaces, navy text, cobalt actions, lime/lilac/coral subject roles, the tile mark, and the left navigation remain unchanged.

The lesson centers a large source artifact beside a lilac coach. One authored idea or example appears at a time; Learn / Explore / Practice progress and a strong next action sit below. The same world carries through drills, exams, formulas, account/auth screens, references, and saved results. Light is the default; an explicit saved dark preference remains valid. The campaign extends this same world with connected missions, earned stars, and full-context answer rounds; it does not replace the approved lesson direction.

**Key Characteristics:**
- The original approved composition, with no new visual-world choice.
- A large authored learning artifact beside a focused lilac coach.
- One idea/example at a time, then an unscored check and separate independent practice.
- Real saved progress and student-supplied planning settings across phone and laptop.

## Colors

### Primary
Cobalt supplies actions, selected navigation, current path nodes, active learning stages, and focus outlines. Its soft fill separates plan details and selected states. Dark mode uses the lighter cobalt family with dark on-brand text.

### Secondary
English uses green/lime, Math cobalt/pale blue, Reading violet/lilac, and Science terracotta/pale coral. Separate good/warn/bad families communicate answer state. Soft lilac supports guided practice across subjects; it is not exclusive to Reading.

### Neutral
Cool page, white surface, and pale-blue inset tokens provide separation. Navy and blue-gray inks establish hierarchy. Dark mode uses navy surfaces, light ink, and adjusted subject foregrounds.

**The Theme Rule.** Use the existing CSS custom properties. The app initializes light to match the approved comp and restores an explicitly saved dark choice before paint. Dark-prefixed tokens describe matching overrides, not a separate visual identity.

**The Evidence Rule.** A diagram, color, or highlight must help explain content or state. Keep the underlying text, data, and accessible control available.

## Typography

Mona Sans is loaded through `next/font/google`; the retained `--font-geist-sans` variable name resolves to Mona Sans. Geist Mono remains available. Authored math uses the existing KaTeX rendering and MathML.

`StudyPageHeader` retains the 2rem/780/1.2 headline role. The lesson player uses 2.65rem/850/1.15 with -0.04em tracking; it becomes 2.1rem at 901–1100px and 2rem at 900px and below. The coach title is 1.85rem/850/1.2, with 1.15rem/1.8 explanation text. Cost amounts and the active equation use 850 weight. The Daily/public headline roles remain distinct. Body text is 16px/1.55; full reference prose retains its readable measure. Numeric data uses tabular figures. The campaign map headline uses `clamp(2.3rem, 4.5vw, 4.2rem)` at 850 weight and 1.03 line height; mission titles use `clamp(1.6rem, 3vw, 2.5rem)` at 850. This extends the existing heavy Mona Sans hierarchy.

## Layout

The public container caps at 1320px. Signed-in pages retain the fixed sidebar, with the lesson player's sidebar set to 222px from 1100px. The lesson route fills the available main width. Its subject trail and large title lead into a `1.35fr / 1fr` artifact/coach grid with a 14px gap. The white bordered artifact has 1.5rem padding; the lilac coach has 1.75rem. Both have 14px corners. At 900px and below, the same evidence and coach stack with 1.25rem padding. From 1100px, the introductory exploration uses a graph height of `min(36vh, 360px)`, 1.35rem coach padding, and 68px minimum cost-answer tiles. The stage fieldset and introductory exploration reset native margin, padding, and border so the next action remains reachable.

The Learn / Explore / Practice footer stays in document flow beneath the scene. Its cobalt action is at least 56px tall and 250px wide on desktop; phone actions share a full-width row. Independent practice, exams, and formula recall use a common 18px workspace shell, toolbar, position bar, and content area. Course/subject browsers keep searchable topic groups and responsive study-mode lists. Full topic references remain available alongside focused lessons.

Daily retains its path and next-lesson panel, with the panel first below 640px. At 900px and below, a sticky top bar and four fixed bottom tabs replace the sidebar. Do not obscure lesson evidence or controls with fixed navigation. The course trail shows the current subject only; completed styling on the Daily rail requires saved completion evidence.

Campaign map/player containers cap at 1200px. The player uses a `1.25fr / 1fr` evidence/answer grid with 1.5rem gap and 14px surfaces. Desktop evidence scrolls within a 72dvh maximum. At 900px and below, Passage & evidence / Question tabs switch between complete panes; evidence uses ordinary page scrolling. Mission nodes shrink from 76px to 58px, and round markers from 40px to 32px. Evidence must remain available from every question.

## Elevation & Depth

Borders and soft fills carry most separation. The default card shadow is `0 2px 4px rgb(23 36 66 / 3%), 0 10px 24px -18px rgb(23 36 66 / 16%)`; major learning surfaces are primarily bordered. Active navigation and path nodes have small local shadows. Controls use a subtle lower edge and move down 1px when pressed.

The next lesson enters over 280ms only without reduced-motion preference; ordinary transitions use 160ms. Reduced motion disables transitions and animation. Earlier explicit-theme card-shadow overrides remain different from the later default; this retained cascade is not a new rule to copy.

## Shapes

Use rounded rectangles: 8px fields, 12px shared controls/choices, 14px lesson artifact and coach panels/answer tiles, 16px cards, and 18px task workspaces. Circles belong to subject nodes and completion checks. Footer stage progress uses short bars or earned checks rather than numbered tab pills. The geometric tile mark and line SVG icons unify the interface. Campaign mission/round nodes are circular; star icons reflect actual saved rewards. Campaign-only offset shadows are not promoted into the shared elevation tokens.

## Components

### Shared header and course browser
`StudyPageHeader` connects course, practice, formula tools, exam starts/results, and progress. Use a factual title and short task explanation, plus a return link or actions where useful. `CourseBrowser` exposes all four subjects, groups focused skills by topic, and searches skill/category/topic text. Search opens matching topic groups and provides an empty state. `SubjectOverview` consistently offers learning, independent practice, and mistake review with actual saved topic attempts, accuracy, and milestones. Daily remains the common scheduling destination.

### Approved lesson player
`ConceptTeaching` is shared by `SkillLesson` and both Daily adapters. Learn presents one authored idea at a time, Explore presents one authored example at a time, and Practice presents the unscored guided activity when present. Future stages unlock in order; visited stages remain available. Controls stay disabled until client interaction is ready. The separate independent-practice handoff preserves the distinction between teaching support and scored work.

`LessonArtifact` displays the exact authored source for the current section/example: example-specific evidence first, then section evidence, relevant activity evidence, or the original source stimulus. Do not substitute an attractive unrelated graph. Four explicit skill IDs and the English clause prerequisite have full introductory scenes. The approved cost scene has the moving cost graph, coordinate labels, green callout, one-hour 3 + 2 = 5 reasoning, and unscored choices. Its equation and graph remain consistent with the selected hours. Generic scenes preserve the rest of the curriculum's real source material.

`LessonSubjectTrail` exposes all four course subjects and marks only the actual current one. The Daily rail derives current/completed states from saved snapshots. Preserve original source indices and checkpoint keys across both adapters. Complete `TopicReference` pages retain all original teaching and examples.

### Recovery
`PracticeRecovery` offers supported method review after a drill miss in all subjects, retaining the original saved answer and grade. Its correction is unscored and does not count as unseen independent evidence. Daily's existing recovery can request a fresh same-skill question; when none remains, the interface reports that limit and returns the skill to review. Four signature explorations supplement the original teaching, activities, diagrams, and passages rather than replacing them.

### Task workspaces, controls, and results
`StudyWorkspace` carries the same toolbar, evidence space, position indicator, and controls across English/other-subject drills, timed exams, and formula recall. `AuthLayout` and the structured account editor reuse the same palette and surfaces. `ResultSummary` reports actual practice accuracy/time/unanswered totals; `ReviewFilter` switches missed/all answers across the four exam result flows. English review filtering does not rewrite the saved response.

Shared buttons retain 12px corners, at least 48px height, focus/hover/press feedback, and disabled states. Fields are labeled with at least 44px height; generic choices have 58px minimum height and larger practice/lesson choices remain contextual. Lesson answer tiles use two columns where space permits, selected cobalt fill, and explicit feedback. Global focus-visible uses a 3px brand outline with 3px offset. Footer stages use transparent controls, cobalt current text/bar, and completion checks only when earned.

### Campaign map and saved rounds
`Campaign` powers `/play` with four subject selectors, topic-family filtering, connected mission nodes, saved position, earned-star totals, and mission results. It retains full passages, numbered edits, placement markers, graphs, and original question choices. Desktop uses white evidence and a lilac move panel; mobile tabs expose the same context and question independently. Optional elimination is distinct from answer selection. The answer is committed and saved before feedback, rule links, and the next-round action appear. Calculator access is Math-only.

Round states distinguish current, correct, review, and next using labels and appearance. Mission stars come from immutable first answers in that mission: one for completion, two at 60%, three at 85%; replay/review adds none. A prior encounter elsewhere in the app does not make a question unseen. Stars remain separate from Daily XP and course coverage. Error/reload states preserve the saved answer and protect against stale-tab writes.

### Navigation, Daily, and progress
Desktop navigation now exposes Today, Course, Play, Progress, Formulas, and Settings. Play covers campaign, practice, drill, and exam routes; Today, the practice hub, lesson transfer, and Progress also link to the campaign. The desktop lesson player uses the comp’s quieter soft-cobalt active navigation; other desktop destinations retain their existing active treatment. Mobile uses the four primary bottom tabs with account/theme controls above. Daily study keeps next/current/done states, estimated time, optional formula recall, and resumability. Its next-unit preview now uses real activity evidence with interactive markers, the compact clause-recognition scene for the matching prerequisite, or `LessonArtifact` for other authored sources. The actual account’s active English unit must not be replaced with the mockup’s sample Math unit to improve image similarity. Account planning accepts 15–240 whole minutes per day. Timed exams retain their separate timer.

Rewards derive only from saved completed Daily sessions: 100 XP per session and one level per five sessions from level 1. Earlier completions count equally. Completed-session credit, lesson coverage, practice milestones, and saved answers remain separate measures; guided support must not inflate them.

## Do's and Don'ts

### Do:
- Do implement the original approved mockups using Mona Sans, shared theme variables, ConceptTeaching, and common task workspaces.
- Do show the current idea/example with its exact source evidence and distinguish guided support from independent evidence.
- Do preserve saved progress and legacy preferences while requiring new students to supply their own planning values.
- Do place concept actions after the evidence, keep content clear of mobile tabs, and honor reduced motion.

### Don't:
- Don't reopen the approved visual-world choice or apply the rejected Fieldwork/Chapters/Orbit directions.
- Don't treat a guided check, supported correction, or lesson visit as fresh scored mastery.
- Don't copy mockup progress or claim optimal learning, validated score gains, or official ACT affiliation.
- Don't reintroduce the old cream/Geist extension-only identity or create Canvas artifacts.

Source: `globals.css`, `workspaces.css`, `campaign.css`, `layout.tsx`, shared lesson/task/auth/result components, `Campaign`, and the campaign content/manifest/state/API modules. Version 31 is the published baseline. The campaign has a scoped SHIP review but remains unpublished until packaging and Worker QA; no whole-app or screenshot-match approval is claimed. The old Daily comparison gate remains unpassed and was not forced. Earlier release evidence does not verify current campaign behavior. Local campaign offset shadows and legacy label/shadow cascade drift are not promoted into shared design rules.
