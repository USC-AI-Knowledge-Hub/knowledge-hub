import type { Video } from "../../src/data/types";
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
