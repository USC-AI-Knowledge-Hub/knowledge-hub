# USC AI Knowledge Hub: companion summary for another AI

Start here: section 3 says where the project lives and how to get access; section 2 is the stack; sections 4-5 are the pages. It describes what the site is, how it is built, every page and feature, how data flows, and the rules the project follows. Facts below were read from the code on 2026-10-19; counts will drift as content changes.

## 1. What the site is

- A free, no-login learning site about generative AI for USC students, faculty and researchers.
- Live at https://studentslearningai.com/ (custom domain via `public/CNAME`), served from GitHub Pages.
- Tagline on the home page: "Learn AI. Use AI. Understand what's next."
- Four jobs: teach AI (lessons, courses), help people choose and use tools (tool finder, reviews), keep them current (a daily-refreshed video library and tool discovery), and let students talk to each other (AI Team boards).
- Everything personal (progress, tutor state, offline copy, board name) stays in the visitor's browser; there are no accounts anywhere.
- Audience voice: plain, specific, sentence case, no hype. Educational, not promotional.

## 2. Stack and hosting

- Vite + React 19 + TypeScript single-page app; React Router (`createBrowserRouter`) in `src/main.tsx`.
- No UI library: hand-rolled Material 3 Expressive design system on generated tokens (`src/styles/tokens.css` from `npm run theme`). Brand seed is USC Cardinal `#990000` with USC Gold; one type family (Google Sans Flex); Material Symbols Rounded icons.
- Static hosting on GitHub Pages. `npm run build` typechecks, builds, then `scripts/prerender.ts` writes a real HTML page per route plus `sitemap.xml` and `robots.txt` (114 pages at last build).
- The only server-side piece is the AI Team board's database (Supabase), reached directly from the browser over REST.
- Automation lives in GitHub Actions (sections 3 and 9). There is no other backend.
- Tests: Vitest (~430 unit tests, including the board's SQL run in an in-memory Postgres via PGlite) and Playwright (`e2e/`, 10 spec files).
- Repository: `USC-AI-Knowledge-Hub/knowledge-hub`. Working branch for Claude sessions: `claude/zen-knuth-q2f72j`; work lands in `main` by squash-merged PR, only when the user says "merge".
## 3. GitHub: where the project lives and how to get in

### The repository
- Home: https://github.com/USC-AI-Knowledge-Hub/knowledge-hub (public; owner is the GitHub organization `USC-AI-Knowledge-Hub`, a small team of members).
- Default branch `main` is what gets deployed; no branch protection or rulesets were reported at last look, and there is no license file yet.
- Other branches: Claude sessions work on a designated branch (currently `claude/zen-knuth-q2f72j`); everything else is a short-lived feature branch.
- Language is TypeScript; the repo is small (about 1.3 MB). Merge settings allow squash, merge and rebase; the project squash-merges.
- Instruction files an agent should read first: `CLAUDE.md` (root) and `.claude/skills/` (`m3-expressive` for UI, `video-curation` for the pipeline and tool catalog, `frontend-design` for general visual work). This file is `summary_ai_companion.md` in the root.
- Pull-request history: #1 onward, recent ones #13 (offline assistant), #14 (tool discovery), #16-#17 and #22 (AI Team tiles), #18-#21 (discovery fixes and feeds), #23 (in-site boards), #24 (delete behaviour and block list).

### How changes ship
- Branch, commit (with the co-author and session trailers, section 12), push, open a PR against `main`, wait for all checks, squash-merge only when the owner says "merge".
- PR checks: `check` (unit tests, strict course check, build), `e2e` (Playwright, including the real on-device model on WASM), and on branches that touch the feed list a `vet` check.
- After a squash merge, reset the working branch to `main` and sync history with `git merge -s ours origin/<branch>` plus a normal push (force-pushes are blocked in the agent environment).
- A push to `main` triggers `daily.yml`, which builds and deploys the site; a failed build leaves the previous site live, so a stale site usually means a failed deploy run (check the Actions tab).
- The daily bot (`knowledge-hub-bot`) commits "Daily video library update YYYY-MM-DD" to `main`; `github-actions[bot]` commits "Feed check report" on branches only.

### Hosting and deploy
- GitHub Pages, deployed from Actions (`actions/upload-pages-artifact` and `actions/deploy-pages`), not from a branch.
- Custom domain `studentslearningai.com` set by `public/CNAME`; DNS is held by the owner and is not in the repo. `BASE_PATH` (a repository variable, default `/`) exists for serving from a sub-path.

### Actions secrets and variables the workflows read (names only; values are the owner's)
- Secrets: `YOUTUBE_API_KEY` (video search, API mode), `ANTHROPIC_API_KEY` (optional; language-model reading and filing).
- Variables: `BOARD_URL` and `BOARD_ANON_KEY` (AI Team database address and public key; the anon key is meant to be public), optional `BASE_PATH`.
- Set under Settings, Secrets and variables, Actions; the site only reads variables at build time, so changing one needs a new deploy (run "Daily videos and deploy").

### Workflows
- `daily.yml` "Daily videos and deploy": nightly at 07:17 UTC, on manual dispatch (input `refresh`: true refreshes videos and discovery first), and on every push to `main`.
- `ci.yml` "CI": `npm test`, `npm run courses -- --check --strict`, `npm run build`.
- `browser.yml` "Browser tests": build, model-size check against Hugging Face, `npx playwright test`.
- `feed-vet.yml` "Vet feeds": manual or on branch pushes touching the candidate feed list; writes `scripts/discovery/feed-report.md` and `.json`.
- Manual dispatch from an agent: `mcp__github__actions_run_trigger` with `workflow_id: daily.yml`, `ref: main`, `inputs: {"refresh": "true"}`; avoid refreshing twice in one day because the YouTube quota is shared.

### Other GitHub features
- Issues are enabled but no process is defined for them.
- Discussions are still switched on but unused: the site no longer links to GitHub Discussions. The giscus app may still be installed and can be uninstalled; thread #15 is an old closed test. (Organization discussions appear at https://github.com/orgs/USC-AI-Knowledge-Hub/discussions.)
- Other accounts that matter, all held by the owner and not in the repo: the Supabase project (dashboard, table editor, SQL editor), the Google Cloud project that owns the YouTube key, the DNS provider, and an Anthropic API account if the optional key is used.

### Getting the code running
- Prerequisites: Node 22 and npm. `git clone https://github.com/USC-AI-Knowledge-Hub/knowledge-hub && cd knowledge-hub && npm ci`.
- `npm run dev` for a local server; `npm test` for unit tests; `npm run build` to typecheck, build and prerender; `npm run preview` is Vite's preview of `dist/`.
- Browser tests: `npx playwright install chromium`, then `npx playwright test`; set `PW_CHROMIUM_PATH` to use an already-installed Chromium.
- Nothing is required to run the site. Optional environment variables: `VITE_BOARD_URL` and `VITE_BOARD_KEY` (point the local board at Supabase; otherwise it stores posts on the device), `YOUTUBE_API_KEY` and `ANTHROPIC_API_KEY` (pipeline and discovery), `DISCOVERY_NOW`, `DISCOVERY_OUT`, `DISCOVERY_TAXONOMY_OUT` (test overrides for discovery).
- Safe experiments: `npm run discover -- --dry-run` writes nothing; `npm run vet-feeds` only needs network access and writes the report files.

### If you are an AI agent in a Claude Code remote session
- GitHub access is scoped to this repository: use the `mcp__github__*` tools (pull requests, check runs, merging, workflow dispatch) or `gh api repos/USC-AI-Knowledge-Hub/knowledge-hub/...` through the session proxy.
- Blocked or unavailable through the proxy: GraphQL, Actions secrets and variables, the Pages settings, creating discussions, and downloading job logs. For a failed run, read `gh api .../actions/runs/<id>/jobs` for the failing step and `.../check-runs/<job id>/annotations` for the error line.
- The sandbox cannot reach most external sites (news feeds, Supabase, the live site); verify those through GitHub Actions runs or ask the owner. Chromium is preinstalled at `/opt/pw-browsers`; do not run `playwright install`.
- Watch out: pushing to `main` redeploys the site, so confirm the deploy run finished green before telling the owner a change is live.


## 4. Navigation

- **Navigation rail** (left, ≥ 840px) and **bottom bar** (below that): Home `/`, Learn `/learn`, Tools `/tools`, Watch `/watch`, AI Team `/team`, Green AI `/green`. Defined in `src/components/Layout.tsx` (`NAV`).
- **Top bar:** global search box (submits to `/search?q=`), light/dark theme toggle (`kh-theme` in localStorage), search icon on mobile.
- **Footer:** "Use offline" `/offline`, "How the video library works" `/about`, link to the main Hub site.
- **Ask the tutor** floating button (bottom right) on every page except `/offline/assistant`; keyboard shortcut Cmd/Ctrl+K opens the tutor.
- A "skip to content" link, visible focus rings and `aria-current` on the active nav item are always present.
- Unknown paths render `NotFound` ("This page doesn't exist"). `/green/team` redirects to `/team`.
- Layout mounts a `PlayerProvider` (the YouTube video dialog) and `useSeo` (sets title, description, canonical, robots and JSON-LD per route).

## 5. Routes and pages

| Route | Page file | One-line purpose |
|---|---|---|
| `/` | `Home.tsx` | Front door: hero, library stats, learning paths, today's videos, AI trends, "what are you trying to do" grid, FAQ |
| `/learn` | `Learn.tsx` | Learn hub: the four learning paths, full courses preview, the 19-module library |
| `/learn/courses` | `Courses.tsx` | All 23 full courses, grouped by source, filterable by topic, with live availability data |
| `/learn/path/:id` | `PathPage.tsx` | One guided course (student, faculty, researcher, builder): outcomes, units, lessons, capstone |
| `/learn/path/:path/:id` | `LessonPlayer.tsx` | A guided lesson inside a path |
| `/learn/lesson/:id` | `LessonPlayer.tsx` | The same lesson outside a path |
| `/learn/:id` | `ModulePage.tsx` | One module: what, why, key questions, courses, videos, talks, related tools |
| `/tools` | `Tools.tsx` | Tool finder: map or list view, category chips, search, level filter; `?tool=` opens a tool pop-up |
| `/tools/:id` | `ToolPage.tsx` | Full tool profile (reviewed) or a plain "not reviewed yet" page (discovered) |
| `/watch` | `Watch.tsx` | Video library with three tabs: lessons (`?tab` default), trends, talks and podcasts |
| `/team` | `Team.tsx` | AI Team: discussion boards; `?board=<id>&topic=<id>` opens a board |
| `/green` | `Green.tsx` | Green AI: footprint, right-size-the-model picker, habits, responsible use, pledge, sources |
| `/search` | `Search.tsx` | Site search across tools, lessons, full courses and videos |
| `/offline` | `Offline.tsx` | Opt-in "Save for offline use" and what works without internet |
| `/offline/assistant` | `Assistant.tsx` | General chat with an on-device model, no internet needed after download |
| `/about` | `About.tsx` | How the video library is built, what the levels mean, what it cannot do |

### Page details, one line each

**Home**
- Hero with primary actions, plus a "library today" panel (video counts, last refresh) from `videos.json`.
- Learning paths section links the four paths.
- "Today" section shows fresh videos; "trends" section shows what's new in AI (shown only when there are trend items).
- Task grid ("what are you trying to do") is built from the dynamic category tree and links to `/tools?view=list&task=<id>`.
- FAQ is `src/data/faq.ts` (6 entries).

**Learn**
- Leads with the learning paths, then a "full courses" band, then the module library (19 modules).
- Module completion is tracked in the browser (`kh-progress`).

**Learn modules (19)**
- what-is-genai, llms, reasoning-models, multimodal, agents, rag, limits, chat-assistants, prompting, research-verification, writing, data-analysis, coding, presentations, automation, ai-for-your-field, ai-for-teaching, assessment, ethics-integrity.
- Each module page ties together its "why", key questions, editor-picked videos, full courses, talks, and relevant tools.

**Guided paths and lessons**
- Four paths (`src/data/guided/paths.ts`): student ("Student starter"), faculty, researcher, builder; each has units, outcomes and a capstone ("Your AI study kit for one course", "Redesign one assignment and write its AI policy", "A verified literature map", "Ship a small, evaluated AI tool").
- 19 lesson files in `src/data/guided/lessons/`; a lesson has objectives, reading sections (each with an "ask the tutor" question), a worked example, practice, a question bank (checks drawn at random) and a reflection.
- `LessonPlayer` steps through a lesson with a "Study companion" side panel (the tutor grounded in that lesson).

**Courses**
- 23 real courses (`src/data/courses.ts`) from `university`, `maker` and `educator` sources, mapped to modules.
- `scripts/courses.ts` checks each against YouTube and writes `public/data/courses.json` (lesson counts, hours, availability); CI fails if a `channel` doesn't match exactly.

**Tools**
- 30 reviewed tools (`src/data/tools.ts`) with the same fields each: maker, tasks, cost, difficulty, USC access (`provided`, `check`, `personal`), pros and cons, review dates, and pipeline search/match rules.
- Map view groups tools into 7 clusters (assistants, research, study, code, create, media, automate) with "built on" and "lets you pick" links; list view is the default on phones.
- Categories are a two-level tree: 26 editor-seeded categories plus ones created automatically (section 9). A tool is filed in the most specific category that fits.
- Tool pop-up (`ToolSheet`) is a glass dialog: pixel-art card, access, lineage, full review, videos; deep link `?tool=<id>`.
- Discovered tools appear in lists and search labelled "Not reviewed yet" and make no cost, difficulty or USC claim.

**Watch**
- "Watch and learn" tab: videos filtered by tool, difficulty (beginner, intermediate, advanced) and topic.
- "AI trends" tab: what's new, by kind. "Talks and podcasts" tab: 35 curated talks, debates, keynotes and podcasts from the original publisher's channel.
- Videos open in an on-page dialog using youtube-nocookie.

**Search**
- `src/lib/siteSearch.ts` scores tools (including discovered), lessons, courses and videos; results are grouped by type.

**Green AI**
- Footprint in proportion (7 sourced figures), a picker that recommends the lightest model for 7 tasks, 8 tickable habits (the sprout graphic grows a leaf per habit), responsible-use notes, a pledge, and a sources list.
- Habits and pledge are stored in the browser; figures must match the tutor's "AI and the environment" quest.

**Offline and the offline assistant**
- "Save for offline use" registers a service worker (`scripts/offline/sw.template.js` becomes `dist/sw.js` at build) that stores the app, fonts and latest data; it is opt-in and re-registers on later visits.
- Model files are stored separately by the model libraries (Cache Storage); saving the site plus downloading a model gives a full offline copy.
- The assistant is a general chat (not tied to lessons) with models grouped into Compact, Standard and Large tiers by download size and graphics needs.

**About**
- Explains how videos are found, filtered and ranked, what beginner/intermediate/advanced mean, and what the library cannot do.

## 6. Features that cut across pages

### On-device AI tutor (`src/components/tutor/`, `src/lib/tutor/`)
- A floating panel that loads lazily; the model only downloads when the student chooses to.
- Without a model it runs in "reading mode": quests, navigation and the tool finder still work.
- Models run in the browser via a Web Worker (Transformers.js ONNX and WebLLM MLC models); the model list and sizes are in `src/lib/tutor/registry.ts` (`tutor: true` models are compact enough for the tutor picker; all appear in the offline assistant).
- Answers come from notes we wrote (lesson sections and quest steps), so a small model paraphrases accurate material.
- Quests: a three-level training path (L1 "How AI works": transformer, press-send, training, reasoning, multimodal, history; L2 "Using AI well": dojo, spot, verify, rag, agents, right-size; L3 "AI and the world": environment, bias, privacy, integrity, jobs, governance). Each step ends with a multiple-choice check graded in code; XP, streaks, badges and a daily review are kept locally; three finished quests unlock the next level.
- Tool finder: asking about a task returns tools from the live catalog (reviewed and discovered) with a "Not reviewed yet" label on discovered ones.
- "Watch next": after an answer it suggests lessons, courses, editor picks, talks and daily-library videos that match the question (library videos lead when the question names a tool).
- A mock engine (`?tutor=mock`) exists for tests.

### Dynamic tool catalog
- `src/data/catalog.ts` and `src/lib/catalogStore.ts` combine reviewed tools (`tools.ts`), discovered tools (`public/data/discovered.json`) and the category tree (`taxonomy.json`); a reviewed tool always wins on id.
- The site loads the two JSON files at start and falls back to reviewed tools only if they are missing or broken.

### Search, SEO, accessibility
- `src/lib/seo.ts` holds every page's title, description, canonical, text and JSON-LD; `seo.test.ts` fails on missing, long or repeated titles and descriptions. A new page type needs entries in `pageMeta` and `allPaths`.
- Unreviewed discovered-tool pages are `noindex` with no canonical or JSON-LD.
- Every page must work at 360px with no horizontal scroll; light, dark and high-contrast themes are generated.

### Design system (m3-expressive)
- Use `--md-sys-color-*` roles only; difficulty uses its own palette and is always shown with signal bars (`Level`/`Bars`); no all-caps labels.
- Tool logos are 8-bit pixel art (`src/data/pixelLogos.ts`), shown only to identify a tool next to its name; official shapes come from Simple Icons (CC0).
- Retro accents (square corners, hard shadow) are used for the pixel tool tiles and the AI Team tiles and board switcher only.

## 7. AI Team boards (`/team`)

- One board for each of 15 courses in three proficiency buckets, plus one general "AI tools" board (16 total); definitions in `src/data/team.ts`.
- Buckets: 1 Foundations (new to AI; 4 courses), 2 Applied AI (uses AI regularly; 6 courses), 3 Technical (builds with AI; 5 courses). Courses are Google, OpenAI, DeepLearning.AI, Anthropic, Kaggle, Hugging Face and Replit courses; each board links to its course page.
- Course boards have topics Questions, What I learned, Resources, Study tips; the tools board has Videos, Articles, New tools and features, Prompts and tips, Questions.
- Board ids are stored with every post, so do not rename one once posts exist.
- No accounts: a visitor types a name; their browser keeps a secret per-post key (and a random voter id) in localStorage, which is the only way to edit or delete their own posts.
- Features: replies one level deep, five reactions (👍 ❤️ 💡 🎉 🤔), edit, delete, report, sort (Newest, Oldest, Top), topic filter, retro "Switch board" dialog, refresh every 30 seconds, links auto-linked safely.
- Deleting: a post with no replies is removed outright; with replies it stays as a "deleted" stub until its last reply goes; deleted replies never show.
- Storage: Supabase (`supabase/schema.sql`). Tables are locked; the site reads the `board_public` view and writes only through `board_post`, `board_edit`, `board_delete`, `board_react`, `board_report` functions.
- Rules enforced in SQL (mirrored in `src/lib/board/rules.ts`): name 1-40 chars, post 1-2000, at most 2 links, names can't contain links, reply depth 1, 5 posts per 10 minutes and 40 per day per browser or per network address (a one-way IP hash is stored).
- Moderation: three different reports hide a post; a block list (`board_blocked_words`, seeded with 1,255 English words from the MIT `cuss` package via `supabase/blocked-words.sql`) is matched on whole words after look-alike characters are swapped back; editors moderate in Supabase's table editor with SQL in `supabase/README.md`.
- Config: the site reads repository variables `BOARD_URL` and `BOARD_ANON_KEY` at build time (`VITE_BOARD_URL`, `VITE_BOARD_KEY`). With neither set, the board falls back to device-local storage and shows a note saying posts aren't shared.
- Code: `src/pages/Team.tsx`, `src/components/board/` (Board, PostItem, Composer, Linked), `src/lib/board/` (rules, identity, store with `localStore` and `supabaseStore`).
- GitHub Discussions and giscus are no longer used anywhere in the site.

## 8. Data files and where content lives

- `src/data/tools.ts`: reviewed tool profiles and the pipeline's match rules.
- `src/data/learn.ts`: 19 modules and the four learning paths; `src/data/topics.ts`: 19 video topics.
- `src/data/guided/`: path definitions, 19 lessons, types.
- `src/data/courses.ts` (23), `src/data/talks.ts` (35), `src/data/faq.ts` (6), `src/data/green.ts` (Green AI content, sources).
- `src/data/categories.ts`: 26 seed categories; `src/data/toolMap.ts`: clusters and links; `src/data/team.ts`: boards, buckets, topics.
- `public/data/videos.json` (daily library, committed by the Action), `courses.json` (live course check), `discovered.json` and `taxonomy.json` (daily tool discovery).
- Content rules: only claim USC access (`usc: "provided"`) when confirmed, otherwise `"check"`; curated videos, courses and talks must be ones an editor has watched and come from the original publisher's channel; update `lastReviewed`/`nextReview` when a tool is re-tested.

## 9. Daily automation

### Video pipeline (`scripts/pipeline/`, `npm run videos`)
- Finds YouTube videos for each tool and topic; API mode when a YouTube key is present (search costs 100 quota units; max 90 searches a day, rotating through queries), RSS from 14 trusted channels otherwise.
- Filters for quality and length, classifies difficulty, tags by tool and topic, ranks for teaching value, and keeps at most 15 per tool-and-difficulty cell, up to 120 days, newer than 60 days.
- Re-tags the whole existing library each run, so newly discovered tools pick up older videos.
- Discovered tools get one search each, at most 12 a day.
- Optional Claude classification when the `ANTHROPIC_API_KEY` secret is set. Load the `video-curation` skill before changing any of this.

### Tool discovery (`scripts/discovery/`, `npm run discover`)
- Reads 31 RSS/Atom feeds weighted by tier (vendor 3, press 2, community 1); a product is listed once its mentions score at least 3 across distinct sources, otherwise it waits up to 21 days as "pending".
- Finds names in titles by patterns (or with Claude when `ANTHROPIC_API_KEY` is set), checks the product's own site over public https only, and files it into the category tree.
- New categories need at least 3 unfiled tools sharing a phrase, at most 1 new per run, 30 automatic in total; a category with fewer than 2 tools for 90 days retires; blocked names live in `scripts/discovery/overrides.json`.
- Tools expire after 150 days without mentions (and fewer than 3 videos); editor-seeded tools never do; cap 150 tools.
- A failing feed is retried; after 7 failures in a row it is tried weekly; a 410 Gone goes straight to weekly; one whole-run failure changes nothing and never blocks the deploy.
- `npm run vet-feeds` (and the "Vet feeds" workflow) tests candidate and current feeds and writes `scripts/discovery/feed-report.md`; `candidates.ts` records why rejected feeds were rejected.

### Workflows (`.github/workflows/`)
- `daily.yml` "Daily videos and deploy": 07:17 UTC schedule, manual dispatch (`refresh` input) and every push to `main`; order is test, decide refresh, discover tools, refresh videos, check courses, commit data, build, deploy to Pages. The commit step rebases before pushing; it passes the board variables to the build.
- `ci.yml`: unit tests, strict course check against YouTube, build. `browser.yml`: build, check model sizes against Hugging Face, run Playwright including a real on-device model on WASM.
- `feed-vet.yml`: manual or on branches when the candidate list changes; commits its report on branches only (never on `main`).

## 10. Commands

- `npm run dev` / `build` / `test`; `npm run videos`; `npm run discover [-- --dry-run]`; `npm run vet-feeds`; `npm run courses [-- --check --strict]`.
- `npm run theme` (tokens), `npm run brand-images` (og and favicon), `npm run block-words` (rebuild `supabase/blocked-words.sql`), `npm run model-sizes`.

## 11. External setup and current state

- Domain `studentslearningai.com` is live on GitHub Pages.
- Supabase project for the board: created by the owner; `schema.sql` and `blocked-words.sql` have been run; repository variables `BOARD_URL` and `BOARD_ANON_KEY` are set and the board works for the owner.
- Actions secrets: `YOUTUBE_API_KEY` and `ANTHROPIC_API_KEY` are both read by the daily workflow. `ANTHROPIC_API_KEY` is optional and, as far as known, not set, so discovery and classification use the pattern matcher only; setting it would improve name reading and filing.
- Not confirmed: Google Search Console verification, offline mode on real iPhone/Safari, the Qwen3.5 thinking switch and Gemma 3 system prompt on real GPUs, and editor review of AI-drafted lessons and Green AI figures.
- Discovery feed state at last check: 29 of 31 reachable; VentureBeat returns 429 (rate limited) and Show HN occasionally 502; both only warn.
- AI Team moderators: everyone with Supabase access; no admin screen exists.

## 12. Working agreements for contributors (human or AI)

- Copy is sentence case, plain and specific; no hype, no all-caps labels, no eyebrow text above headings.
- Load the `m3-expressive` skill before any UI change and the `video-curation` skill before touching the pipeline or tool catalog.
- Never merge a PR without the user's explicit "merge"; squash-merge with the expected head sha; reset the working branch to `main` afterwards (history sync uses `git merge -s ours`, then a normal push).
- Commit trailers: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and the `Claude-Session:` URL; PR bodies end with the generated-with line and session URL.
- Do not push to any branch other than the session's designated one; do not create PRs unless asked.
- Unreviewed tools: no USC, cost or difficulty claims; label "Not reviewed yet".
- Verify before claiming: this environment cannot reach most external sites, so feeds, Supabase and GitHub-hosted behaviour are checked via Actions or the user, and the Material Symbols icon font does not load in screenshots (icon names show as words).

## 13. Quick glossary

- **Module:** a Learn topic page; **lesson:** a guided teaching unit wrapped around a module; **path:** a sequence of units and lessons for one audience.
- **Bucket:** a proficiency level (Foundations, Applied AI, Technical) used by the AI Team boards.
- **Reviewed tool:** hand-written profile in `tools.ts`; **discovered tool:** found by the daily run, unreviewed.
- **Cluster:** a group on the tool map; **category:** a task-based group in the filing tree (two levels).
- **Board:** one AI Team discussion space; **topic:** a filter inside a board; **post/reply:** a message; **stub:** the "deleted" placeholder kept when a deleted post has replies.
- **Reading mode:** the tutor without a downloaded model.
