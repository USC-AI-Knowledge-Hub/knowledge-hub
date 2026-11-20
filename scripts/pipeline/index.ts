/**
 * Daily video pipeline for the USC AI Knowledge Hub.
 *
 *   npm run videos                 # API mode if YOUTUBE_API_KEY is set, else RSS mode
 *   npm run videos -- --dry-run    # print the result, don't write
 *   npm run videos -- --fixture scripts/pipeline/fixtures/candidates.json
 *
 * Env:
 *   YOUTUBE_API_KEY    YouTube Data API v3 key. Enables search across all tools.
 *   ANTHROPIC_API_KEY  Optional. Claude labels difficulty, tools and a summary.
 *   CLAUDE_MODEL       Optional model override for the classifier.
 *   PIPELINE_OUT       Optional output path (tests use this).
 *   PIPELINE_NOW       Optional ISO timestamp to pin "now" (tests use this).
 *
 * Writes public/data/videos.json. Exits non-zero, leaving the file untouched,
 * if every source failed.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { modules } from "../../src/data/learn";
import type { AutoTalk, TalkKind, Trend, Video, VideoFeed } from "../../src/data/types";
import { classifyWithClaude, type ClaudeLabel } from "./classify-claude";
import { loadPipelineTools } from "./catalog";
import { sparseTools } from "./coverage";
import { CONTENT_SINCE, SETTINGS, TALK_CHANNELS, TALK_SETTINGS, TOPIC_QUERIES, TREND_QUERIES, TRUSTED_CHANNELS } from "./config";
import { guessDifficulty } from "./difficulty";
import { mergeFeed, mergeTalks, mergeTrends } from "./merge";
import { ageDays, badComments, looksEducational, mentionsAI, qualityScore, rejectReason, talkRejectReason, tooOld, trendKind, type Candidate } from "./quality";
import { scoreComments } from "./sentiment";
import { fetchChannelFeed, resolveHandle } from "./rss";
import { todaysQueries } from "./rotation";
import { tagTools, tagTopics, useTools } from "./tagging";
import { existingIds, searchVideoIds, topComments, videoDetails } from "./youtube-api";

const FEED_PATH = process.env.PIPELINE_OUT ?? new URL("../../public/data/videos.json", import.meta.url);
const LOCK_PATH = new URL("./channels.lock.json", import.meta.url);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fixtureIdx = args.indexOf("--fixture");
const fixture = fixtureIdx >= 0 ? args[fixtureIdx + 1] : undefined;
const now = process.env.PIPELINE_NOW ? new Date(process.env.PIPELINE_NOW) : new Date();
const runDate = now.toISOString().slice(0, 10);
const ytKey = process.env.YOUTUBE_API_KEY;
const useClaude = Boolean(process.env.ANTHROPIC_API_KEY);
const errors: string[] = [];
const log = (...m: unknown[]) => console.log(...m);

function loadFeed(): VideoFeed {
  if (!existsSync(FEED_PATH)) {
    return { generatedAt: null, runDate: null, mode: "none", classifier: "heuristic", stats: { candidates: 0, kept: 0, added: 0 }, videos: [] };
  }
  return JSON.parse(readFileSync(FEED_PATH, "utf8"));
}

async function trustedChannelIds(): Promise<Map<string, string>> {
  const lock: Record<string, string> = existsSync(LOCK_PATH) ? JSON.parse(readFileSync(LOCK_PATH, "utf8")) : {};
  let changed = false;
  for (const { handle } of [...TRUSTED_CHANNELS, ...TALK_CHANNELS]) {
    if (lock[handle] || fixture) continue;
    try {
      const id = await resolveHandle(handle);
      if (id) {
        lock[handle] = id;
        changed = true;
      } else errors.push(`Could not resolve @${handle}`);
    } catch (e) {
      errors.push(`Resolving @${handle}: ${(e as Error).message}`);
    }
  }
  if (changed && !dryRun) writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + "\n");
  return new Map(Object.entries(lock));
}

async function collect(trusted: Set<string>, sparse: Set<string>, catalog: ReturnType<typeof loadPipelineTools>): Promise<{ candidates: Candidate[]; sourcesOk: number }> {
  if (fixture) {
    const list: Candidate[] = JSON.parse(readFileSync(fixture, "utf8"));
    return { candidates: list.map((c) => ({ ...c, trusted: c.trusted ?? trusted.has(c.channelId) })), sourcesOk: 1 };
  }

  let sourcesOk = 0;
  const rssCandidates: Candidate[] = [];
  for (const channelId of trusted) {
    try {
      rssCandidates.push(...(await fetchChannelFeed(channelId)));
      sourcesOk++;
    } catch (e) {
      errors.push((e as Error).message);
    }
  }

  if (!ytKey) return { candidates: rssCandidates, sourcesOk };

  // Never search before the Hub's cutoff, however long the window.
  const since = new Date(`${CONTENT_SINCE}T00:00:00Z`);
  const daysAgo = (n: number) => new Date(Math.max(now.getTime() - n * 86_400_000, since.getTime()));
  const ids = new Set(rssCandidates.map((c) => c.id));
  const evergreenQueries = new Set(catalog.all.filter((t) => sparse.has(t.id)).flatMap((t) => t.queries));
  if (evergreenQueries.size) log(`Evergreen search for ${[...sparse].join(", ")}.`);
  const found = catalog.discovered.flatMap((t) => t.queries.slice(0, 1));
  const foundToday = todaysQueries(found, now, SETTINGS.maxDiscoveredSearches);
  const reviewedIds = new Set(catalog.all.filter((t) => !catalog.discovered.includes(t)).map((t) => t.id));
  const queries = [
    ...todaysQueries([...catalog.all.filter((t) => reviewedIds.has(t.id)).flatMap((t) => t.queries), ...TOPIC_QUERIES, ...TREND_QUERIES], now, SETTINGS.maxSearches - foundToday.length),
    ...foundToday,
  ];
  for (const q of queries) {
    const after = daysAgo(evergreenQueries.has(q) ? SETTINGS.evergreenWindowDays : SETTINGS.searchWindowDays);
    try {
      for (const id of await searchVideoIds(q, after, SETTINGS.resultsPerQuery, ytKey)) ids.add(id);
      sourcesOk++;
    } catch (e) {
      const message = (e as Error).message;
      // Out of quota for the day: every other search would fail the same way.
      if (/quota ?exceeded/i.test(message)) {
        errors.push(`YouTube search quota used up after ${sourcesOk} sources; skipped the remaining searches. The quota resets at midnight Pacific time.`);
        break;
      }
      errors.push(`Search "${q}": ${message}`);
    }
  }
  // Re-fetch details for everything so RSS items get durations and like counts.
  try {
    return { candidates: await videoDetails([...ids], ytKey, trusted), sourcesOk };
  } catch (e) {
    errors.push(`videos.list: ${(e as Error).message}`);
    return { candidates: rssCandidates, sourcesOk };
  }
}

/** Reads up to `limit` new candidates' top comments and records how they lean (1 quota unit each). */
async function readComments(list: Candidate[], limit: number): Promise<number> {
  if (!ytKey || fixture) return 0;
  let read = 0;
  for (const c of list) {
    if (read >= limit) break;
    if (c.comments !== undefined) continue;
    try {
      const s = scoreComments(await topComments(c.id, ytKey, SETTINGS.commentsPerVideo));
      c.sentiment = s.score;
      c.comments = s.n;
      read++;
    } catch (e) {
      errors.push(`Reading comments: ${(e as Error).message}`);
      break;
    }
  }
  return read;
}

