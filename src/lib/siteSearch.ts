/**
 * One search for the whole site, built for how students actually ask:
 * "make slides from my paper", "transcribe a lecture", "is this study
 * disputed?". Used by the tool map, the search page and the tutor's
 * navigation. Pure functions over the data files, so it's easy to test.
 */
import { courses } from "../data/courses";
import { modules, paths } from "../data/learn";
import type { Category } from "../data/categories";
import { getCatalog } from "./catalogStore";
import { topics } from "../data/topics";
import type { CatalogTool, Task } from "../data/types";

/** Words that point at a category: its label, keywords and everyday cues. Phrases are matched before single words. */
const wordsOf = (c: Category) => [c.label.toLowerCase(), ...c.keywords, ...(c.cues ?? [])];

const STOP = new Set(
  "a an the to of for and or in on with my me i want need how do can could would should is are be it this that from into about help some any use using tool tools ai".split(" "),
);

const norm = (s: string) => s.toLowerCase().replace(/[“”"'’]/g, "").replace(/[^a-z0-9+#.\s-]/g, " ");

/** Crude stemmer: good enough to match "papers" to "paper" and "transcribing" to "transcrib". */
const stem = (w: string) =>
  w.length <= 3 ? w : w.replace(/(ings?|ed|es|s)$/, "").replace(/e$/, "").replace(/(.)\1$/, "$1");

export function tokenize(q: string): string[] {
  return norm(q)
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** Which tasks a query is about, with the words that triggered each. */
export function tasksFor(q: string): Map<Task, string> {
  const text = ` ${norm(q)} `;
  const words = new Set(tokenize(q).map(stem));
  const out = new Map<Task, string>();
  for (const c of getCatalog().categories) {
    for (const w of wordsOf(c).map(norm).map((x) => x.trim())) {
      const hit = w.includes(" ") ? text.includes(` ${w} `) : words.has(stem(w));
      if (hit) {
        out.set(c.id, w);
        break;
      }
    }
  }
  return out;
}

function fieldScore(text: string, terms: string[], weight: number): number {
  const t = norm(text);
  let s = 0;
  for (const term of terms) if (t.includes(term)) s += weight;
  return s;
}

export interface ToolHit {
  tool: CatalogTool;
  score: number;
  /** Short reasons for the match, for the UI ("Good for: Make a presentation"). */
  why: string[];
}

export function searchTools(q: string): ToolHit[] {
  const terms = tokenize(q).map(stem).filter((t) => t.length > 1);
  if (!terms.length) return [];
  const tasks = tasksFor(q);
  const whole = norm(q).trim();
  const hits: ToolHit[] = [];
  const catalog = getCatalog();
  for (const tool of catalog.tools) {
    const why: string[] = [];
    let score = 0;
    const name = norm(tool.name);
    if (name === whole || tool.id === whole) score += 100;
    else if (terms.some((t) => name.split(/\s+/).some((w) => w.startsWith(t)))) score += 40;
    score += fieldScore(tool.maker, terms, 4);
    score += fieldScore(tool.bestFor, terms, 4);
    if (tool.reviewed) {
      score += fieldScore(tool.bestUses.join(" "), terms, 2);
      score += fieldScore(tool.different, terms, 1.5);
      score += fieldScore(tool.strengths.join(" "), terms, 1);
    }
    for (const [task, word] of tasks) {
      if (catalog.inCategory(tool, task)) {
        // A tool's first-listed category is its main job; a specific category beats its parent.
        score += tool.tasks[0] === task ? 14 : tool.tasks.includes(task) ? 10 : 8;
        why.push(`Good for: ${catalog.categoryById.get(task)?.label.toLowerCase()} (“${word}”)`);
      }
    }
    if (score > 0) hits.push({ tool, score, why });
  }
  return hits.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));
}

export type HitKind = "tool" | "lesson" | "course" | "path" | "page";

export interface SiteHit {
  kind: HitKind;
  id: string;
  title: string;
  route: string;
  blurb: string;
  score: number;
}

/** Top-level pages, with the words people use for them. */
export const PAGES: { id: string; title: string; route: string; blurb: string; words: string[] }[] = [
  { id: "home", title: "Home", route: "/", blurb: "Start here.", words: ["home", "start", "main page"] },
  { id: "learn", title: "Learn", route: "/learn", blurb: "Lessons and learning paths.", words: ["learn", "lessons", "modules", "paths", "learning"] },
  { id: "courses", title: "Full courses", route: "/learn/courses", blurb: "Complete free courses on YouTube.", words: ["courses", "course", "playlists", "lectures", "university"] },
  { id: "tools", title: "Tools", route: "/tools", blurb: "The AI tool map and reviews.", words: ["tools", "tool map", "map", "reviews", "compare tools", "which ai"] },
  { id: "watch", title: "Watch", route: "/watch", blurb: "Videos refreshed every morning.", words: ["watch", "videos", "video library", "new videos", "youtube"] },
  {
    id: "green",
    title: "Green AI",
    route: "/green",
    blurb: "Use AI efficiently and responsibly: right-size models, energy and governance.",
    words: ["green", "green ai", "sustainability", "sustainable", "environment", "environmental", "energy", "climate", "carbon", "water", "planet", "efficient", "efficiency", "governance", "responsible ai", "responsible use", "pledge"],
  },
  { id: "about", title: "How videos are chosen", route: "/about", blurb: "How the library works.", words: ["about", "how videos are chosen", "how it works"] },
];

export function searchSite(q: string, limit = 8): SiteHit[] {
  const terms = tokenize(q).map(stem);
  const whole = norm(q).trim();
  // Page names are checked on the whole query first, since some ("tools") are stop words.
  if (!terms.length) {
    const page = PAGES.find((p) => p.words.includes(whole));
    return page ? [{ kind: "page", id: page.id, title: page.title, route: page.route, blurb: page.blurb, score: 30 }] : [];
  }
  const out: SiteHit[] = [];

  for (const p of PAGES) {
    const s = p.words.some((w) => whole === w || whole.endsWith(` ${w}`) || whole.startsWith(`${w} `)) ? 30 : fieldScore(p.words.join(" "), terms, 6);
    if (s) out.push({ kind: "page", id: p.id, title: p.title, route: p.route, blurb: p.blurb, score: s });
  }
  // The pipeline's topic patterns know that "attention" and "tokens" belong to the LLM lesson.
  const topicHits = new Set(topics.filter((t) => t.match.some((p) => new RegExp(p, "i").test(q))).map((t) => t.id));
  for (const m of modules) {
    const s = (topicHits.has(m.topic) ? 20 : 0) + fieldScore(m.title, terms, 10) + fieldScore(m.summary, terms, 4) + fieldScore(m.keyIdeas.join(" ") + " " + m.what, terms, 1.5) + fieldScore(m.topic, terms, 6);
    if (s) out.push({ kind: "lesson", id: m.id, title: m.title, route: `/learn/${m.id}`, blurb: m.summary, score: s + 2 });
  }
  for (const c of courses) {
    const s = fieldScore(c.title, terms, 8) + fieldScore(`${c.org} ${c.channel}`, terms, 6) + fieldScore(c.summary, terms, 2);
    if (s) out.push({ kind: "course", id: c.id, title: c.title, route: `/learn/courses?course=${c.id}`, blurb: `${c.org}. ${c.summary}`, score: s });
  }
  for (const p of paths) {
    const s = fieldScore(`${p.title} ${p.audience}`, terms, 8) + fieldScore(p.summary, terms, 2);
    if (s) out.push({ kind: "path", id: p.id, title: p.title, route: `/learn/path/${p.id}`, blurb: p.summary, score: s });
  }
  for (const h of searchTools(q).slice(0, 6)) {
    out.push({ kind: "tool", id: h.tool.id, title: h.tool.name, route: `/tools/${h.tool.id}`, blurb: h.tool.bestFor, score: h.score / 2 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Recognizes "take me to…", "open…", "where is…" requests so navigation never
 * depends on a language model. Returns the thing they asked for, or null.
 */
export function navigationRequest(text: string): string | null {
  const m = norm(text)
    .trim()
    .match(/^(?:please\s+)?(?:can you\s+|could you\s+)?(?:take me to|go to|open|show me|navigate to|bring me to|jump to|where (?:is|are|can i find)|find me|find)\s+(?:the\s+|a\s+|an\s+|my\s+)?(.+?)(?:\s+page)?\s*[?.!]*$/);
  return m ? m[1].trim() : null;
}
