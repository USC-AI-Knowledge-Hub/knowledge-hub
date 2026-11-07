/**
 * What changed on the site lately, from the tool data: tools the daily run spotted, and reviews that were
 * updated. Used by the What's new page and by the Atom feed the build writes, so they always agree.
 * Pure data, no browser: the build runs it in Node.
 */
import type { DiscoveredTool, Tool } from "../data/types";

export interface NewItem {
  id: string;
  kind: "spotted" | "reviewed";
  title: string;
  summary: string;
  /** The site path of the tool's page. */
  path: string;
  /** YYYY-MM-DD. */
  date: string;
  /** Reviews always count; a spotted tool counts once two different sources have written about it. */
  confirmed: boolean;
  /** How many different sources wrote about a spotted tool. */
  sources: number;
}

const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
export const clean = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^(?:hey|hi|hello)\s+r\/\w+\s*[-–—:,!.]*\s*/i, "")
    .replace(/\s*(?:\|\s*)?(?:discussion|comments?|link)(?:\s*\|\s*(?:discussion|comments?|link))*\s*$/i, "")
    .trim();
const oneLine = (s: string, n = 220) => {
  const t = clean(s);
  return t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : t;
};

/**
 * Newest first. Spotted tools are the ones discovery listed within `windowDays`; reviewed ones are tools whose
 * review date falls in the same window. `today` is passed in so tests and the build agree on what "lately" means.
 */
export function newItems(spotted: (Pick<DiscoveredTool, "id" | "name" | "maker" | "bestFor" | "firstSeen"> & { origin?: string; evidence?: { source: string }[] })[], reviewed: Pick<Tool, "id" | "name" | "bestFor" | "lastReviewed">[], today: string, windowDays = 90, limit = 40): NewItem[] {
  const out: NewItem[] = [];
  for (const t of spotted) {
    // Tools the editors added by hand weren't "spotted" by anything.
    if (t.origin === "editor") continue;
    if (!t.firstSeen || days(t.firstSeen, today) > windowDays || days(t.firstSeen, today) < 0) continue;
    out.push({ id: `spotted-${t.id}`, kind: "spotted", title: `${t.name}: new, not reviewed yet`, summary: oneLine(t.bestFor), path: `/tools/${t.id}`, date: t.firstSeen, sources: new Set((t.evidence ?? []).map((e) => e.source)).size, confirmed: new Set((t.evidence ?? []).map((e) => e.source)).size >= 2 });
  }
  for (const t of reviewed) {
    if (!t.lastReviewed || days(t.lastReviewed, today) > windowDays || days(t.lastReviewed, today) < 0) continue;
    out.push({ id: `reviewed-${t.id}-${t.lastReviewed}`, kind: "reviewed", title: `${t.name}: review updated`, summary: oneLine(t.bestFor), path: `/tools/${t.id}`, date: t.lastReviewed, sources: 0, confirmed: true });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title)).slice(0, limit);
}
