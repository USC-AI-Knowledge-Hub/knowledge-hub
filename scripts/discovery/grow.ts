import type { Category, CategoryId } from "../../src/data/categories";
import { classify, hasKeyword, indexText, norm, scoreCategories, stem, tokens } from "../../src/lib/taxonomy";
import { slugify } from "./build-tool";
import { LIMITS } from "./sources";
import type { TaxonomyFile } from "./types";

/**
 * Growing the category tree. A new tool is first filed under the categories that already exist
 * (src/lib/taxonomy.ts). Only tools that fit nowhere reach this file, and a category is created
 * only when the evidence is strong and a duplicate is ruled out:
 *
 *  - at least MIN_SUPPORT unfiled tools share the same distinctive phrase ("contract review");
 *  - the phrase isn't something tools already filed elsewhere say all the time, which would mean an
 *    existing category is the right home and the classifier just missed it;
 *  - it doesn't restate an existing category (same words as its name or one of its keywords);
 *  - the run hasn't already added its one category, and the tree isn't full.
 *
 * It lands inside a broad category when the tools mostly belong near one, otherwise on its own.
 */

export const MIN_SUPPORT = 3;
/** A phrase said by this many tools already filed elsewhere belongs to an existing category. */
const MAX_FILED_ELSEWHERE = 1;

/** Words too generic to make a category name. */
const GENERIC = new Set(
  `tool platform app apps powered model models users make create created using built based easy powerful free simple fast generative generate generated intelligent intelligence artificial software product products company startup launch launched announce announced today introducing available access team teams business businesses enterprise people anyone everyone solution solutions feature features platform assistant assistants agent agents workflow workflows turn turns text image images video videos your you our their more best way ways thing things work works working allows allow lets helps help also just like get gets takes take new latest first open source built-in online web`.split(" "),
);

/** Phrases (stemmed) in a text: runs of two or three meaningful words with no stop or generic word inside. */
export function descriptors(text: string): string[] {
  const words = norm(text).split(" ").filter(Boolean);
  const keep = (w: string) => w.length > 1 && !GENERIC.has(w) && tokens(w).length > 0;
  const out = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    if (!keep(words[i])) continue;
    for (const n of [2, 3]) {
      const run = words.slice(i, i + n);
      if (run.length === n && run.every(keep)) out.add(run.join(" "));
    }
  }
  return [...out];
}

const stems = (s: string) => norm(s).split(" ").filter(Boolean).map(stem);

/**
 * Whether a phrase just restates a category: all its words are in the category's name, or all in one of
 * its keywords. "Video editing" restates the video editing category. "Legal research" does not restate
 * Research: it's narrower, so it can become a category inside it.
 */
export function restates(phrase: string, c: Category): boolean {
  const p = stems(phrase);
  if (!p.length) return false;
  const inside = (words: string[]) => p.every((w) => words.includes(w));
  return inside(stems(c.label)) || c.keywords.some((k) => inside(stems(k)));
}

const ACRONYMS = new Set(["ai", "3d", "cad", "api", "llm", "seo", "sql", "crm", "hr", "ui", "ux", "ar", "vr", "ml", "it", "pdf", "gpu", "cpu", "iot", "bim", "erp"]);

/** "legal research" → "Legal research", "3d printing" → "3D printing": sentence case, acronyms kept. */
export function labelFor(phrase: string): string {
  const words = phrase.split(" ").map((w, i) => (ACRONYMS.has(w) ? w.toUpperCase() : i === 0 ? w[0].toUpperCase() + w.slice(1) : w));
  return words.join(" ");
}

