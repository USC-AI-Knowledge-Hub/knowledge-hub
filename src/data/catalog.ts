/**
 * The tool finder's full catalog: the reviewed tools in tools.ts, plus tools the daily discovery run
 * found (public/data/discovered.json), organised by the seed categories plus any the run added
 * (public/data/taxonomy.json). Pure functions; the app loads the two JSON files at run time
 * (src/lib/catalog.tsx) and the pipeline reads them from disk.
 */
import { SEED_CATEGORIES, type Category, type CategoryId } from "./categories";
import { tools } from "./tools";
import type { CatalogTool, DiscoveredTool, Evidence, Tool } from "./types";

export interface Catalog {
  tools: CatalogTool[];
  toolById: Map<string, CatalogTool>;
  categories: Category[];
  categoryById: Map<CategoryId, Category>;
  /** Broad categories, in order. */
  roots: Category[];
  childrenOf(id: CategoryId): Category[];
  /** A category's id and its sub-categories' ids. */
  family(id: CategoryId): CategoryId[];
  /** The tools in a category, counting those in its sub-categories. */
  toolsIn(id: CategoryId): CatalogTool[];
  /** Whether a tool is in a category, counting sub-categories. */
  inCategory(tool: Pick<CatalogTool, "tasks">, id: CategoryId): boolean;
  /** A tool's categories plus their parents, most specific first. */
  categoriesOf(tool: Pick<CatalogTool, "tasks">): Category[];
}

const ID = /^[a-z0-9][a-z0-9-]{0,48}$/;

export function buildCatalog(reviewed: Tool[], discovered: DiscoveredTool[] = [], auto: Category[] = []): Catalog {
  // Categories: seeds first; an automatic one can't replace a seed or reuse an id, and a parent that
  // is missing or isn't a broad category means it stands on its own.
  const categories: Category[] = [...SEED_CATEGORIES];
  const ids = new Set(categories.map((c) => c.id));
  for (const c of auto) {
    if (ids.has(c.id)) continue;
    const parent = c.parent && categories.find((p) => p.id === c.parent && !p.parent) ? c.parent : undefined;
    categories.push({ ...c, parent, origin: "auto" });
    ids.add(c.id);
  }
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const roots = categories.filter((c) => !c.parent);
  const kids = new Map<CategoryId, Category[]>();
  for (const c of categories) if (c.parent) kids.set(c.parent, [...(kids.get(c.parent) ?? []), c]);
  const childrenOf = (id: CategoryId) => kids.get(id) ?? [];
  const family = (id: CategoryId) => [id, ...childrenOf(id).map((c) => c.id)];

  // Tools: a reviewed tool always wins over a discovered one with the same id. Unknown categories are dropped.
  const all: CatalogTool[] = reviewed.map((t) => ({ ...t, reviewed: true as const }));
  const taken = new Set(all.map((t) => t.id));
  for (const d of discovered) {
    if (taken.has(d.id)) continue;
    taken.add(d.id);
    all.push({ ...d, tasks: d.tasks.filter((t) => categoryById.has(t)), reviewed: false });
  }
  const toolById = new Map(all.map((t) => [t.id, t]));

  const inCategory = (tool: Pick<CatalogTool, "tasks">, id: CategoryId) => {
    const fam = family(id);
    return tool.tasks.some((t) => fam.includes(t));
  };
  const categoriesOf = (tool: Pick<CatalogTool, "tasks">) => {
    const out: Category[] = [];
    for (const id of tool.tasks) {
      const c = categoryById.get(id);
      if (!c) continue;
      if (!out.includes(c)) out.push(c);
      const p = c.parent ? categoryById.get(c.parent) : undefined;
      if (p && !out.includes(p)) out.push(p);
    }
    return out;
  };
  return { tools: all, toolById, categories, categoryById, roots, childrenOf, family, toolsIn: (id) => all.filter((t) => inCategory(t, id)), inCategory, categoriesOf };
}

/** The reviewed tools alone: for code that runs without loading the discovery data. */
export const STATIC_CATALOG = buildCatalog(tools);

// ── Reading the discovery files ────────────────────────────────────────────────────────────────
// They are written by a script and read by the site, so the site checks what it reads.

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);
const strings = (v: unknown, max: number, each: number): string[] => (Array.isArray(v) ? v.map((x) => str(x, each)).filter((x): x is string => !!x).slice(0, max) : []);
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
/** Only plain https addresses are ever linked. */
export const safeUrl = (v: unknown): string | null => {
  const s = str(v, 400);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
};

export function sanitizeDiscovered(raw: unknown): DiscoveredTool[] {
  const list = (raw as { tools?: unknown } | null)?.tools;
  if (!Array.isArray(list)) return [];
  const out: DiscoveredTool[] = [];
  for (const r of list as Record<string, unknown>[]) {
    const id = str(r?.id, 49);
    const name = str(r?.name, 60);
    const url = safeUrl(r?.url);
    const firstSeen = day(r?.firstSeen);
    const lastSeen = day(r?.lastSeen);
    if (!id || !ID.test(id) || !name || !url || !firstSeen || !lastSeen) continue;
    const evidence: Evidence[] = (Array.isArray(r.evidence) ? (r.evidence as Record<string, unknown>[]) : [])
      .map((e) => ({ source: str(e?.source, 80), title: str(e?.title, 200), url: safeUrl(e?.url), date: day(e?.date) }))
      .filter((e): e is Evidence => !!(e.source && e.title && e.url && e.date))
      .slice(0, 6);
    out.push({
      id,
      name,
      maker: str(r.maker, 60) ?? "",
      url,
      monogram: (str(r.monogram, 3) ?? name.slice(0, 2)).slice(0, 2),
      bestFor: str(r.bestFor, 300) ?? "",
      tasks: strings(r.tasks, 6, 49).filter((t) => ID.test(t)),
      queries: strings(r.queries, 3, 80),
      match: strings(r.match, 6, 120),
      exclude: strings(r.exclude, 6, 120),
      kind: r.kind === "model" ? "model" : "tool",
      urlKind: r.urlKind === "site" ? "site" : "announcement",
      origin: r.origin === "editor" ? "editor" : "feed",
      firstSeen,
      lastSeen,
      evidence,
    });
  }
  return out;
}

export function sanitizeCategories(raw: unknown): Category[] {
  const list = (raw as { categories?: unknown } | null)?.categories;
  if (!Array.isArray(list)) return [];
  const out: Category[] = [];
  for (const r of list as Record<string, unknown>[]) {
    const id = str(r?.id, 49);
    const label = str(r?.label, 60);
    if (!id || !ID.test(id) || !label) continue;
    out.push({
      id,
      label,
      icon: str(r.icon, 40) && /^[a-z0-9_]+$/.test(String(r.icon)) ? String(r.icon) : "category",
      parent: str(r.parent, 49) ?? undefined,
      definition: str(r.definition, 240) ?? "",
      keywords: strings(r.keywords, 14, 60),
      origin: "auto",
      createdAt: day(r.createdAt) ?? undefined,
    });
  }
  return out;
}
