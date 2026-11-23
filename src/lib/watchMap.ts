/**
 * The Watch explorer's map: every library video filed under one task (the same tasks as the tool map on
 * /tools), the tools inside each task, and a keyword search that says where to zoom. Pure functions over the
 * catalog and the video list, so they're easy to test; src/components/TaskExplorer.tsx draws the result.
 */
import type { Catalog } from "../data/catalog";
import type { Video } from "../data/types";
import { classify, hasKeyword, indexText, norm, stem } from "./taxonomy";

/** Videos whose title names no task and whose tools do many things land here, as do topic-only explainers. */
export const BASICS = { id: "basics", label: "General AI", icon: "lightbulb" } as const;

/** Tasks with fewer videos than this sit under the map as chips instead of on it, so the ring stays readable. */
export const MIN_ON_MAP = 5;

/** Where a video goes by its lesson topic (src/data/topics.ts) when neither its title nor its tools say. */
const TOPIC_TASK: Record<string, string> = {
  writing: "write",
  research: "research",
  data: "analyze",
  presenting: "present",
  multimodal: "video",
  coding: "code",
  automation: "automate",
  agents: "automate",
  teaching: "teach",
  assessment: "teach",
};

/**
 * Category words that mean something else in a video title ("learn ChatGPT", "the ChatGPT app", "a game
 * changer", "machine learning"), so titles don't count them as naming a task.
 */
const TITLE_NOISE = new Set(
  ["app", "api", "ide", "developer", "program", "script", "learn", "learning", "understand", "explain", "reading", "notes", "class", "students", "game", "youtube", "write", "draft", "art", "agents", "sources", "data", "architecture", "rendering", "guide"].map(stem),
);

export interface MapTool {
  id: string;
  name: string;
  /** The tool's videos in this task. */
  count: number;
}

export interface MapTask {
  id: string;
  label: string;
  icon: string;
  count: number;
  /** Tools with videos in this task, most videos first. A tool appears in every task it has videos in. */
  tools: MapTool[];
}

export interface VideoMap {
  tasks: MapTask[];
  /** Each video's task. */
  taskOf: Map<string, string>;
  /** Each tool's main task: where most of its videos are. Search and old links zoom there. */
  toolTask: Map<string, string>;
}

type CatalogLike = Pick<Catalog, "roots" | "toolById" | "categoryById" | "categories">;

const rootOf = (id: string, catalog: Pick<Catalog, "categoryById">) => catalog.categoryById.get(id)?.parent ?? id;

/**
 * The broad tasks a tool does: the parents of its categories, main one first. A tool nobody filed (an
 * editor-seeded discovery such as OpenEvidence) is read from its one-line description instead.
 */
export function toolRoots(toolId: string, catalog: CatalogLike): string[] {
  const t = catalog.toolById.get(toolId);
  if (!t) return [];
  const ids = t.tasks.length ? t.tasks : describedAs(t.bestFor ?? "", catalog);
  return [...new Set(ids.map((id) => rootOf(id, catalog)))];
}

