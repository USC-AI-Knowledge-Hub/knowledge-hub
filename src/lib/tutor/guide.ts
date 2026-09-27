/**
 * Everything the tutor does without a model: where to go next, which path
 * fits, which tool to use, and site navigation. Deterministic and tested, so
 * routes and recommendations never depend on a language model.
 */
import { moduleById, pathById, paths } from "../../data/learn";
import type { LearningPath, Module } from "../../data/types";
import { PAGES, navigationRequest, searchSite, searchTools, type SiteHit, type ToolHit } from "../siteSearch";

export interface NextStep {
  module: Module;
  path: LearningPath;
  /** Steps done in that path, and its length. */
  done: number;
  total: number;
  /** Plain-language reason shown under the recommendation. */
  reason: string;
}

/**
 * The next unfinished module. Preference order: the path the student is on
 * (the page they're viewing, then the one they picked), then the path they've
 * made most progress in, then the student starter path.
 */
export function nextModule(done: string[], preferPath?: string | null): NextStep | null {
  const doneSet = new Set(done);
  const progressIn = (p: LearningPath) => p.steps.filter((s) => doneSet.has(s.module)).length;
  const unfinished = (p: LearningPath) => p.steps.find((s) => !doneSet.has(s.module));

  const candidates: LearningPath[] = [];
  const preferred = preferPath ? pathById.get(preferPath) : undefined;
  if (preferred) candidates.push(preferred);
  const byProgress = [...paths]
    .filter((p) => progressIn(p) > 0)
    .sort((a, b) => progressIn(b) / b.steps.length - progressIn(a) / a.steps.length || progressIn(b) - progressIn(a));
  candidates.push(...byProgress, pathById.get("student")!, ...paths);

  for (const p of candidates) {
    const step = unfinished(p);
    if (!step) continue;
    const m = moduleById.get(step.module);
    if (!m) continue;
    const n = progressIn(p);
    const reason =
      n === 0
        ? p === preferred
          ? `It's the first lesson in the ${p.title.toLowerCase()}.`
          : `It's where the ${p.title.toLowerCase()} starts, and you haven't marked any lessons done yet.`
        : `You've finished ${n} of ${p.steps.length} lessons in the ${p.title.toLowerCase()}. This is the next one: ${step.note.toLowerCase()}.`;
    return { module: m, path: p, done: n, total: p.steps.length, reason };
  }
  return null;
}

/** The two static questions for "Pick a path for me". */
export const PATH_QUESTIONS = [
  {
    id: "role",
    question: "Which of these describes you best?",
    options: [
      { id: "undergrad", label: "Undergraduate student" },
      { id: "grad", label: "Graduate student or researcher" },
      { id: "faculty", label: "Faculty or staff" },
      { id: "maker", label: "I like building things" },
    ],
  },
  {
    id: "goal",
    question: "What do you want most right now?",
    options: [
      { id: "coursework", label: "Use AI well in my classes" },
      { id: "understand", label: "Understand how it works" },
      { id: "research", label: "Research and data" },
      { id: "teach", label: "Teach or assess with AI" },
      { id: "build", label: "Build tools and automations" },
    ],
  },
] as const;

export type Role = (typeof PATH_QUESTIONS)[0]["options"][number]["id"];
export type Goal = (typeof PATH_QUESTIONS)[1]["options"][number]["id"];

const ROLE_WEIGHT: Record<Role, Record<string, number>> = {
  undergrad: { student: 3, builder: 1 },
  grad: { researcher: 3, student: 1 },
  faculty: { faculty: 3, researcher: 1 },
  maker: { builder: 3 },
};
const GOAL_WEIGHT: Record<Goal, Record<string, number>> = {
  coursework: { student: 3 },
  understand: { researcher: 2, builder: 2, student: 1 },
  research: { researcher: 3 },
  teach: { faculty: 3 },
  build: { builder: 3 },
};

export function pickPath(role: Role, goal: Goal): LearningPath {
  const score = (id: string) => (ROLE_WEIGHT[role][id] ?? 0) + (GOAL_WEIGHT[goal][id] ?? 0);
  // Goal breaks ties: it's the more specific answer.
  return [...paths].sort((a, b) => score(b.id) - score(a.id) || (GOAL_WEIGHT[goal][b.id] ?? 0) - (GOAL_WEIGHT[goal][a.id] ?? 0))[0];
}

export interface NavPlan {
  /** What they asked for, e.g. "courses". */
  dest: string;
  hits: SiteHit[];
  /** Set when the best hit clearly wins (at least twice the runner-up's score). */
  go: SiteHit | null;
}

/** "Take me to the courses" → a plan. Null when the text isn't a navigation request. */
export function planNavigation(text: string): NavPlan | null {
  const dest = navigationRequest(text);
  if (!dest) return null;
  // A page named exactly ("tools", "full courses", "video library") always wins.
  // searchSite treats "tools" as a stop word, so check page names first.
  const key = dest.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const page = PAGES.find((p) => p.title.toLowerCase() === key || p.id === key || p.words.includes(key));
  const hits = searchSite(dest, 4);
  if (page) {
    const hit: SiteHit = { kind: "page", id: page.id, title: page.title, route: page.route, blurb: page.blurb, score: 100 };
    return { dest, hits: [hit, ...hits.filter((h) => h.route !== page.route)].slice(0, 4), go: hit };
  }
  const [best, second] = hits;
  const go = best && (!second || best.score >= 2 * second.score) ? best : null;
  return { dest, hits, go };
}

const TOOL_INTENT = /\b(which|what|best|good|recommend|suggest)\b.*\b(tool|tools|app|apps|ai)\b.*\b(for|to)\b|\btool for\b|\bwhat should i use (for|to)\b/i;

/** "Which tool should I use to make slides?" → tool hits. Null when it's not a tool question. */
export function toolQuestion(text: string): { task: string; hits: ToolHit[] } | null {
  if (!TOOL_INTENT.test(text)) return null;
  const task = text.replace(/^.*?\b(for|to)\b\s*/i, "").replace(/[?.!]+$/, "").trim() || text;
  const hits = searchTools(task).slice(0, 3);
  return hits.length ? { task, hits } : null;
}

const NEXT_INTENT = /\b(what|which)\b.*\b(learn|study|lesson|do)\b.*\bnext\b|\bnext lesson\b|\bwhere (do|should) i (start|begin)\b/i;
const PATH_INTENT = /\b(pick|choose|recommend|suggest|which)\b.*\bpath\b/i;

export type Intent = "next" | "path" | null;

export function intentOf(text: string): Intent {
  if (PATH_INTENT.test(text)) return "path";
  if (NEXT_INTENT.test(text)) return "next";
  return null;
}
