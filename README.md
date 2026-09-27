# USC AI Knowledge Hub

**Learn AI. Use AI. Understand what's next.**

A learning site for USC students and faculty, built around three things:

- **Learn**: 19 short lessons in two tracks (AI 101 and AI skills), grouped into four
  learning paths (Student starter, Faculty, Research, Builder). Every lesson
  answers *what is it*, *why does it matter to me* and *show me how*, and ends with a
  hands-on exercise. Progress is saved in the browser.
- **Full courses**: 23 complete YouTube courses and playlists (Harvard CS50, MIT,
  Stanford, Berkeley, Anthropic, OpenAI, Microsoft, Google, 3Blue1Brown,
  Karpathy, fast.ai, Crash Course and more), each mapped to the lessons it goes
  deeper on. `npm run courses` checks every one against YouTube, in CI and daily.
- **Tools**: a tool finder that starts from "What are you trying to do?", and a
  standard review for each of 30 tools, including research tools like SciSpace, Consensus, Scite and ResearchRabbit: best and poor uses, a 5-minute quick
  start, strengths, weaknesses, privacy, academic integrity, USC access and
  review dates.
- **Watch**: a YouTube library refreshed **every day**, sorted by **tool** and
  **difficulty** (Beginner / Intermediate / Advanced), filtered for teaching value
  and ranked against hype.

The UI is a hand-built **Material 3 Expressive** system: color roles generated
from USC Cardinal and Gold with Google's `material-color-utilities`, Google Sans
Flex, Material Symbols, Expressive shapes and spring motion, and light, dark and
high-contrast themes.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pipeline tests, including an offline end-to-end run
npm run build
```

The library is empty until the first daily run. To preview the site with sample
data (fake IDs, so thumbnails won't load):

```bash
PIPELINE_OUT=public/data/videos.json npm run videos -- --fixture scripts/pipeline/fixtures/candidates.json
git checkout public/data/videos.json   # don't commit sample data
```

## Daily video automation

`.github/workflows/daily.yml` runs every day at 12:17 UTC. It refreshes
`public/data/videos.json`, commits it, builds the site and deploys it to GitHub
Pages.

| Secret (Settings → Secrets → Actions) | Effect |
| --- | --- |
| *(none)* | **RSS mode.** Latest uploads from about 14 trusted channels. Free, no quota. |
| `YOUTUBE_API_KEY` | **API mode.** Searches YouTube for every tool and lesson topic (≈3,700 of the default 10,000 daily quota units), and adds durations, like counts and language. |
| `ANTHROPIC_API_KEY` | Claude labels each new video's difficulty, tools and topics, writes a one-line "what you'll learn" summary and drops non-educational videos. Falls back to the keyword model if it fails. |

Every video goes through the same steps: collect, filter (shorts, live,
non-English, clickbait, low reach), tag (tools, topics), label (difficulty),
rank (reach, momentum, likes, freshness, trusted source, minus hype), then merge
(each tool × level keeps its best 15; entries expire after 120 days). The site
explains all of this to readers at `/about`.

### Setup checklist

1. Settings → Pages → Source: **GitHub Actions**.
2. Add `YOUTUBE_API_KEY` (Google Cloud Console → enable *YouTube Data API v3* → create an API key).
3. Optionally add `ANTHROPIC_API_KEY`. `CLAUDE_MODEL` can be set as a repository variable to override the default model.
4. Actions → *Daily videos and deploy* → **Run workflow** to populate the library right away.
5. With a custom domain, set the `BASE_PATH` repository variable to `/`.

## Editing content

All content is typed data in `src/data/`:

- `tools.ts`: tool reviews, plus the search queries and match patterns the pipeline uses.
- `learn.ts`: lessons, editors' pick videos and learning paths.
- `topics.ts`: lesson topics the pipeline tags videos with.

Student Fellows can add or update a tool or lesson with a pull request. CI runs
the tests and the build on every PR.

## Claude Code skills in this repo

`.claude/skills/` gives future Claude Code sessions the context to extend the site:

- `frontend-design`: Anthropic's official design skill, imported from
  [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) (Apache-2.0).
- `m3-expressive`: this site's Material 3 Expressive rules and components.
- `video-curation`: how the pipeline works and how to add tools, topics and channels.