const ICONS: [RegExp, string][] = [
  [/\b(legal|law|contract|court|compliance)\b/, "gavel"],
  [/\b(health|medical|clinical|patient|doctor|care)\b/, "medical_services"],
  [/\b(financ|accounting|invoice|bank|tax|invest)\w*/, "payments"],
  [/\b(sales|crm|lead|marketing|ads?|seo)\b/, "campaign"],
  [/\b(customer|support|helpdesk|chatbot)\b/, "support_agent"],
  [/\b(hiring|recruit|resume|career|job)\w*/, "work"],
  [/\b(travel|trip|flight|hotel|itinerary)\b/, "luggage"],
  [/\b(real estate|property|home)\b/, "home_work"],
  [/\b(science|biology|chemistry|physics|lab|genome|protein)\b/, "science"],
  [/\b(math|maths|equation|calculus)\b/, "calculate"],
  [/\b(translat|language learning|multilingual)\w*/, "translate"],
  [/\b(security|cyber|privacy|threat)\b/, "shield"],
  [/\b(robot|hardware|device|wearable|drone)\w*/, "precision_manufacturing"],
  [/\b(map|geospatial|satellite|climate|weather)\b/, "public"],
  [/\b(food|recipe|nutrition|cooking)\b/, "restaurant"],
  [/\b(fashion|apparel|style)\b/, "checkroom"],
  [/\b(social|community|creator)\b/, "groups"],
  [/\b(memory|knowledge base|second brain|notes)\b/, "psychology"],
];
const iconFor = (phrase: string, parent?: Category) => ICONS.find(([re]) => re.test(phrase))?.[1] ?? parent?.icon ?? "category";

export interface PoolTool {
  id: string;
  /** Everything known about the tool in words: name, the posts' summary, its site's description. */
  text: string;
}

export interface GrowthResult {
  categories: Category[];
  created?: { category: Category; reason: string; examples: string[] };
  /** A keyword added to an existing automatic category, when a phrase turned out to describe it. */
  learned?: { id: CategoryId; keyword: string };
  /** The unfiled tools a new category now covers. */
  filed: Map<string, CategoryId[]>;
}

export interface GrowthInput {
  /** Every category now: seeds and automatic ones. */
  categories: Category[];
  /** Tools that fit no category. */
  pool: PoolTool[];
  /** Text of tools that did get filed, to spot phrases an existing category already owns. */
  filedTexts: string[];
  today: string;
  /** Category ids editors have ruled out. */
  blocked?: Set<string>;
  /** Decides a candidate with more judgement than counting (a language model); may veto or rename. */
  review?: (candidate: Candidate) => Candidate | null;
}

export interface Candidate {
  phrase: string;
  label: string;
  parent?: CategoryId;
  definition: string;
  keywords: string[];
  icon: string;
  examples: string[];
}

export function growTaxonomy(input: GrowthInput): GrowthResult {
  const { categories, pool, filedTexts, today } = input;
  const blocked = input.blocked ?? new Set();
  const none: GrowthResult = { categories, filed: new Map() };
  const auto = categories.filter((c) => c.origin === "auto");
  if (pool.length < MIN_SUPPORT || auto.length >= LIMITS.maxAutoCategories) return none;

  // Which unfiled tools say each phrase, and how many filed ones do.
  const support = new Map<string, Set<string>>();
  for (const t of pool) for (const d of descriptors(t.text)) support.set(d, (support.get(d) ?? new Set()).add(t.id));
  const filedIx = filedTexts.map(indexText);
  const candidates = [...support.entries()]
    .filter(([, ids]) => ids.size >= MIN_SUPPORT)
    .map(([phrase, ids]) => {
      const elsewhere = filedIx.filter((ix) => hasKeyword(ix, phrase)).length;
      return { phrase, ids: [...ids], elsewhere, score: ids.size * 10 + phrase.split(" ").length * 2 - elsewhere };
    })
    .filter((c) => c.elsewhere <= MAX_FILED_ELSEWHERE)
    .sort((a, b) => b.score - a.score || a.phrase.localeCompare(b.phrase));

  for (const cand of candidates) {
    const same = categories.find((c) => restates(cand.phrase, c));
    if (same) {
      // An automatic category can pick the phrase up; a seed is the editors' and stays as written.
      if (same.origin === "auto" && !same.keywords.includes(cand.phrase) && same.keywords.length < 14) {
        const next = categories.map((c) => (c.id === same.id ? { ...c, keywords: [...c.keywords, cand.phrase] } : c));
        return { categories: next, learned: { id: same.id, keyword: cand.phrase }, filed: refile(next, pool) };
      }
      continue;
    }
    const members = pool.filter((t) => cand.ids.includes(t.id));
    const roots = categories.filter((c) => !c.parent);
    const near = new Map<CategoryId, number>();
    for (const m of members) for (const [id, s] of scoreCategories(m.text, roots)) near.set(id, (near.get(id) ?? 0) + s);
    const total = [...near.values()].reduce((a, b) => a + b, 0);
    const top = [...near.entries()].sort((a, b) => b[1] - a[1])[0];
    const parent = top && top[1] >= 2 && top[1] / total >= 0.4 ? roots.find((r) => r.id === top[0]) : undefined;

    let draft: Candidate | null = {
      phrase: cand.phrase,
      label: labelFor(cand.phrase),
      parent: parent?.id,
      definition: `Tools for ${cand.phrase}, found in announcements.`,
      keywords: [cand.phrase, ...coPhrases(members, cand.phrase)],
      icon: iconFor(cand.phrase, parent),
      examples: members.map((m) => m.id).slice(0, 5),
    };
    if (input.review) draft = input.review(draft);
    if (!draft) continue;

    let id = slugify(draft.label);
    if (!id || blocked.has(id)) continue;
    for (let n = 2; categories.some((c) => c.id === id); n++) id = `${slugify(draft.label)}-${n}`;
    const category: Category = {
      id,
      label: draft.label,
      icon: draft.icon,
      parent: draft.parent,
      definition: draft.definition,
      keywords: [...new Set(draft.keywords)].slice(0, 8),
      origin: "auto",
      createdAt: today,
    };
    const next = [...categories, category];
    return {
      categories: next,
      created: { category, reason: `${cand.ids.length} new tools describe "${cand.phrase}", which no category covers.`, examples: draft.examples },
      filed: refile(next, pool),
    };
  }
  return none;
}

