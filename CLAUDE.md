# USC AI Knowledge Hub

Vite + React 19 + TypeScript single-page app, deployed to GitHub Pages.
A daily GitHub Action refreshes the YouTube video library.

## Commands

- `npm run dev`: local dev server
- `npm run build`: typecheck and production build (`dist/`)
- `npm test`: Vitest (pipeline unit tests plus an offline end-to-end run)
- `npm run videos`: run the video pipeline (see the video-curation skill)
- `npm run courses`: check every course and editors' pick against YouTube (`--check --strict` in CI)
- `npm run theme`: regenerate `src/styles/tokens.css` from the brand colors

## Layout

- `src/data/`: all content. `tools.ts` (tool reviews and pipeline match rules),
  `learn.ts` (modules and learning paths), `courses.ts` (full courses mapped to modules),
  `topics.ts`, `types.ts`.
- `src/pages/`, `src/components/`, `src/lib/`: the app.
- `src/styles/`: `tokens.css` (generated), `base.css` (system and components), `pages.css`.
- `scripts/pipeline/`: the daily video pipeline.
- `public/data/videos.json`: pipeline output, committed by the Action.
- `public/data/courses.json`: live course check (lesson counts, hours, availability).

## Skills

- `m3-expressive`: design system rules. Load before any UI change.
- `frontend-design` (Anthropic): general visual design guidance.
- `video-curation`: the pipeline. Load before changing it or the tool catalog.

## Content rules

- Every tool profile uses the same fields. Update `lastReviewed`/`nextReview` when re-tested.
- Only claim USC access (`usc: "provided"`) when it's confirmed. Otherwise use `"check"`.
- Curated videos in `learn.ts` and courses in `courses.ts` must be ones an editor has watched.
- Courses must be real courses (a planned sequence, or one long structured video) from the
  original publisher's channel. `channel` must match YouTube exactly; CI fails otherwise.
- Copy is sentence case, plain and specific. No hype.
