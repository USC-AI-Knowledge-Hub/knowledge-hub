import type { Trend, Video } from "../../src/data/types";
import { SETTINGS } from "./config";

const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

/**
 * Folds today's videos into the existing feed.
 * - Known videos keep their firstSeen date and any Claude labels; stats refresh.
 * - Videos first seen more than `retentionDays` ago age out.
 * - Each tool × difficulty cell keeps its best `perCell` videos, so one busy
 *   tool can't crowd out the rest. Topic-only videos share one smaller pool.
 */
export function mergeFeed(existing: Video[], incoming: Video[], runDate: string): Video[] {
  const byId = new Map(existing.map((v) => [v.id, v]));
  for (const v of incoming) {
    const prev = byId.get(v.id);
    if (!prev) {
      byId.set(v.id, v);
      continue;
    }
    const keepLabels = prev.difficultySource === "claude" && v.difficultySource !== "claude";
    byId.set(v.id, {
      ...prev,
      title: v.title,
      views: v.views,
      likes: v.likes ?? prev.likes,
      duration: v.duration || prev.duration,
      score: v.score,
      ...(keepLabels
        ? {}
        : { difficulty: v.difficulty, difficultySource: v.difficultySource, tools: v.tools, topics: v.topics, summary: v.summary ?? prev.summary }),
    });
  }

  const alive = [...byId.values()].filter((v) => daysBetween(v.firstSeen, runDate) <= SETTINGS.retentionDays);

  const cells = new Map<string, Video[]>();
  for (const v of alive) {
    const key = v.tools[0] ? `${v.tools[0]}:${v.difficulty}` : "_topic";
    const list = cells.get(key) ?? [];
    list.push(v);
    cells.set(key, list);
  }

  const kept: Video[] = [];
  for (const [key, list] of cells) {
    const cap = key === "_topic" ? SETTINGS.topicOnlyCap : SETTINGS.perCell;
    list.sort((a, b) => b.score - a.score);
    kept.push(...list.slice(0, cap));
  }
  return kept.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/**
 * Folds today's trends into the existing ones. Trends are about now: they age
 * out by publish date, each channel gets a few slots, and the best-scoring
 * rest fill the feed, newest first.
 */
export function mergeTrends(existing: Trend[], incoming: Trend[], runDate: string): Trend[] {
  const byId = new Map(existing.map((t) => [t.id, t]));
  for (const t of incoming) {
    const prev = byId.get(t.id);
    byId.set(t.id, prev ? { ...prev, title: t.title, views: t.views, likes: t.likes ?? prev.likes, score: t.score, kind: t.kind, tools: t.tools } : t);
  }
  const alive = [...byId.values()].filter((t) => daysBetween(t.publishedAt, `${runDate}T23:59:59Z`) <= SETTINGS.trendRetentionDays);
  const perChannel = new Map<string, number>();
  const kept: Trend[] = [];
  for (const t of alive.sort((a, b) => b.score - a.score)) {
    const n = perChannel.get(t.channelId) ?? 0;
    if (n >= SETTINGS.trendPerChannel) continue;
    perChannel.set(t.channelId, n + 1);
    kept.push(t);
    if (kept.length >= SETTINGS.trendCap) break;
  }
  return kept.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
