/**
 * Tests feeds the way discovery will use them, so adding one is a decision with evidence behind it.
 * `npm run vet-feeds` checks the candidates and the current sources and writes a report.
 */
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { CANDIDATES } from "./candidates";
import { aiRelated, namesInTitle } from "./extract";
import { parseFeed } from "./feed";
import { SOURCES } from "./sources";
import type { Source } from "./types";

export interface Vet {
  id: string;
  name: string;
  tier: string;
  url: string;
  reachable: boolean;
  error?: string;
  /** Posts in the feed, and how many are from the last 30 days. */
  posts: number;
  recent: number;
  newest: string;
  /** Of the recent posts, the share about AI (for a feed that isn't all AI). */
  aiShare: number;
  /** Product names the title matcher finds in the recent posts. */
  names: string[];
  sample: string[];
  verdict: "add" | "maybe" | "skip";
  reason: string;
}

const DAY = 86_400_000;

/** Reads one feed and says whether it earns a place in SOURCES. */
export async function vet(source: Source, fetchText: (url: string) => Promise<string>, now: Date): Promise<Vet> {
  const base = { id: source.id, name: source.name, tier: source.tier, url: source.url, posts: 0, recent: 0, newest: "", aiShare: 0, names: [] as string[], sample: [] as string[] };
  let xml: string;
  try {
    xml = await fetchText(source.url);
  } catch (e) {
    return { ...base, reachable: false, error: (e as Error).message.slice(0, 80), verdict: "skip", reason: `Could not be read (${(e as Error).message.slice(0, 40)}).` };
  }
  let items;
  try {
    items = parseFeed(xml);
  } catch {
    return { ...base, reachable: false, error: "not a feed", verdict: "skip", reason: "The address answers but isn't an RSS or Atom feed." };
  }
  const dated = items.filter((i) => i.date);
  const recent = items.filter((i) => i.date && now.getTime() - new Date(i.date).getTime() <= 30 * DAY);
  const ai = recent.filter((i) => source.aiOnly || aiRelated(`${i.title} ${i.summary}`));
  const names = [...new Set(ai.flatMap((i) => namesInTitle(i.title, source)))];
  const out: Vet = {
    ...base,
    reachable: true,
    posts: items.length,
    recent: recent.length,
    newest: dated.map((i) => i.date).sort().at(-1) ?? "",
    aiShare: recent.length ? Math.round((ai.length / recent.length) * 100) / 100 : 0,
    names: names.slice(0, 8),
    sample: items.slice(0, 3).map((i) => i.title.slice(0, 90)),
    verdict: "skip",
    reason: "",
  };
  if (!items.length) return { ...out, reason: "The feed is empty." };
  if (recent.length < 3) return { ...out, reason: `Only ${recent.length} post${recent.length === 1 ? "" : "s"} in 30 days: too quiet to matter.` };
  if (out.aiShare < 0.3) return { ...out, reason: `Only ${Math.round(out.aiShare * 100)}% of recent posts are about AI.` };
  if (!names.length) return { ...out, verdict: "maybe", reason: "Recent and on topic, but no product names were found in its titles." };
  if (names.length < 2 && recent.length < 8) return { ...out, verdict: "maybe", reason: `Works, but yields little: ${names.length} name in ${recent.length} recent posts.` };
  return { ...out, verdict: "add", reason: `${names.length} product names in ${recent.length} recent posts; ${Math.round(out.aiShare * 100)}% on topic.` };
}

const UA = { "user-agent": "Mozilla/5.0 (compatible; USC-AI-Knowledge-Hub/1.0; +https://sites.usc.edu/ai-knowledge-hub/)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" };
const live = async (url: string) => {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
};

export function report(current: Vet[], candidates: Vet[], now: Date): string {
  const row = (v: Vet) => `| ${v.name} | ${v.tier} | ${v.reachable ? `${v.recent}/${v.posts}` : "-"} | ${v.reachable ? `${Math.round(v.aiShare * 100)}%` : "-"} | ${v.names.slice(0, 4).join(", ") || "-"} | ${v.verdict}: ${v.reason} |`;
  const head = "| Feed | Tier | Recent / all posts | On topic | Names found | Verdict |\n|---|---|---|---|---|---|";
  return [
    `# Feed check, ${now.toISOString().slice(0, 10)}`,
    "",
    "## Candidates",
    "",
    head,
    ...candidates.sort((a, b) => ["add", "maybe", "skip"].indexOf(a.verdict) - ["add", "maybe", "skip"].indexOf(b.verdict)).map(row),
    "",
    "## Current sources",
    "",
    head,
    ...current.map(row),
    "",
  ].join("\n");
}

async function main() {
  const now = new Date();
  const run = (list: Source[]) => Promise.all(list.map((s) => vet(s, live, now)));
  const [current, candidates] = await Promise.all([run(SOURCES), run(CANDIDATES)]);
  const md = report(current, candidates, now);
  console.log(md);
  writeFileSync(new URL("./feed-report.md", import.meta.url), md);
  writeFileSync(new URL("./feed-report.json", import.meta.url), JSON.stringify({ at: now.toISOString(), current, candidates }, null, 2) + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, md, { flag: "a" });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) void main();
