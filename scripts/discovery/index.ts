/**
 * Daily discovery of new AI tools and models.
 *
 *   npm run discover                 # read the feeds, update the catalog files
 *   npm run discover -- --dry-run    # print what would change, write nothing
 *
 * Reads the trusted feeds in sources.ts, finds products named in announcements, lists the ones with
 * enough evidence, files each under the category tree (growing it when several tools fit nowhere), and
 * writes public/data/discovered.json and public/data/taxonomy.json. The site reads both at run time and
 * the video pipeline searches YouTube for what is listed. See the video-curation skill.
 *
 * Env:
 *   ANTHROPIC_API_KEY  Optional. A language model reads announcements the patterns can't, files tools
 *                      more carefully and reviews new categories. Without it everything still works.
 *   DISCOVERY_NOW      Optional ISO timestamp to pin "now" (tests use this).
 *
 * Never fails the daily deploy: a feed that is down is reported and retried, and nothing here throws
 * for bad data. A crash leaves the files untouched.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { Category } from "../../src/data/categories";
import { buildCatalog, sanitizeCategories, sanitizeDiscovered } from "../../src/data/catalog";
import { tools as reviewedTools } from "../../src/data/tools";
import type { DiscoveredTool, Evidence, VideoFeed } from "../../src/data/types";
import { classify } from "../../src/lib/taxonomy";
import { slugify, firstSentences, toDiscoveredTool } from "./build-tool";
import type { Claude } from "./claude";
import { aiRelated, extractMentions } from "./extract";
import { parseFeed } from "./feed";
import { autoOf, growTaxonomy, retireCategories, toTaxonomyFile, type PoolTool } from "./grow";
import { seedTools } from "./seeds";
import { fetchPage, pickSiteUrl, type PageInfo } from "./site";
import { LIMITS, SOURCES } from "./sources";
import { applyMentions, daysBetween, promote } from "./store";
import { EMPTY_DISCOVERED, EMPTY_TAXONOMY, type DiscoveredFile, type FeedItem, type Mention, type Overrides, type PendingTool, type Source, type SourceHealth, type TaxonomyFile } from "./types";

const DATA = new URL("../../public/data/", import.meta.url);
const PATHS = {
  discovered: process.env.DISCOVERY_OUT ?? new URL("discovered.json", DATA),
  taxonomy: process.env.DISCOVERY_TAXONOMY_OUT ?? new URL("taxonomy.json", DATA),
  videos: new URL("videos.json", DATA),
  overrides: new URL("./overrides.json", import.meta.url),
};

export interface Deps {
  now: Date;
  sources: Source[];
  fetchText(url: string): Promise<string>;
  page(url: string): Promise<PageInfo | null>;
  claude?: Claude;
  log(...m: unknown[]): void;
}

export interface Inputs {
  discovered: DiscoveredFile;
  taxonomy: TaxonomyFile;
  overrides: Overrides;
  videos: Pick<VideoFeed, "videos"> | null;
}

export interface Summary {
  discovered: DiscoveredFile;
  taxonomy: TaxonomyFile;
  added: string[];
  removed: string[];
  newCategory?: string;
  learned?: string;
  retiredCategories: string[];
  feeds: { ok: number; failed: number; total: number };
  warnings: string[];
}

const DAY = 86_400_000;
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** A feed that has failed for a week is tried only once a week, so a dead address costs almost nothing. */
export function shouldTry(h: SourceHealth | undefined, id: string, now: Date): boolean {
  if (!h || h.failures < LIMITS.feedBackoff) return true;
  return (Math.floor(now.getTime() / DAY) + hash(id)) % 7 === 0;
}

const within = (date: string, today: string, days: number) => !date || daysBetween(date, today) <= days;

