import type { DiscoveredTool } from "../../src/data/types";

/** Short everyday words a product might be named: matching them alone would tag unrelated videos. */
const COMMON = new Set(
  `flow genie muse spark canvas studio pilot assistant agent lens atlas bard beam bolt brain buddy chat clip cloud code copy core craft create dash data deep desk dream drive edge echo face fast fire flash focus forge form fuse gem glow grid guide helper hub idea jet kit labs lab lake launch light link loop magic mind mirror model moon nova orbit page paper pixel pulse quick rapid reel scribe sense shift sky smart sound space sprint star stream swift sync tab task team think tide tone touch track vision voice wave wing wise work write zen zero note notes slide slides story sketch draft maker mate loom bloom quill`.split(" "),
);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const slugify = (key: string) => key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/** Two letters for the tool's tile, like the reviewed tools': "Higgsfield" → "Hi". */
export function monogram(name: string): string {
  const s = name.replace(/[^A-Za-z0-9]/g, "");
  return (s.slice(0, 1).toUpperCase() + s.slice(1, 2).toLowerCase()).slice(0, 2) || "??";
}

/**
 * Patterns that tag a video with the tool. Every name is matched as whole words, ignoring spaces and
 * hyphens ("Meshy", "Higgs field"). A short or everyday word needs context so it doesn't tag unrelated
 * videos: "Flow" alone is not Google Flow, but "Flow AI" or "Google Flow" is.
 */
export function buildMatch(name: string, maker = ""): string[] {
  const tokens = name.split(/\s+/).map(escapeRe);
  const body = tokens.join("[\\s-]*");
  const single = tokens.length === 1;
  const risky = single && (name.length <= 4 || COMMON.has(name.toLowerCase()));
  if (!risky) return [`\\b${body}\\b`];
  const patterns = [`\\b${body}\\s+(?:ai|app|video|model|studio|tutorial)\\b`];
  const m = maker.trim().split(/\s+/)[0];
  if (m && m.length >= 3) patterns.push(`\\b${escapeRe(m)}\\s+${body}\\b`);
  return patterns;
}

/** The one YouTube search a tool gets (the pipeline's rule: one query per tool, not three). */
export const queryFor = (name: string, kind: "tool" | "model") => {
  const named = /\bai\b/i.test(name) ? name : `${name} AI`;
  return kind === "model" ? `${named} model how to use` : `${named} tutorial`;
};

/** A post's own first sentence about the product, trimmed. Marketing copy, so it's kept short. */
export function firstSentences(text: string, max = 200): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "));
  return end > max * 0.4 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "") + "…";
}

export type ToolDraft = Pick<DiscoveredTool, "id" | "name" | "maker" | "url" | "urlKind" | "kind" | "bestFor" | "tasks" | "evidence" | "firstSeen" | "lastSeen"> & { origin?: DiscoveredTool["origin"] };

export function toDiscoveredTool(d: ToolDraft): DiscoveredTool {
  return {
    id: d.id,
    name: d.name,
    maker: d.maker,
    url: d.url,
    monogram: monogram(d.name),
    bestFor: d.bestFor,
    tasks: d.tasks,
    queries: [queryFor(d.name, d.kind)],
    match: buildMatch(d.name, d.maker),
    exclude: [],
    kind: d.kind,
    urlKind: d.urlKind,
    origin: d.origin ?? "feed",
    firstSeen: d.firstSeen,
    lastSeen: d.lastSeen,
    evidence: d.evidence,
  };
}
