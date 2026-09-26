---
name: m3-expressive
description: The Hub's Material 3 Expressive design system — color roles, type, shape, motion and component rules. Load before adding or restyling any page or component in src/.
---

# Material 3 Expressive in the Knowledge Hub

The site hand-rolls Material 3 Expressive instead of using a component
library, so every component shares one token set and stays small. Read this
before touching `src/styles/` or adding UI.

## Color

- Roles are generated, never hand-written: `npm run theme` runs
  `scripts/gen-theme.ts` and rewrites `src/styles/tokens.css`.
- The seed is USC Cardinal `#990000` with the Fidelity scheme and the 2025
  spec. Three overrides: secondary is a quiet cardinal-tinted neutral (selection
  states), tertiary is USC Gold, and neutrals have low chroma so surfaces read
  as paper, not pink.
- Use `--md-sys-color-*` roles only. `primary-container` is true cardinal and
  is the fill for primary actions; text on it is white.
- Difficulty has its own harmonized palette: `--kh-beginner`, `--kh-intermediate`,
  `--kh-advanced`, each with `-container` and `on-` variants. Use it only to mean
  difficulty.
- Light, dark and high-contrast are all generated. Check every change in both
  themes (the moon/sun button in the top bar).

## Difficulty is always shown the same way

Signal bars (`<Bars>`) plus the level color, via `<Level level=… />`. Never
invent another difficulty indicator.

## Type

One family: Google Sans Flex. Expressive headlines use the width (`font-stretch`)
and roundness (`"ROND"`) axes; see the `.display-l` … `.label-m` classes in
`base.css`. Sentence case everywhere. No all-caps labels, no eyebrow text above
headings.

## Shape

- Scale tokens: `--md-shape-xs` … `--md-shape-2xl`, `--md-shape-full`.
- Buttons and chips are pills that square off on press (`:active`), the
  Expressive shape morph. Cards round further on hover.
- Tool monograms and path cards use the shape library in `src/lib/shapes.ts`
  (cookies, clover, sunny). We never reproduce vendor logos.

## Motion

- `--md-spring-fast` / `--md-spring` for spatial changes, `--md-effect*` for
  color and opacity. All collapse to ~0 under `prefers-reduced-motion`.
- One orchestrated moment only: the ladder cells on the home page. Don't add
  fade-in-on-scroll to sections.

## Layout

- Navigation rail at ≥ 840px, bottom navigation bar below.
- Content max width 1240px; 16px gutters on mobile, 32px on desktop.
- Every page must work at 360px wide with no horizontal page scroll.

## Components (src/components)

`Icon` (Material Symbols Rounded), `Level`/`Bars`, `ToolMark`, `Segmented`
(connected button group, radio semantics), `WavyProgress`, `VideoCard`/`VideoRow`,
`Player` (dialog with youtube-nocookie embed), `Ladder`, `Layout`.
Reuse these before writing new ones.

## Accessibility floor

Visible focus rings (`:focus-visible` gold outline), labels on every input,
`aria-pressed` on toggle chips, `role="radiogroup"` on segmented buttons,
skip link, alt text or `aria-hidden` on every image or decorative SVG.

## Check your work

`npm run build`, then screenshot the changed pages at 1440px and 400px in
light and dark. The broader design principles are in the `frontend-design` skill.
