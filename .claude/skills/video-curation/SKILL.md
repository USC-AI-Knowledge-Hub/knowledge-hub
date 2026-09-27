---
name: video-curation
description: How the daily YouTube pipeline finds, filters, labels and ranks videos, and how to add tools, topics or trusted channels. Load before changing scripts/pipeline, src/data/tools.ts, src/data/topics.ts or the daily workflow.
---

# Daily video curation

`scripts/pipeline/index.ts` rebuilds `public/data/videos.json` once a day
(`.github/workflows/daily.yml`, 12:17 UTC) and the site reads that file at runtime.

## Flow

1. **Collect.** RSS feeds of `TRUSTED_CHANNELS` (free, no key). With
   `YOUTUBE_API_KEY`, also search every `tool.queries` entry plus
   `TOPIC_QUERIES`, then fetch details (duration, likes, language) for all IDs.
2. **Filter** (`quality.ts#rejectReason`): shorts, live, too short/long,
   non-English, clickbait, entertainment (`ENTERTAINMENT`). News, launches,
   research and talks (`trendKind`) go to the separate `trends` feed (`mergeTrends`:
   14-day intake, 21-day retention, 4 per channel, 48 total), never the lessons;
   older than 60 days, too few views (trusted channels are exempt). Without
   Claude, the title must also read as a lesson (`looksEducational`), because
   official channels post far more announcements than tutorials.
3. **Tag** (`tagging.ts`): tools by `tool.match`/`tool.exclude` regexes (title
   counts double), topics by `topics.ts`. Company names (OpenAI, Anthropic) are
   deliberately not tool matches. Videos with no tool are kept only if they
   mention AI, teach a lesson topic and look like a lesson.
4. **Label.** `difficulty.ts` keyword model by default. With `ANTHROPIC_API_KEY`,
   `classify-claude.ts` sends new videos in batches of 20 and gets back
   difficulty, tools, topics, a one-line summary and an `educational` flag
   (structured output). Any Claude failure falls back to the keyword model.
5. **Rank** (`quality.ts#qualityScore`): reach, momentum, like ratio,
   freshness, trusted channel and lesson-like title, minus hype.
6. **Re-check** the existing library against today's rules, so a tightened
   filter also retires earlier picks (Claude-labeled entries keep their labels).
7. **Merge** (`merge.ts`): known videos keep `firstSeen` and Claude labels;
   entries age out after 120 days; each tool × difficulty cell keeps its best 15.

## Quota

search.list is 100 units; the default daily quota is 10,000. Today:
47 tool queries + 7 topic queries = 5,400 units, plus a few units for
videos.list and about 100 for the course check (`npm run courses`).
`SETTINGS.maxSearches` (90) caps searches per run; above it, `rotation.ts`
cycles through the queries day by day. Give a new tool one query, not three.

## Common changes

- **Add a tool:** add an entry to `src/data/tools.ts` with `queries`, `match`
  and (if the name is ambiguous) `exclude`. Add a tagging test in
  `scripts/pipeline/__tests__/pipeline.test.ts` for any ambiguous name.
- **Add a trusted channel:** add its @handle to `TRUSTED_CHANNELS`. IDs are
  resolved on the next run and cached in `channels.lock.json`.
- **Add a full course:** add it to `src/data/courses.ts` with its playlist (or
  video) ID, the exact channel name and the modules it covers, then run
  `npm run courses -- --check` (needs YouTube access, so CI runs it on every PR).
- **Add a lesson topic:** add to `src/data/topics.ts` and set `topic` on the module.
- **Tune difficulty:** edit `SIGNALS` in `difficulty.ts` and add a test case.

## Testing without YouTube

`npm test` covers parsing, tagging, difficulty, scoring, merging and a full
offline run. To preview the site with data:

```
PIPELINE_OUT=/tmp/videos.json npm run videos -- --fixture scripts/pipeline/fixtures/candidates.json
```

Never commit fixture output to `public/data/videos.json`; its video IDs are fake.