/**
 * Talks and podcasts from TALK_CHANNELS: their feeds (free), plus a few channel searches a day in API mode,
 * then details and comments, kept only when long, about AI, recent and well received.
 */
async function collectTalks(channels: Map<string, string>, knownTalks: Map<string, AutoTalk>): Promise<{ talks: AutoTalk[]; rejected: Record<string, number> }> {
  const rejected: Record<string, number> = {};
  if (fixture) return { talks: [], rejected };
  const kindOf = new Map<string, TalkKind>();
  const ids: string[] = [];
  for (const { handle, kind } of TALK_CHANNELS) {
    const id = channels.get(handle);
    if (id) {
      kindOf.set(id, kind);
      ids.push(id);
    }
  }
  const found = new Map<string, Candidate>();
  for (const channelId of ids) {
    try {
      for (const c of await fetchChannelFeed(channelId)) found.set(c.id, { ...c, channelId });
    } catch (e) {
      errors.push(`Talk feed ${channelId}: ${(e as Error).message}`);
    }
  }
  let candidates = [...found.values()];
  if (ytKey) {
    const searchIds = new Set<string>(found.keys());
    for (const channelId of todaysQueries(ids, now, TALK_SETTINGS.talkSearchesPerDay)) {
      try {
        for (const id of await searchVideoIds("AI", new Date(`${CONTENT_SINCE}T00:00:00Z`), TALK_SETTINGS.resultsPerSearch, ytKey, channelId)) searchIds.add(id);
      } catch (e) {
        const message = (e as Error).message;
        errors.push(`Talk search: ${message}`);
        if (/quota ?exceeded/i.test(message)) break;
      }
    }
    // Known talks too, so their views and likes stay current.
    for (const id of knownTalks.keys()) searchIds.add(id);
    try {
      candidates = await videoDetails([...searchIds], ytKey, new Set());
    } catch (e) {
      errors.push(`Talk details: ${(e as Error).message}`);
    }
  }
  const talks: AutoTalk[] = [];
  const reject = (why: string) => (rejected[why] = (rejected[why] ?? 0) + 1);
  // Read comments only for talks that pass everything else, so quota goes where it decides something.
  const passing = candidates.filter((c) => kindOf.has(c.channelId) || knownTalks.has(c.id)).filter((c) => {
    const known = knownTalks.get(c.id);
    if (known?.comments !== undefined) Object.assign(c, { sentiment: known.sentiment, comments: known.comments });
    const why = talkRejectReason(c, now);
    if (why) reject(why);
    return !why;
  });
  await readComments(passing, SETTINGS.maxCommentChecks);
  for (const c of passing) {
    if (badComments(c)) {
      reject("negative comments");
      continue;
    }
    const kind = kindOf.get(c.channelId) ?? knownTalks.get(c.id)?.kind ?? "talk";
    talks.push({
      id: c.id,
      title: c.title,
      channel: c.channel,
      channelId: c.channelId,
      publishedAt: c.publishedAt,
      duration: c.duration,
      views: c.views,
      likes: c.likes,
      kind,
      score: qualityScore(c, now),
      sentiment: c.sentiment,
      comments: c.comments,
      firstSeen: knownTalks.get(c.id)?.firstSeen ?? runDate,
    });
  }
  return { talks, rejected };
}