async function readFeeds(deps: Deps, prior: SourceHealth[], today: string) {
  const health = new Map(prior.map((h) => [h.id, h]));
  const mentions: Mention[] = [];
  const posts: { source: Source; item: FeedItem }[] = [];
  const next: SourceHealth[] = [];
  const warnings: string[] = [];
  let ok = 0;
  let failed = 0;
  for (const s of deps.sources) {
    const before = health.get(s.id);
    if (!shouldTry(before, s.id, deps.now)) {
      next.push({ ...before!, url: s.url });
      failed++;
      continue;
    }
    try {
      let xml: string;
      try {
        xml = await deps.fetchText(s.url);
      } catch {
        xml = await deps.fetchText(s.url);
      }
      const items = parseFeed(xml)
        .filter((i) => within(i.date, today, 30))
        .slice(0, 40);
      if (!items.length) throw new Error("the feed had no recent posts");
      for (const item of items) posts.push({ source: s, item });
      next.push({ id: s.id, url: s.url, ok: true, lastOk: today, failures: 0, items: items.length });
      ok++;
    } catch (e) {
      failed++;
      const failures = (before?.failures ?? 0) + 1;
      next.push({ id: s.id, url: s.url, ok: false, lastOk: before?.lastOk ?? null, failures, items: 0, error: (e as Error).message.slice(0, 120) });
      if (failures === LIMITS.feedBackoff) warnings.push(`${s.name} has failed ${failures} days in a row; it will be tried weekly until it works.`);
    }
  }
  return { posts, next, ok, failed, warnings, mentions };
}

