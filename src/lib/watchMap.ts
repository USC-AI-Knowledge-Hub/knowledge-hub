/**
 * The Watch explorer's map: every library video filed under one task (the same tasks as the tool map on
 * /tools), the tools inside each task, and a keyword search that says where to zoom. Pure functions over the
 * catalog and the video list, so they're easy to test; src/components/TaskExplorer.tsx draws the result.
 */
import type { Catalog } from "../data/catalog";
import type { Video } from "../data/types";

/** Topic-only videos (no tool named) and anything that fits no task land here. */
export const BASICS = { id: "basics", label: "AI basics", icon: "lightbulb" } as const;

/** Tasks with fewer videos than this sit under the map as chips instead of on it, so the ring stays readable. */
export const MIN_ON_MAP = 5;

/** Where a video with no tool goes, by its lesson topic (src/data/topics.ts). Unlisted topics go to AI basics. */
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

export interface MapTool {
  id: string;
  name: string;
  count: number;
}

export interface MapTask {
  id: string;
  label: string;
  icon: string;
  count: number;
  /** The task's tools that have videos, most videos first. */
  tools: MapTool[];
}

export interface VideoMap {
  tasks: MapTask[];
  /** Each video's task. */
  taskOf: Map<string, string>;
  /** Each tool's task (where its videos mostly are). */
  toolTask: Map<string, string>;
}

type CatalogLike = Pick<Catalog, "roots" | "toolById" | "categoryById">;

/** The broad task a tool belongs to: the parent of its first (main) category. */
export function toolRoot(toolId: string, catalog: CatalogLike): string | undefined {
  const first = catalog.toolById.get(toolId)?.tasks[0];
  if (!first) return undefined;
  return catalog.categoryById.get(first)?.parent ?? first;
}

/** One task for a video: its first tool's task, else its first topic's, else AI basics. */
export function videoTask(v: Pick<Video, "tools" | "topics">, catalog: CatalogLike): string {
  for (const t of v.tools) {
    const root = toolRoot(t, catalog);
    if (root) return root;
  }
  for (const t of v.topics) if (TOPIC_TASK[t]) return TOPIC_TASK[t];
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
    for (const t of v.tools) {
      if (!catalog.toolById.has(t)) continue;
      const m = toolCounts.get(t) ?? new Map<string, number>();
      m.set(task, (m.get(task) ?? 0) + 1);
      toolCounts.set(t, m);
    }
  }
  // A tool sits in the task where most of its videos are (its own task on a tie), so it appears once on the map.
  const toolTask = new Map<string, string>();
  const byTask = new Map<string, MapTool[]>();
  for (const [tool, m] of toolCounts) {
    const own = toolRoot(tool, catalog);
    const [task] = [...m.entries()].sort((a, b) => b[1] - a[1] || Number(b[0] === own) - Number(a[0] === own))[0];
    toolTask.set(tool, task);
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    byTask.set(task, [...(byTask.get(task) ?? []), { id: tool, name: catalog.toolById.get(tool)?.name ?? tool, count: total }]);
  }
  const known = [...catalog.roots.map((r) => ({ id: r.id, label: r.label, icon: r.icon })), BASICS];
  const tasks = known
    .filter((t) => counts.get(t.id))
    .map((t) => ({ ...t, count: counts.get(t.id)!, tools: (byTask.get(t.id) ?? []).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)) }))
    .sort((a, b) => b.count - a.count);
  return { tasks, taskOf, toolTask };
}

/** Videos in a task, optionally for one tool. A tool's videos all show, even those filed under another task. */
export function videosIn(videos: Video[], map: VideoMap, task: string | null, tool: string | null): Video[] {
  if (tool) return videos.filter((v) => v.tools.includes(tool));
  if (task) return videos.filter((v) => map.taskOf.get(v.id) === task);
  return videos;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();

/** Where a search should zoom: a tool by name, else a task by its name or everyday words, else nowhere. */
export function findOnMap(q: string, map: VideoMap, catalog: Pick<Catalog, "categoryById">): { task: string | null; tool: string | null } {
  const query = norm(q);
  if (query.length < 2) return { task: null, tool: null };
  const tools = map.tasks.flatMap((t) => t.tools);
  const words = query.split(" ");
  // A tool: its whole name in the query, or the query starting its name ("clau" finds Claude).
  const byName = tools
    .map((t) => ({ t, name: norm(t.name) }))
    .filter(({ name }) => (` ${query} `.includes(` ${name} `) || (query.length >= 3 && name.startsWith(query))))
    .sort((a, b) => b.name.length - a.name.length || b.t.count - a.t.count)[0];
  if (byName) return { task: map.toolTask.get(byName.t.id) ?? null, tool: byName.t.id };
  // A task: its label, or a keyword or cue of it or one of its sub-categories.
  let best: { id: string; score: number } | null = null;
  for (const task of map.tasks) {
    const cats = [...catalog.categoryById.values()].filter((c) => c.id === task.id || c.parent === task.id);
    const terms = [task.label, ...cats.flatMap((c) => [c.label, ...c.keywords, ...(c.cues ?? [])])].map(norm);
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
