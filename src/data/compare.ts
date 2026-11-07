/**
 * Side-by-side comparisons of reviewed tools. Everything comes from each tool's review, so a
 * comparison can't say anything the reviews don't, and goes stale only when a review does.
 */
import { toolById } from "./tools";
import { DIFFICULTIES, DIFFICULTY_LABEL, type Cost, type Tool, type UscAccess } from "./types";

/** Pairs that get their own page and a place in the sitemap: the matchups people actually search for. */
export const PAIRS: readonly (readonly [string, string])[] = [
  ["chatgpt", "claude"],
  ["chatgpt", "gemini"],
  ["chatgpt", "copilot"],
  ["chatgpt", "perplexity"],
  ["claude", "gemini"],
  ["claude", "perplexity"],
  ["gemini", "copilot"],
  ["gemini", "notebooklm"],
  ["perplexity", "notebooklm"],
  ["notebooklm", "chatgpt"],
  ["github-copilot", "cursor"],
  ["cursor", "claude-code"],
  ["midjourney", "adobe-firefly"],
  ["canva", "gamma"],
  ["elicit", "consensus"],
  ["elicit", "scispace"],
  ["grammarly", "quillbot"],
  ["zapier", "n8n"],
  ["otter", "descript"],
  ["runway", "midjourney"],
];

export const pairSlug = (a: string, b: string) => `${a}-vs-${b}`;

/** The tool ids for a slug like "chatgpt-vs-claude", in either order, only for tools that exist. */
export function parsePair(slug: string): [string, string] | null {
  for (const [a, b] of PAIRS) {
    if (slug === pairSlug(a, b)) return [a, b];
    if (slug === pairSlug(b, a)) return [b, a];
  }
  return null;
}

/** The pairs a tool is in, for "compare with" links. */
export const pairsFor = (id: string) => PAIRS.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));

export const USC_LABEL: Record<UscAccess, string> = { provided: "USC provides it", check: "Check whether USC provides it", personal: "Use a personal account" };
export const COST_TEXT: Record<Cost, string> = { free: "Free", freemium: "Free tier, paid upgrades", paid: "Paid" };

const names = (tools: Tool[]) => tools.map((t) => t.name);
const sentence = (parts: string[]) => parts.join(". ") + ".";

/** What differs at a glance, in plain sentences built from the reviews. Empty strings are dropped. */
export function differences(tools: Tool[]): string[] {
  if (tools.length < 2) return [];
  const out: string[] = [];
  const costs = new Set(tools.map((t) => t.cost));
  out.push(costs.size === 1 ? `Cost: ${names(tools).join(" and ")} are both ${COST_TEXT[tools[0].cost].toLowerCase()}.` : `Cost: ${tools.map((t) => `${t.name} is ${COST_TEXT[t.cost].toLowerCase()}`).join("; ")}.`);
  const ranks = tools.map((t) => DIFFICULTIES.indexOf(t.difficulty));
  if (new Set(ranks).size === 1) out.push(`Getting started: both are rated ${DIFFICULTY_LABEL[tools[0].difficulty].toLowerCase()} on day one.`);
  else {
    const easiest = tools[ranks.indexOf(Math.min(...ranks))];
    out.push(`Getting started: ${easiest.name} is the easier one to get value from on day one (${DIFFICULTY_LABEL[easiest.difficulty].toLowerCase()}); ${tools.filter((t) => t !== easiest).map((t) => `${t.name} is ${DIFFICULTY_LABEL[t.difficulty].toLowerCase()}`).join("; ")}.`);
  }
  const uscs = new Set(tools.map((t) => t.usc));
  out.push(uscs.size === 1 ? `USC access: for both, ${USC_LABEL[tools[0].usc].toLowerCase()}.` : `USC access: ${tools.map((t) => `${t.name}: ${USC_LABEL[t.usc].toLowerCase()}`).join("; ")}.`);
  return out;
}

/** A page's worth of plain text for search engines: what each tool is best for, then the differences. */
export function summary(tools: Tool[]): string {
  return sentence(tools.map((t) => `${t.name}: ${t.bestFor.replace(/\.$/, "")}`));
}

export const toolsFor = (ids: string[]) => ids.map((id) => toolById.get(id)).filter((t): t is Tool => !!t);

/** The written rows of a comparison, as plain text for the prerendered page. */
export function textRows(tools: Tool[]): { label: string; items: string[] }[] {
  return [
    { label: "Best for", items: tools.map((t) => `${t.name}: ${t.bestFor}`) },
    { label: "What makes each one different", items: tools.map((t) => `${t.name}: ${t.different}`) },
    { label: "Strengths", items: tools.flatMap((t) => t.strengths.map((s) => `${t.name}: ${s}`)) },
    { label: "Limits", items: tools.flatMap((t) => t.weaknesses.map((s) => `${t.name}: ${s}`)) },
    { label: "Privacy", items: tools.map((t) => `${t.name}: ${t.privacy}`) },
    { label: "Academic integrity", items: tools.map((t) => `${t.name}: ${t.integrity}`) },
  ];
}
