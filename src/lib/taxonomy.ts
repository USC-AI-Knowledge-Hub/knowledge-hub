/**
 * Reading text and deciding which categories it belongs to. Used by the discovery run to file new
 * tools, and by site search to understand a question. Pure functions, no browser or Node needs.
 */
import type { Category, CategoryId } from "../data/categories";

/** Lowercase, plain letters and digits. Hyphens and dots become spaces so "text-to-video" reads as "text to video". */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”"'’]/g, "")
    .replace(/[^a-z0-9+#\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Crude stemmer: good enough to match "papers" to "paper" and "transcribing" to "transcrib". */
export const stem = (w: string) => (w.length <= 3 ? w : w.replace(/(ings?|ed|es|s)$/, "").replace(/e$/, "").replace(/(.)\1$/, "$1"));

const STOP = new Set(
  "a an the to of for and or in on with my me i want need how do can could would should is are be it this that from into about help some any use using tool tools ai by as at your you our we they their its not no yes new more most".split(" "),
);

/** The meaningful words in some text: normalized, stop words dropped. */
export const tokens = (text: string): string[] => norm(text).split(" ").filter((w) => w.length > 1 && !STOP.has(w));

export interface TextIndex {
  /** The text's word stems in order, padded with spaces, for phrase lookups ("3d models" finds "3d model"). */
  padded: string;
  stems: Set<string>;
}

const stemmed = (text: string) => norm(text).split(" ").filter(Boolean).map(stem);

export function indexText(text: string): TextIndex {
  const s = stemmed(text);
  return { padded: ` ${s.join(" ")} `, stems: new Set(s) };
}

/** Whether a keyword appears: a phrase as a whole phrase, a single word by its stem. */
export function hasKeyword(ix: TextIndex, keyword: string): boolean {
  const k = stemmed(keyword);
  if (!k.length) return false;
  return k.length > 1 ? ix.padded.includes(` ${k.join(" ")} `) : ix.stems.has(k[0]);
}

/** A phrase is stronger evidence than a word. */
const WORD = 1;
const PHRASE = 2;

/** How strongly the text points at each category (those with no evidence are left out). */
export function scoreCategories(text: string, categories: Category[]): Map<CategoryId, number> {
  const ix = indexText(text);
  const out = new Map<CategoryId, number>();
  for (const c of categories) {
    let score = 0;
    for (const kw of new Set(c.keywords)) if (hasKeyword(ix, kw)) score += norm(kw).includes(" ") ? PHRASE : WORD;
    if (score > 0) out.set(c.id, score);
  }
  return out;
}

export interface Classification {
  /** The most specific categories that fit, strongest first. A sub-category implies its parent. */
  ids: CategoryId[];
  /** The strongest score. Below `MIN_SCORE` nothing fits. */
  best: number;
  scores: Map<CategoryId, number>;
}

/** Evidence needed before a category is trusted: two words, or one phrase. */
export const MIN_SCORE = 2;
/** A second or third category must be at least this fraction as strong as the best. */
const RELATIVE = 0.6;
const MAX_CATEGORIES = 3;

export function classify(text: string, categories: Category[]): Classification {
  const scores = scoreCategories(text, categories);
  const byId = new Map(categories.map((c) => [c.id, c]));
  // A broad category whose sub-category has real evidence is implied by it: files under the sub-category,
  // and the broad score (which adds up its sub-categories' overlapping words) doesn't set the bar.
  const implied = new Set<CategoryId>();
  for (const [id, score] of scores) {
    const parent = byId.get(id)?.parent;
    if (parent && score >= MIN_SCORE) implied.add(parent);
  }
  const eligible = [...scores.entries()].filter(([id]) => !implied.has(id));
  const best = Math.max(0, ...eligible.map(([, s]) => s));
  if (best < MIN_SCORE) return { ids: [], best, scores };
  const floor = Math.max(MIN_SCORE, best * RELATIVE);
  const ids = eligible
    .filter(([, s]) => s >= floor)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id)
    .slice(0, MAX_CATEGORIES);
  return { ids, best, scores };
}