/** Other phrases the cluster's tools share, as extra keywords for the new category. */
function coPhrases(members: PoolTool[], phrase: string): string[] {
  const count = new Map<string, number>();
  for (const m of members) for (const d of descriptors(m.text)) if (d !== phrase && !phrase.includes(d)) count.set(d, (count.get(d) ?? 0) + 1);
  return [...count.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([d]) => d);
}

/** Files every unfiled tool again under the updated tree. */
function refile(categories: Category[], pool: PoolTool[]): Map<string, CategoryId[]> {
  const out = new Map<string, CategoryId[]>();
  for (const t of pool) {
    const { ids } = classify(t.text, categories);
    if (ids.length) out.set(t.id, ids);
  }
  return out;
}

/**
 * Retires automatic categories that stayed nearly empty: fewer than two tools (counting the tools in
 * their sub-categories) for `categoryRetireDays` in a row. Seed categories are never removed.
 */
export function retireCategories(
  categories: Category[],
  tools: { tasks: CategoryId[] }[],
  lowSince: Record<string, string>,
  today: string,
): { categories: Category[]; lowSince: Record<string, string>; retired: CategoryId[] } {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const used = (id: CategoryId) => {
    const family = new Set([id, ...categories.filter((c) => c.parent === id).map((c) => c.id)]);
    return tools.filter((t) => t.tasks.some((x) => family.has(x))).length;
  };
  const nextLow: Record<string, string> = {};
  const retired: CategoryId[] = [];
  for (const c of categories) {
    if (c.origin !== "auto") continue;
    if (used(c.id) >= 2) continue;
    const since = lowSince[c.id] ?? today;
    nextLow[c.id] = since;
    if (Math.floor((Date.parse(today) - Date.parse(since)) / 86_400_000) >= LIMITS.categoryRetireDays) retired.push(c.id);
  }
  const gone = new Set(retired);
  // A sub-category whose parent retires stands on its own rather than disappearing with it.
  const kept = categories.filter((c) => !gone.has(c.id)).map((c) => (c.parent && gone.has(c.parent) && byId.get(c.parent) ? { ...c, parent: undefined } : c));
  for (const id of retired) delete nextLow[id];
  return { categories: kept, lowSince: nextLow, retired };
}

/** The automatic categories as the file stores them. */
export const autoOf = (categories: Category[]) => categories.filter((c) => c.origin === "auto");

export function toTaxonomyFile(prev: TaxonomyFile, categories: Category[], lowSince: Record<string, string>, created: GrowthResult["created"], today: string): TaxonomyFile {
  const history = [...prev.history];
  if (created) history.push({ id: created.category.id, createdAt: today, reason: created.reason, examples: created.examples });
  const live = new Set(categories.map((c) => c.id));
  return { updatedAt: today, categories: autoOf(categories), history: history.filter((h) => live.has(h.id)).slice(-60), lowSince };
}
