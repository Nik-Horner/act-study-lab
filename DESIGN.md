---
name: ACT Study Lab
description: Existing English Lab visual system extended to four ACT subjects
colors:
  bg: "#fbfaf7"
  bg-soft: "#ffffff"
  bg-raised: "#f3f1ea"
  ink: "#1c1b17"
  ink-soft: "#6b6858"
  ink-faint: "#767260"
  border: "#e7e3d6"
  brand: "#2d3a8c"
  brand-dark: "#1f2a68"
  brand-soft: "#e7e9fb"
  accent: "#d97a34"
  accent-soft: "#fbe8d6"
  good: "#2f7a4f"
  good-soft: "#dff1e6"
  warn: "#b8892f"
  warn-soft: "#f7ecd8"
  bad: "#b8433a"
  bad-soft: "#f9e2df"
  on-brand: "#fff"
  data-accent: "#9a4e19"
  dark-bg: "#15161a"
  dark-bg-soft: "#1c1e24"
  dark-bg-raised: "#23252d"
  dark-ink: "#f1efe7"
  dark-ink-soft: "#b3b0a3"
  dark-ink-faint: "#aaa697"
  dark-border: "#313340"
  dark-brand: "#7c8bf0"
  dark-brand-dark: "#a4b0f5"
  dark-brand-soft: "#262b4d"
  dark-accent: "#eb9c5c"
  dark-accent-soft: "#3a2c1c"
  dark-good: "#59c98a"
  dark-good-soft: "#17301f"
  dark-warn: "#e0b45c"
  dark-warn-soft: "#3a2f16"
  dark-bad: "#e2766c"
  dark-bad-soft: "#3a1e1b"
  dark-on-brand: "#15161a"
  dark-data-accent: "#eb9c5c"
typography:
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
  headline:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "1.25"
    letterSpacing: "-0.025em"
  label:
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.06em"
rounded:
  input: "0.5rem"
  choice: "0.8rem"
  card: "1rem"
  pill: "9999px"
spacing:
  page-inline: "1.25rem"
  page-block: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.pill}"
    padding: "0.625rem 1.25rem"
  button-ghost:
    backgroundColor: "{colors.bg-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.bg-soft}"
    rounded: "{rounded.card}"
---

# Design System: ACT Study Lab

## Overview

The incumbent English Lab system is the visual authority. This document records implemented styles, not a new creative identity. Calm neutral surfaces, indigo actions, Geist type, pill controls, and understated cards carry across subjects.

The interface supports compact study sessions with a clear heading, next action, readable lesson content, and visible answer states. Preserve the existing account and lesson → drill → results flow when adding screens.

**Key Characteristics:**
- Quiet neutral surfaces and selective indigo emphasis.
- Rounded controls and restrained card depth.
- Readable passages and persistent digital-test controls.
- Explicit light and dark theme support.

## Colors

### Primary
The brand family supplies indigo actions, selected answers, focus outlines, and soft selected backgrounds. The darker brand variant is the primary-button hover state. On-brand supplies theme-aware button text.

### Secondary
Accent orange supports highlights; data-accent is the stronger foreground variant. Good, warn, and bad families convey correctness, notices, and mistakes, each paired with a soft background.

### Neutral
Background, soft background, and raised background distinguish page, card, and inset surfaces. Ink, soft ink, and faint ink establish text hierarchy; border supplies separators. The frontmatter records the final cascade values, including the later faint-ink override.

**The Theme Rule.** Use the existing CSS custom properties. OS preference sets the default; an explicit data-theme attribute takes precedence. Dark-prefixed tokens document the matching overrides, not separate component color choices.

## Typography

Geist is loaded through next/font; Geist Mono is available through the mono variable. Standard interface text uses the Tailwind sans stack bound to Geist. Headings use semibold weight and tight tracking; study-page headlines grow from text-3xl to text-4xl at the small breakpoint. Results headings start one scale step smaller.

Section labels use the frontmatter label role with uppercase treatment. Lessons use a maximum measure of 72ch and line height 1.75. Numeric study data uses tabular figures. Buttons use text-sm and medium weight; badges use text-xs, semibold weight, uppercase treatment, and wide tracking.

## Layout

The shared main area is centered at max-w-6xl (72rem), with the documented page padding. Header content uses max-w-5xl (64rem). Account forms use max-w-md (28rem). Page-specific containers can be narrower.

Subject navigation wraps and fills available width on small screens, becoming width-fit at the 640px small breakpoint. Reading passage and answers are arranged side by side on desktop and stacked on phones; the passage has its own focusable scroll pane. Consult the surface brief for route-specific composition rather than imposing one grid on every screen.

Below 640px, buttons, selects, answer choices, back links, and main-navigation links receive 44px minimum heights. Theme controls also receive a 44px minimum width.

## Elevation & Depth

Cards combine a thin border with the shared card shadow. Light theme uses `0 1px 2px rgba(28, 27, 23, 0.04), 0 6px 20px -8px rgba(28, 27, 23, 0.12)`; dark theme uses `0 1px 2px rgba(0, 0, 0, 0.2), 0 6px 24px -8px rgba(0, 0, 0, 0.5)`. Raised neutral fills separate inset content. Header and sticky timed-test controls use translucent surfaces with backdrop blur. Selected answers add an inset brand outline.

## Shapes

Cards have softly rounded corners. Buttons and badges use pill shapes; inputs use the smaller input radius. Answer rows use their own choice radius. Subject navigation uses card rounding on phones and pill rounding from the small breakpoint onward.

## Components

- Primary, ghost, and danger buttons share pill shape, medium-weight labels, and small/medium padding variants. Disabled buttons reduce opacity and block pointer events.
- Cards provide surface, border, rounding, and shadow; padding belongs to the caller.
- Inputs use page background, thin borders, text-sm, and brand-colored focus borders. The account form explicitly suppresses the browser outline; document that exception rather than assuming it shares the global focus ring.
- Badges pair semantic foreground and soft background colors; neutral is the default.
- Subject navigation marks the current subject with a soft surface, brand text, and subtle shadow. Main navigation collapses to its existing mobile menu.
- Answer choices use soft card backgrounds, brand borders on hover, and selected/correct/wrong attributes for the respective brand/good/bad fills and borders.
- Global focus-visible uses a 3px brand outline with 3px offset except where component styles override it. Choices and back links use 160ms ease-out transitions. Reduced-motion preference disables transitions and animations.

## Do's and Don'ts

### Do:
- Do reuse the existing palette, Geist typography, rounded controls, and theme variables.
- Do preserve readable passage measure, keyboard focus, and visible answer states.
- Do keep component padding and layout appropriate to the existing study flow.

### Don't:
- Don't replace the English Lab visual identity when extending subjects.
- Don't hard-code light-theme colors into shared themed components.
- Don't introduce a new decorative identity or Canvas artifact for this extension.

Source evidence: src/app/globals.css, src/app/layout.tsx, shared ui components, TopNav, SubjectNav, AccountForm, and ExamRunner. Existing review captures are described in .impeccable/surfaces/act-study.md; this documentation pass did not independently inspect or recapture them. Styles are extracted from source, not computed-style measurements.