/** Categories a one-line description fits. One line is short, so a single precise word is enough to go on. */
function describedAs(text: string, catalog: Pick<Catalog, "categories">): string[] {
  const c = classify(text, catalog.categories);
  if (c.ids.length) return c.ids;
  const best = [...c.scores.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? [best[0]] : [];
}

/** The tool's main task. */
export const toolRoot = (toolId: string, catalog: CatalogLike): string | undefined => toolRoots(toolId, catalog)[0];

/** The tasks a title names, strongest first: "Make AI videos with ChatGPT + CapCut" names Create video. */
export function titleTasks(title: string, catalog: Pick<Catalog, "categories" | "categoryById">): string[] {
  const ix = indexText(title);
  const score = new Map<string, number>();
  for (const c of catalog.categories) {
    for (const kw of new Set([...c.keywords, ...(c.cues ?? [])])) {
      const words = norm(kw).split(" ").filter(Boolean);
      if (!words.length || (words.length === 1 && TITLE_NOISE.has(stem(words[0])))) continue;
      if (!hasKeyword(ix, kw)) continue;
      const root = rootOf(c.id, catalog);
      score.set(root, Math.max(score.get(root) ?? 0, words.length > 1 ? 2 : 1));
    }
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** A tool filed under more broad tasks than this is a general assistant (ChatGPT, Claude, Gemini): naming it says no task. */
const SPECIALIST_MAX = 3;

/**
 * One task for a video, from what it shows how to do:
 * 1. the task its title names (a tie goes to a task one of its tools does);
 * 2. else the main task of a specialist tool in it (a Gamma tutorial is about slides);
 * 3. else, for a video that names no tool, its lesson topic's task;
 * 4. else General AI: "Get ChatGPT Plus for free" or "Claude for beginners" teach no one task.
 */
export function videoTask(v: Pick<Video, "title" | "tools" | "topics">, catalog: CatalogLike): string {
  const known = v.tools.filter((t) => catalog.toolById.has(t));
  const fromTitle = titleTasks(v.title ?? "", catalog);
  if (fromTitle.length) {
    const toolTasks = new Set(known.flatMap((t) => toolRoots(t, catalog)));
    return fromTitle.find((id) => toolTasks.has(id)) ?? fromTitle[0];
  }
  for (const t of known) {
    const roots = toolRoots(t, catalog);
    if (roots.length && roots.length <= SPECIALIST_MAX) return roots[0];
  }
  if (!known.length) for (const t of v.topics) if (TOPIC_TASK[t]) return TOPIC_TASK[t];
  return BASICS.id;
}

/** Files every video under a task and counts each task's tools. Tasks with no videos are left out; biggest first. */
export function buildVideoMap(videos: Video[], catalog: CatalogLike): VideoMap {
  const taskOf = new Map<string, string>();
  const counts = new Map<string, number>();
  const toolCounts = new Map<string, Map<string, number>>();
  for (const v of videos) {
    const task = videoTask(v, catalog);
    taskOf.set(v.id, task);
    counts.set(task, (counts.get(task) ?? 0) + 1);
    for (const t of new Set(v.tools)) {
      if (!catalog.toolById.has(t)) continue;
      const m = toolCounts.get(t) ?? new Map<string, number>();
      m.set(task, (m.get(task) ?? 0) + 1);
      toolCounts.set(t, m);
    }
  }
  // Each tool gets a bubble in every task it has videos in; its main task is where most are (its own on a tie).
  const toolTask = new Map<string, string>();
  const byTask = new Map<string, MapTool[]>();
  for (const [tool, m] of toolCounts) {
    const own = toolRoot(tool, catalog);
    const [main] = [...m.entries()].sort((a, b) => b[1] - a[1] || Number(b[0] === own) - Number(a[0] === own))[0];
    toolTask.set(tool, main);
    const name = catalog.toolById.get(tool)?.name ?? tool;
    for (const [task, count] of m) byTask.set(task, [...(byTask.get(task) ?? []), { id: tool, name, count }]);
  }
  const known = [...catalog.roots.map((r) => ({ id: r.id, label: r.label, icon: r.icon })), BASICS];
  const tasks = known
    .filter((t) => counts.get(t.id))
    .map((t) => ({ ...t, count: counts.get(t.id)!, tools: (byTask.get(t.id) ?? []).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) }))
    .sort((a, b) => b.count - a.count);
  return { tasks, taskOf, toolTask };
}

/** Videos in a task, optionally for one tool there. A tool with no task given shows all its videos. */
export function videosIn(videos: Video[], map: VideoMap, task: string | null, tool: string | null): Video[] {
  return videos.filter((v) => (!tool || v.tools.includes(tool)) && (!task || map.taskOf.get(v.id) === task));
}

const normQ = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();

/** Where a search should zoom: a tool by name, else a task by its name or everyday words, else nowhere. */
export function findOnMap(q: string, map: VideoMap, catalog: Pick<Catalog, "categoryById">): { task: string | null; tool: string | null } {
  const query = normQ(q);
  if (query.length < 2) return { task: null, tool: null };
  const tools = map.tasks.flatMap((t) => t.tools);
  const words = query.split(" ");
  // A tool: its whole name in the query, or the query starting its name ("clau" finds Claude).
  const byName = tools
    .map((t) => ({ t, name: normQ(t.name) }))
    .filter(({ name }) => (` ${query} `.includes(` ${name} `) || (query.length >= 3 && name.startsWith(query))))
    .sort((a, b) => b.name.length - a.name.length || b.t.count - a.t.count)[0];
  if (byName) return { task: map.toolTask.get(byName.t.id) ?? null, tool: byName.t.id };
  // A task: its label, or a keyword or cue of it or one of its sub-categories.
  let best: { id: string; score: number } | null = null;
  for (const task of map.tasks) {
    const cats = [...catalog.categoryById.values()].filter((c) => c.id === task.id || c.parent === task.id);
    const terms = [task.label, ...cats.flatMap((c) => [c.label, ...c.keywords, ...(c.cues ?? [])])].map(normQ);
    let score = 0;
    for (const term of terms) {
      if (!term) continue;
      if (term === query) score = Math.max(score, 3);
      else if (` ${query} `.includes(` ${term} `)) score = Math.max(score, 2);
      else if (words.some((w) => w.length >= 4 && term.split(" ").includes(w))) score = Math.max(score, 1);
    }
    if (task.id === BASICS.id && /\b(basics?|beginners?|what is|explained|llms?|prompt(s|ing)?|intro|rag|hallucinations?|reasoning)\b/.test(query)) score = Math.max(score, 2);
    if (score && (!best || score > best.score)) best = { id: task.id, score };
  }
  return { task: best?.id ?? null, tool: null };
}

export interface Point {
  x: number;
  y: number;
}

/** The map's drawing area, in world units. */
export const WORLD = { w: 1000, h: 640 };
export const CENTER: Point = { x: WORLD.w / 2, y: WORLD.h / 2 };

/** Task tiles on an ellipse around the center, biggest first from the top, clockwise. */
export function taskPositions(n: number): Point[] {
  const rx = 385;
  const ry = 245;
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / Math.max(n, 1)) * Math.PI * 2;
    return { x: CENTER.x + rx * Math.cos(a), y: CENTER.y + ry * Math.sin(a) };
  });
}

/** A focused task's tools on a ring around it, the first at the top. */
export function toolPositions(center: Point, n: number, radius = 150): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / Math.max(n, 1)) * Math.PI * 2;
    return { x: center.x + radius * 1.2 * Math.cos(a), y: center.y + radius * 0.9 * Math.sin(a) };
  });
}
