import type { DiscoveredTool, Evidence } from "../../src/data/types";
import { slugify } from "./build-tool";
import { firstSentences } from "./build-tool";
import { ACCEPT_SCORE, LIMITS, WEIGHT } from "./sources";
import type { DiscoveredFile, Mention, Overrides, PendingTool } from "./types";

/**
 * What the run remembers between days: products that have been mentioned but not yet often enough to
 * list, the tools that are listed, and the rules that retire them. Everything is plain data, so a day's
 * update is one pure function and the whole lifecycle can be tested without a network.
 */

export const daysBetween = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);

/** How much evidence a product has: each source counts once, at its tier's weight. */
export function scoreOf(p: Pick<PendingTool, "mentions">): number {
  const best = new Map<string, number>();
  for (const m of p.mentions) best.set(m.sourceId, Math.max(best.get(m.sourceId) ?? 0, WEIGHT[m.tier]));
  return [...best.values()].reduce((a, b) => a + b, 0);
}

const addEvidence = (list: Evidence[], e: Evidence) => {
  if (list.some((x) => x.url === e.url)) return;
  list.unshift(e);
  list.sort((a, b) => b.date.localeCompare(a.date));
  list.length = Math.min(list.length, 6);
};

export interface UpdateOptions {
  today: string;
  /** Videos in the library per tool id. */
  videoCounts: Map<string, number>;
  /** Ids of reviewed tools, which discovery never touches. */
  reviewedIds: Set<string>;
  overrides: Overrides;
}

export interface UpdateResult {
  file: DiscoveredFile;
  /** Products with enough evidence to list, best first. */
  ready: PendingTool[];
  dropped: { tools: string[]; pending: number };
}

export function applyMentions(file: DiscoveredFile, mentions: Mention[], o: UpdateOptions): UpdateResult {
  const tools: DiscoveredTool[] = file.tools.map((t) => ({ ...t, evidence: t.evidence.map((e) => ({ ...e })) }));
  const byId = new Map(tools.map((t) => [t.id, t]));
  const pending = new Map<string, PendingTool>(file.pending.map((p) => [p.key, { ...p, mentions: [...p.mentions], links: [...p.links] }]));
  const blockedIds = new Set(o.overrides.blockIds);
  const blockedNames = new Set(o.overrides.blockNames.map((n) => n.toLowerCase()));

  for (const m of mentions) {
    const id = slugify(m.key);
    if (!id || blockedIds.has(id) || blockedNames.has(m.name.toLowerCase()) || o.reviewedIds.has(id)) continue;
    const ev: Evidence = { source: m.source.name, title: m.item.title, url: m.item.link, date: m.item.date || o.today };
    const listed = byId.get(id);
    if (listed) {
      addEvidence(listed.evidence, ev);
      if (ev.date > listed.lastSeen) listed.lastSeen = ev.date > o.today ? o.today : ev.date;
      continue;
    }
    const p: PendingTool = pending.get(m.key) ?? { key: m.key, name: m.name, kind: m.kind, firstSeen: ev.date, lastSeen: ev.date, mentions: [], summary: "", links: [] };
    if (!p.mentions.some((x) => x.url === ev.url)) p.mentions.push({ ...ev, sourceId: m.source.id, tier: m.source.tier });
    if (ev.date > p.lastSeen) p.lastSeen = ev.date;
    if (ev.date < p.firstSeen) p.firstSeen = ev.date;
    // A vendor's own words about its product are the best description; otherwise keep the first.
    if (!p.summary || (m.source.tier === "vendor" && m.item.summary)) p.summary = firstSentences(m.item.summary, 300) || p.summary;
    if (m.source.tier === "vendor" && m.source.maker && !p.maker) p.maker = m.source.maker;
    for (const l of m.item.links) if (!p.links.includes(l) && p.links.length < 12) p.links.push(l);
    pending.set(m.key, p);
  }

  // A tool with videos in the library is plainly still in use, however quiet the feeds are.
  const gone: string[] = [];
  const kept = tools.filter((t) => {
    const videos = o.videoCounts.get(t.id) ?? 0;
    if (videos > 0 && t.lastSeen < o.today) t.lastSeen = o.today;
    const stale = daysBetween(t.lastSeen, o.today) > LIMITS.expireDays && videos < LIMITS.keepWithVideos;
    if (t.origin === "feed" && stale) {
      gone.push(t.id);
      return false;
    }
    return true;
  });
  // Over the cap, the quietest feed-found tools go first. Editors' tools stay.
  const rank = (t: DiscoveredTool) => (t.origin === "editor" ? Infinity : (o.videoCounts.get(t.id) ?? 0) * 1000 + Date.parse(t.lastSeen) / 86_400_000);
  kept.sort((a, b) => rank(b) - rank(a));
  while (kept.length > LIMITS.maxTools) gone.push(kept.pop()!.id);
  kept.sort((a, b) => a.firstSeen.localeCompare(b.firstSeen) || a.id.localeCompare(b.id));

  const fresh = [...pending.values()].filter((p) => daysBetween(p.lastSeen, o.today) <= LIMITS.pendingDays);
  fresh.sort((a, b) => scoreOf(b) - scoreOf(a) || b.lastSeen.localeCompare(a.lastSeen) || a.key.localeCompare(b.key));
  const live = fresh.slice(0, LIMITS.maxPending);
  const ready = live.filter((p) => scoreOf(p) >= ACCEPT_SCORE).slice(0, LIMITS.maxNewPerRun);

  const retired = [...file.retired, ...gone.map((id) => ({ id, on: o.today }))].filter((r) => daysBetween(r.on, o.today) <= 90);
  return {
    file: { ...file, tools: kept, pending: live, retired },
    ready,
    dropped: { tools: gone, pending: pending.size - live.length },
  };
}

/** Lists a product: adds the tool and removes it from the waiting list. */
export function promote(file: DiscoveredFile, tool: DiscoveredTool, key: string): DiscoveredFile {
  return { ...file, tools: [...file.tools.filter((t) => t.id !== tool.id), tool], pending: file.pending.filter((p) => p.key !== key) };
}
