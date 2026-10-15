# USC AI Knowledge Hub

Vite + React 19 + TypeScript single-page app, deployed to GitHub Pages.
A daily GitHub Action refreshes the YouTube video library.

## Commands

- `npm run dev`: local dev server
- `npm run build`: typecheck and production build (`dist/`)
- `npm test`: Vitest (pipeline unit tests plus an offline end-to-end run)
- `npm run videos`: run the video pipeline (see the video-curation skill)
- `npm run discover`: find new tools from the trusted feeds and file them in the category tree (`-- --dry-run` to preview)
- `npm run courses`: check every course, editors' pick and talk against YouTube (`--check --strict` in CI)
- `npm run theme`: regenerate `src/styles/tokens.css` from the brand colors
- `npm run brand-images`: redraw `public/og.png` (the share preview) and `public/favicon.png`

## Layout

- `src/data/`: all content. `tools.ts` (tool reviews and pipeline match rules),
  `learn.ts` (modules and learning paths), `courses.ts` (full courses mapped to modules),
  `talks.ts` (talks, debates, keynotes and podcasts), `guided/` (guided lessons and course paths),
  `topics.ts`, `types.ts`.
- `src/pages/`, `src/components/`, `src/lib/`: the app.
- `src/styles/`: `tokens.css` (generated), `base.css` (system and components), `pages.css`.
- `src/lib/seo.ts`: every page's title, description, canonical address, text and structured data,
  built from the data files. `npm run build` ends with `scripts/prerender.ts`, which writes a real
  HTML page per route plus `sitemap.xml` and `robots.txt`. A new page type needs an entry in
  `pageMeta` and `allPaths`; `src/lib/__tests__/seo.test.ts` fails if a title or description is
  missing, too long or repeated.
- Offline mode: `/offline` (`src/pages/Offline.tsx`, `src/lib/offline.ts`) lets a visitor save the app
  to their browser. It is opt-in: `scripts/offline/sw.template.js` becomes `dist/sw.js` at build time
  (`scripts/service-worker.ts`) and only registers after "Save for offline use". Model files are
  kept by the model libraries in Cache Storage, not by the worker. Change the worker's code and the
  `e2e/offline.spec.ts` tests (they really go offline) must still pass.
- Models: `src/lib/tutor/registry.ts`. `tutor: true` models appear in the lesson tutor's picker (keep
  them compact); every model appears in the offline assistant (`/offline/assistant`), a general-purpose
  chat that isn't grounded in lessons. A WebLLM model needs `vramMb` and an id that exists in the installed
  WebLLM's list: `models.test.ts` checks both, and `npm run model-sizes` (browser CI) checks download sizes.
- AI Team (`/team`, `src/pages/Team.tsx`, `src/data/team.ts`): a tile per tool that opens its GitHub Discussions board (no embed).
  The category must be open-ended; its slug is `BOARD.categorySlug`.
- `scripts/pipeline/`: the daily video pipeline.
- `scripts/discovery/`: the daily tool discovery run (`npm run discover`). It writes `public/data/discovered.json`
  and `taxonomy.json`; `src/data/catalog.ts` and `src/lib/catalogStore.ts` combine them with `tools.ts` for the site
  and the pipeline. Discovered tools are always labelled "Not reviewed yet".
- `public/data/videos.json`: pipeline output, committed by the Action.
- `public/data/courses.json`: live course check (lesson counts, hours, availability).

## Skills

- `m3-expressive`: design system rules. Load before any UI change.
- `frontend-design` (Anthropic): general visual design guidance.
- `video-curation`: the pipeline. Load before changing it or the tool catalog.

## Content rules

- Every tool profile uses the same fields. Update `lastReviewed`/`nextReview` when re-tested.
- Tool logos are 8-bit pixel renditions (`src/data/pixelLogos.ts`), shown only to identify a tool
  next to its name. Official shapes come from Simple Icons (CC0); no other logo sources. Remove a
  logo if its owner asks.
- Only claim USC access (`usc: "provided"`) when it's confirmed. Otherwise use `"check"`.
- Curated videos in `learn.ts` and courses in `courses.ts` must be ones an editor has watched.
- Courses must be real courses (a planned sequence, or one long structured video) from the
  original publisher's channel. `channel` must match YouTube exactly; CI fails otherwise.
- Copy is sentence case, plain and specific. No hype.