async function main() {
  const feed = loadFeed();
  const known = new Map(feed.videos.map((v) => [v.id, v]));
  const knownTrends = new Map((feed.trends ?? []).map((t) => [t.id, t]));
  const channels = await trustedChannelIds();
  // Talk channels share the lock file but aren't lesson sources.
  const trusted = new Set(TRUSTED_CHANNELS.map((c) => channels.get(c.handle)).filter((id): id is string => Boolean(id)));
  const catalog = loadPipelineTools();
  useTools(catalog.all);
  if (catalog.discovered.length) log(`${catalog.discovered.length} discovered tools are tagged and searched alongside the reviewed ones.`);
  const sparse = sparseTools(feed.videos, catalog.all);
  const { candidates, sourcesOk } = await collect(trusted, sparse, catalog);

  if (sourcesOk === 0) {
    console.error("Every source failed; leaving the feed untouched.\n" + errors.join("\n"));
    process.exit(1);
  }

  // 1. Filter and tag.
  const rejected: Record<string, number> = {};
  const passing: (Candidate & { heuristicTools: string[]; topics: string[]; evergreen: boolean })[] = [];
  const trendCandidates: Trend[] = [];
  const seen = new Set<string>();
  const reject = (why: string) => (rejected[why] = (rejected[why] ?? 0) + 1);
  /** News, launches, research and talks about AI go to the trends feed instead of the library. */
  const toTrend = (c: Candidate, kind: Trend["kind"]) => {
    const tools = tagTools(c.title, c.description);
    if (!tools.length && !mentionsAI(c.title)) return reject("off-topic");
    if (ageDays(c.publishedAt, now) > SETTINGS.trendMaxAgeDays) return reject("old news");
    trendCandidates.push({
      id: c.id,
      title: c.title,
      channel: c.channel,
      channelId: c.channelId,
      publishedAt: c.publishedAt,
      duration: c.duration,
      views: c.views,
      likes: c.likes,
      kind,
      tools,
      score: qualityScore(c, now),
      firstSeen: knownTrends.get(c.id)?.firstSeen ?? runDate,
    });
  };
  for (const c of candidates) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    const evergreen = tagTools(c.title, c.description).some((t) => sparse.has(t));
    const reason = rejectReason(c, now, { evergreen });
    if (reason) {
      rejected[reason] = (rejected[reason] ?? 0) + 1;
      continue;
    }
    const kind = trendKind(c.title);
    if (kind) {
      toTrend(c, kind);
      continue;
    }
    // Without Claude to judge, only titles that read as lessons get in. Official and
    // trusted channels' other AI videos are usually updates, so they become trends.
    if (!useClaude && !looksEducational(c.title)) {
      if (c.trusted) toTrend(c, "news");
      else reject("not a lesson");
      continue;
    }
    const heuristicTools = tagTools(c.title, c.description);
    const topics = tagTopics(c.title, c.description);
    // No tool named: keep it only if it's about AI, teaches a lesson topic and reads as a lesson.
    if (!heuristicTools.length && !(topics.length && looksEducational(c.title) && mentionsAI(c.title))) {
      rejected["off-topic"] = (rejected["off-topic"] ?? 0) + 1;
      continue;
    }
    passing.push({ ...c, heuristicTools, topics, evergreen });
  }

  // 1b. What viewers say: carry known sentiment over, read comments for new videos, drop the badly received.
  for (const c of passing) {
    const prev = known.get(c.id);
    if (prev?.comments !== undefined) Object.assign(c, { sentiment: prev.sentiment, comments: prev.comments });
  }
  const commentsRead = await readComments(passing, SETTINGS.maxCommentChecks);
  for (let i = passing.length - 1; i >= 0; i--) {
    if (badComments(passing[i])) {
      reject("negative comments");
      passing.splice(i, 1);
    }
  }

  // 2. Label new videos with Claude when available.
  const labels = new Map<string, ClaudeLabel>();
  const fresh = passing.filter((c) => known.get(c.id)?.difficultySource !== "claude");
  if (useClaude && fresh.length) {
    for (let i = 0; i < fresh.length; i += SETTINGS.claudeBatch) {
      const batch = fresh.slice(i, i + SETTINGS.claudeBatch);
      try {
        for (const [id, label] of await classifyWithClaude(batch, catalog.all)) labels.set(id, label);
      } catch (e) {
        errors.push(`Claude batch ${i / SETTINGS.claudeBatch + 1}: ${(e as Error).message}`);
      }
    }
  }

  // 3. Build feed entries.
  const incoming: Video[] = [];
  for (const c of passing) {
    const label = labels.get(c.id);
    if (label && !label.educational) {
      if (c.trusted) toTrend(c, "news");
      else reject("not educational (Claude)");
      continue;
    }
    const toolsFor = label ? label.tools : c.heuristicTools;
    const topicsFor = label ? label.topics : c.topics;
    if (!toolsFor.length && !topicsFor.length) continue;
    const guess = guessDifficulty({ title: c.title, description: c.description, duration: c.duration, tools: toolsFor });
    incoming.push({
      id: c.id,
      title: c.title,
      channel: c.channel,
      channelId: c.channelId,
      publishedAt: c.publishedAt,
      duration: c.duration,
      views: c.views,
      likes: c.likes,
      tools: toolsFor,
      topics: topicsFor,
      difficulty: label?.difficulty ?? guess.difficulty,
      difficultySource: label ? "claude" : "heuristic",
      summary: label?.summary,
      score: qualityScore(c, now),
      firstSeen: known.get(c.id)?.firstSeen ?? runDate,
      ...(c.comments !== undefined ? { sentiment: c.sentiment, comments: c.comments } : {}),
      ...(c.evergreen || known.get(c.id)?.evergreen ? { evergreen: true } : {}),
    });
  }

  // 4. In API mode, refresh stats on videos already in the feed and drop removed ones.
  let existing = feed.videos;
  if (ytKey && !fixture && existing.length) {
    try {
      const refreshed = await videoDetails(existing.map((v) => v.id), ytKey, trusted);
      const live = new Map(refreshed.map((r) => [r.id, r]));
      existing = existing
        .filter((v) => live.has(v.id))
        .map((v) => {
          const r = live.get(v.id)!;
          return { ...v, views: r.views, likes: r.likes, duration: r.duration || v.duration, score: qualityScore({ ...r, sentiment: v.sentiment, comments: v.comments }, now) };
        });
    } catch (e) {
      errors.push(`Refreshing stats: ${(e as Error).message}`);
    }
  }

  // Re-check what's already in the library against today's rules, so tightening
  // a filter or a match pattern also cleans up earlier picks.
  const before = existing.length;
  existing = existing.flatMap((v) => {
    const asCandidate: Candidate = { ...v, description: "", trusted: true };
    if (rejectReason(asCandidate, now, { evergreen: v.evergreen })) return [];
    if (trendKind(v.title)) return [];
    if (v.difficultySource === "claude") return [v];
    if (!looksEducational(v.title)) return [];
    const tools = tagTools(v.title);
    const topics = tagTopics(v.title);
    return tools.length || (topics.length && mentionsAI(v.title)) ? [{ ...v, tools, topics }] : [];
  });
  const retired = before - existing.length;

  const videos = mergeFeed(existing, incoming, runDate);
  // Trends already in the feed are re-checked against today's rules too.
  // A lesson-style title only stays a trend when it's explicit news.
  const existingTrends = (feed.trends ?? []).filter(
    (t) => !rejectReason({ ...t, description: "", trusted: true }, now) && (!looksEducational(t.title) || trendKind(t.title) === "news"),
  );
  const trends = mergeTrends(existingTrends, trendCandidates, runDate);
  const knownTalks = new Map((feed.talks ?? []).filter((t) => !tooOld(t.publishedAt)).map((t) => [t.id, t]));
  const { talks: talkCandidates, rejected: talkRejected } = await collectTalks(channels, knownTalks);
  // A talk that didn't come back today (feed rotated, search skipped) stays as it was.
  const talks = mergeTalks([...knownTalks.values()], talkCandidates);
  const added = videos.filter((v) => v.firstSeen === runDate && !known.has(v.id)).length;

  const next: VideoFeed = {
    generatedAt: now.toISOString(),
    runDate,
    mode: fixture ? feed.mode : ytKey ? "api" : "rss",
    classifier: labels.size ? "claude" : "heuristic",
    stats: { candidates: seen.size, kept: videos.length, added, trends: trends.length, talks: talks.length },
    videos,
    trends,
    talks,
  };

  // 5. Curated videos: warn if any have disappeared (API mode only).
  const warnings: string[] = [];
  if (ytKey && !fixture) {
    const curated = modules.flatMap((m) => m.curated.map((c) => ({ ...c, module: m.id })));
    try {
      const alive = await existingIds(curated.map((c) => c.id), ytKey);
      for (const c of curated) if (!alive.has(c.id)) warnings.push(`Curated video ${c.id} (“${c.title}”, module ${c.module}) is unavailable.`);
    } catch (e) {
      errors.push(`Checking curated videos: ${(e as Error).message}`);
    }
  }

  const summary = [
    `## Daily videos — ${runDate}`,
    `Mode: **${next.mode}** · Classifier: **${next.classifier}**`,
    `Candidates: ${seen.size} · Passed filters: ${passing.length} · New today: **${added}** · Retired by current rules: ${retired} · In feed: ${videos.length} · Trends: ${trends.length} (${trendCandidates.length} today)`,
    "",
    "Rejected: " + (Object.entries(rejected).map(([k, n]) => `${k} ${n}`).join(", ") || "none"),
    `Comments read: ${commentsRead} · Talks and podcasts: ${talks.length} (${talkCandidates.length} passed today; rejected: ${Object.entries(talkRejected).map(([k, n]) => `${k} ${n}`).join(", ") || "none"})`,
    ...(warnings.length ? ["", "### Curated", ...warnings.map((w) => `- ${w}`)] : []),
    ...(errors.length ? ["", "### Errors", ...errors.map((e) => `- ${e}`)] : []),
  ].join("\n");
  log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");

  if (!dryRun) writeFileSync(FEED_PATH, JSON.stringify(next, null, 1) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