/** Run the whole discovery pass over in-memory inputs. No file or network access of its own. */
export async function discover(deps: Deps, input: Inputs): Promise<Summary> {
  const today = deps.now.toISOString().slice(0, 10);
  const warnings: string[] = [];
  const reviewedIds = new Set(reviewedTools.map((t) => t.id));

  // Where things stand: seeds first (so the user's named tools exist from the first run), then feeds.
  let file: DiscoveredFile = { ...input.discovered, tools: [...input.discovered.tools] };
  for (const seed of seedTools(today)) if (!file.tools.some((t) => t.id === seed.id) && !reviewedIds.has(seed.id) && !input.overrides.blockIds.includes(seed.id)) file.tools.push(seed);
  let categories: Category[] = buildCatalog(reviewedTools, [], input.taxonomy.categories).categories;
  const blocked = new Set(input.overrides.blockCategories);

  const videoCounts = new Map<string, number>();
  for (const v of input.videos?.videos ?? []) for (const t of v.tools) videoCounts.set(t, (videoCounts.get(t) ?? 0) + 1);

  // Which names mean a tool the catalog already has, so a new version of one isn't listed as a new tool.
  const matchers = reviewedTools.flatMap((t) => [t.name, ...t.match].map((p) => (p === t.name ? new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") : new RegExp(p, "i"))));
  const alias = new Map(Object.entries(input.overrides.alias).map(([k, v]) => [k.toLowerCase(), v]));
  const isKnown = (name: string) => alias.has(name.toLowerCase()) || matchers.some((r) => r.test(name));

  // 1. Read the feeds.
  const feeds = await readFeeds(deps, file.sources, today);
  warnings.push(...feeds.warnings);
  const mentions: Mention[] = [];
  for (const s of deps.sources) {
    const items = feeds.posts.filter((p) => p.source.id === s.id).map((p) => p.item);
    mentions.push(...extractMentions(items, s, isKnown));
  }

  // 2. Optional: a language model reads the posts the patterns didn't find anything in.
  if (deps.claude && feeds.posts.length) {
    try {
      const covered = new Set(mentions.map((m) => m.item.link));
      const todo = feeds.posts.filter((p) => !covered.has(p.item.link) && (p.source.aiOnly || aiRelated(`${p.item.title} ${p.item.summary}`))).slice(0, 80);
      for (let i = 0; i < todo.length; i += 20) {
        const batch = todo.slice(i, i + 20);
        const found = await deps.claude.extract(
          batch.map((b) => ({ source: b.source.name, title: b.item.title, summary: b.item.summary })),
          reviewedTools.map((t) => t.name),
        );
        for (const f of found) {
          const post = batch[f.index];
          if (!post || isKnown(f.name)) continue;
          mentions.push({ name: f.name, key: f.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), kind: f.kind, source: post.source, item: post.item });
        }
      }
    } catch (e) {
      warnings.push(`The language-model read failed (${(e as Error).message.slice(0, 80)}); the pattern matcher was used on its own.`);
    }
  }

  // 3. Update the memory: evidence, waiting list, retirements.
  const updated = applyMentions({ ...file, sources: feeds.next }, mentions, { today, videoCounts, reviewedIds, overrides: input.overrides });
  file = updated.file;
  const before = new Set(input.discovered.tools.map((t) => t.id));

  // 4. List the ones with enough evidence, if their site checks out or a vendor announced them.
  let budget = LIMITS.maxPageChecks;
  const added: string[] = [];
  for (const p of updated.ready) {
    const tool = await enrich(p, deps, () => budget-- > 0);
    if (!tool) continue;
    file = promote(file, tool, p.key);
    added.push(tool.id);
  }

  // 5. Keep existing tools honest: their sites still up (a few a day), their categories still real.
  const checks = file.tools.filter((t) => t.urlKind === "site" && (Math.floor(deps.now.getTime() / DAY) + hash(t.id)) % 30 === 0).slice(0, 10);
  for (const t of checks) {
    if (budget-- <= 0) break;
    const info = await deps.page(t.url);
    if (info?.ok) {
      if (t.siteFailures) file = patch(file, t.id, { siteFailures: 0 });
      continue;
    }
    const failures = (t.siteFailures ?? 0) + 1;
    const fallback = t.evidence[0]?.url;
    // Two monthly checks in a row failing means the site is gone: link the announcement instead, if there is one.
    file = patch(file, t.id, failures >= 2 && fallback ? { url: fallback, urlKind: "announcement", siteFailures: 0 } : { siteFailures: failures });
  }
  const live = new Set(categories.map((c) => c.id));
  file = { ...file, tools: file.tools.map((t) => ({ ...t, tasks: t.tasks.filter((id) => live.has(id)) })) };

  // 6. File every tool that has no category yet. A language model may, otherwise the keywords decide.
  const textOf = (t: DiscoveredTool) => `${t.name}. ${t.bestFor} ${t.evidence.map((e) => e.title).join(". ")}`;
  const claudeUsed = { classify: !!deps.claude };
  for (const t of file.tools.filter((x) => x.tasks.length === 0)) {
    let ids: string[] = [];
    if (deps.claude && claudeUsed.classify) {
      try {
        ids = await deps.claude.classify({ name: t.name, text: textOf(t) }, categories);
      } catch {
        claudeUsed.classify = false;
      }
    }
    if (!ids.length) ids = classify(textOf(t), categories).ids;
    if (ids.length) file = patch(file, t.id, { tasks: ids });
  }

  // 7. Grow the tree: tools that fit nowhere, and several say the same thing → a new category.
  let created: string | undefined;
  let learned: string | undefined;
  const pool = (): PoolTool[] => file.tools.filter((t) => t.tasks.length === 0).map((t) => ({ id: t.id, text: textOf(t) }));
  const grown = growTaxonomy({
    categories,
    pool: pool(),
    filedTexts: file.tools.filter((t) => t.tasks.length > 0).map(textOf),
    today,
    blocked,
    review: deps.claude
      ? undefined
      : undefined,
  });
  let growth = grown;
  if (grown.created && deps.claude) {
    // A language model gets a veto and a better name, but the evidence rules above still decided it was worth asking.
    try {
      const reviewed = await deps.claude.review({ phrase: grown.created.category.keywords[0], label: grown.created.category.label, parent: grown.created.category.parent, definition: grown.created.category.definition, keywords: grown.created.category.keywords, icon: grown.created.category.icon, examples: grown.created.examples }, categories);
      growth = reviewed
        ? growTaxonomy({ categories, pool: pool(), filedTexts: file.tools.filter((t) => t.tasks.length > 0).map(textOf), today, blocked, review: () => reviewed })
        : { categories, filed: new Map() };
    } catch {
      growth = grown;
    }
  }
  if (growth.categories !== categories) {
    categories = growth.categories;
    created = growth.created?.category.id;
    learned = growth.learned ? `${growth.learned.id}: ${growth.learned.keyword}` : undefined;
    for (const [id, ids] of growth.filed) file = patch(file, id, { tasks: ids });
  }

  // 8. Retire automatic categories that stayed nearly empty.
  const retired = retireCategories(categories, file.tools, input.taxonomy.lowSince, today);
  categories = retired.categories;
  if (retired.retired.length) {
    const gone = new Set(retired.retired);
    file = { ...file, tools: file.tools.map((t) => ({ ...t, tasks: t.tasks.filter((id) => !gone.has(id)) })) };
  }

  const taxonomy = toTaxonomyFile(input.taxonomy, categories, retired.lowSince, growth.created, today);
  file = { ...file, updatedAt: today, tools: [...file.tools].sort((a, b) => a.firstSeen.localeCompare(b.firstSeen) || a.id.localeCompare(b.id)) };
  if (feeds.ok === 0 && deps.sources.length) warnings.push("Every feed failed. Nothing new was learned today; the catalog is unchanged.");
  else if (feeds.failed > feeds.ok) warnings.push(`${feeds.failed} of ${deps.sources.length} feeds failed today.`);

  return {
    discovered: file,
    taxonomy,
    added: added.filter((id) => !before.has(id)),
    removed: updated.dropped.tools,
    newCategory: created,
    learned,
    retiredCategories: retired.retired,
    feeds: { ok: feeds.ok, failed: feeds.failed, total: deps.sources.length },
    warnings,
  };
}

function patch(file: DiscoveredFile, id: string, changes: Partial<DiscoveredTool>): DiscoveredFile {
  return { ...file, tools: file.tools.map((t) => (t.id === id ? { ...t, ...changes } : t)) };
}

/**
 * Turns a product with enough evidence into a listed tool: finds its own site and checks it is up, takes its
 * description from the vendor's words (or the site's), and files it. Returns null to leave it waiting.
 */
async function enrich(p: PendingTool, deps: Deps, canCheck: () => boolean): Promise<DiscoveredTool | null> {
  const site = pickSiteUrl(p.key, p.links);
  let info: PageInfo | null = null;
  if (site && canCheck()) info = await deps.page(site);
  const siteOk = !!info?.ok;
  const vendor = p.mentions.some((m) => m.tier === "vendor");
  // Press and launch-site mentions alone aren't enough unless the product's own site is real and up.
  if (!siteOk && !vendor) return null;
  const ranked = [...p.mentions].sort((a, b) => (b.tier === "vendor" ? 1 : 0) - (a.tier === "vendor" ? 1 : 0) || b.date.localeCompare(a.date));
  const evidence: Evidence[] = ranked.slice(0, 6).map(({ source, title, url, date }) => ({ source, title, url, date }));
  const description = firstSentences(info?.description || p.summary, 200);
  if (!description && !siteOk) return null;
  return toDiscoveredTool({
    id: slugify(p.key),
    name: p.name,
    maker: p.maker ?? "",
    url: siteOk ? info!.finalUrl : ranked[0].url,
    urlKind: siteOk ? "site" : "announcement",
    kind: p.kind,
    bestFor: description || `${p.name}, announced by ${ranked[0].source}.`,
    tasks: [],
    evidence,
    firstSeen: p.firstSeen,
    lastSeen: p.lastSeen,
  });
}

// ── The command ────────────────────────────────────────────────────────────────────────────────────

const readJson = <T>(path: string | URL, fallback: T): T => {
  try {
    return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;
  } catch {
    return fallback;
  }
};

function load(): Inputs {
  const d = readJson<Record<string, unknown>>(PATHS.discovered, {});
  const t = readJson<Record<string, unknown>>(PATHS.taxonomy, {});
  const o = readJson<Partial<Overrides>>(PATHS.overrides, {});
  return {
    discovered: {
      ...EMPTY_DISCOVERED,
      updatedAt: String(d.updatedAt ?? ""),
      sources: Array.isArray(d.sources) ? (d.sources as SourceHealth[]) : [],
      tools: sanitizeDiscovered(d).map((tool, i) => ({ ...tool, siteFailures: (d.tools as DiscoveredTool[])[i]?.siteFailures })),
      pending: Array.isArray(d.pending) ? (d.pending as PendingTool[]) : [],
      retired: Array.isArray(d.retired) ? (d.retired as DiscoveredFile["retired"]) : [],
    },
    taxonomy: {
      ...EMPTY_TAXONOMY,
      categories: sanitizeCategories(t),
      history: Array.isArray(t.history) ? (t.history as TaxonomyFile["history"]) : [],
      lowSince: (t.lowSince as Record<string, string>) ?? {},
    },
    overrides: { blockNames: o.blockNames ?? [], blockIds: o.blockIds ?? [], alias: o.alias ?? {}, blockCategories: o.blockCategories ?? [] },
    videos: readJson<VideoFeed | null>(PATHS.videos, null),
  };
}

const UA = { "user-agent": "Mozilla/5.0 (compatible; USC-AI-Knowledge-Hub/1.0; +https://sites.usc.edu/ai-knowledge-hub/)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" };

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const now = process.env.DISCOVERY_NOW ? new Date(process.env.DISCOVERY_NOW) : new Date();
  let claude: Claude | undefined;
  if (process.env.ANTHROPIC_API_KEY) claude = (await import("./claude")).makeClaude();
  const input = load();
  const summary = await discover(
    {
      now,
      sources: SOURCES,
      fetchText: async (url) => {
        const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      },
      page: (url) => fetchPage(url),
      claude,
      log: console.log,
    },
    input,
  );

  const lines = [
    `Feeds: ${summary.feeds.ok} of ${summary.feeds.total} read.`,
    `Tools listed: ${summary.discovered.tools.length} (${summary.added.length} new${summary.added.length ? `: ${summary.added.join(", ")}` : ""}${summary.removed.length ? `; dropped: ${summary.removed.join(", ")}` : ""}).`,
    `Waiting for more evidence: ${summary.discovered.pending.length}.`,
    `Categories: ${summary.taxonomy.categories.length} added automatically${summary.newCategory ? `; new today: ${summary.newCategory}` : ""}${summary.learned ? `; learned ${summary.learned}` : ""}${summary.retiredCategories.length ? `; retired: ${summary.retiredCategories.join(", ")}` : ""}.`,
    `Unfiled tools: ${summary.discovered.tools.filter((t) => t.tasks.length === 0).length}.`,
    claude ? "A language model helped read and file." : "No ANTHROPIC_API_KEY: the pattern matcher did the reading and filing.",
  ];
  for (const l of lines) console.log(l);
  for (const w of summary.warnings) console.log(`::warning::Discovery: ${w}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Tool discovery\n\n${lines.map((l) => `- ${l}`).join("\n")}\n${summary.warnings.map((w) => `- ⚠️ ${w}`).join("\n")}\n`);

  const unchanged = (a: { updatedAt: string }, b: { updatedAt: string }) => JSON.stringify({ ...a, updatedAt: "" }) === JSON.stringify({ ...b, updatedAt: "" });
  if (dryRun) return console.log("Dry run: nothing written.");
  const old = { d: readJson<DiscoveredFile>(PATHS.discovered, EMPTY_DISCOVERED), t: readJson<TaxonomyFile>(PATHS.taxonomy, EMPTY_TAXONOMY) };
  if (!unchanged(old.d, summary.discovered) || !existsSync(PATHS.discovered)) writeFileSync(PATHS.discovered, JSON.stringify(summary.discovered, null, 2) + "\n");
  if (!unchanged(old.t, summary.taxonomy) || !existsSync(PATHS.taxonomy)) writeFileSync(PATHS.taxonomy, JSON.stringify({ ...summary.taxonomy, categories: autoOf(summary.taxonomy.categories) }, null, 2) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    // A crash must not block the deploy: say so and leave the files as they were.
    console.log(`::warning::Discovery crashed: ${(e as Error).message}`);
    process.exit(0);
  });
}
