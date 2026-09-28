import { useSyncExternalStore } from "react";
import { UNLOCK_AFTER, XP_FIRST_TRY, XP_QUEST_BONUS, XP_RETRY, XP_REVIEW, XP_REVIEW_BONUS, levelOf, levels, questById, type Level } from "./quests";
import type { Device } from "./registry";

/**
 * Tutor state kept in this browser only: quest progress, XP, badges, streak,
 * per-question results for review, and whether the student chose to download
 * a model. Same pattern as src/lib/progress.ts: a module-level snapshot with
 * useSyncExternalStore.
 */

/** How a student has done on one question (quest/step#variant) across quests and reviews. */
export interface AnswerStat {
  right: number;
  wrong: number;
  last: "right" | "wrong";
}

export interface QuestState {
  xp: number;
  /** questId → stepId → how the check was passed. */
  steps: Record<string, Record<string, "first" | "retry">>;
  /** Quest ids whose badge is earned. */
  badges: string[];
  streak: { count: number; last: string | null };
  /** questionId → results. Drives the weighting in daily review. */
  answers: Record<string, AnswerStat>;
  /** "questId/stepId" → the check variant shown last, so the next visit draws a different one. */
  seen: Record<string, number>;
  /** The day review XP was last earned (once a day). */
  reviewDay: string | null;
}

export type ModelChoice =
  | { status: "unset" }
  | { status: "declined" }
  | { status: "downloaded"; model: string; device: Device };

const QUEST_KEY = "kh-tutor-quests";
const MODEL_KEY = "kh-tutor-model";
const PATH_KEY = "kh-tutor-path";

export const EMPTY: QuestState = { xp: 0, steps: {}, badges: [], streak: { count: 0, last: null }, answers: {}, seen: {}, reviewDay: null };

function load<T>(key: string, fallback: T, parse: (v: unknown) => T | null): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return parse(JSON.parse(raw)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private mode or blocked storage: state lasts for this visit only. */
  }
}

function store<T>(key: string, fallback: T, parse: (v: unknown) => T | null) {
  let snap = load(key, fallback, parse);
  const listeners = new Set<() => void>();
  return {
    get: () => snap,
    set(next: T) {
      snap = next;
      save(key, next);
      listeners.forEach((l) => l());
    },
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Reads saved quest state from any version. Version 1 had only xp, steps,
 * badges and streak; the rest gets defaults, so earlier progress keeps
 * counting (badges still unlock levels, passed steps stay passed).
 */
export function migrate(v: unknown): QuestState | null {
  if (!isObj(v) || typeof v.xp !== "number" || !isObj(v.steps)) return null;
  const steps: QuestState["steps"] = {};
  for (const [q, byStep] of Object.entries(v.steps)) {
    if (!isObj(byStep)) continue;
    const kept: Record<string, "first" | "retry"> = {};
    for (const [s, how] of Object.entries(byStep)) if (how === "first" || how === "retry") kept[s] = how;
    steps[q] = kept;
  }
  const streak = isObj(v.streak) && typeof v.streak.count === "number" ? { count: v.streak.count, last: typeof v.streak.last === "string" ? v.streak.last : null } : EMPTY.streak;
  const answers: QuestState["answers"] = {};
  if (isObj(v.answers))
    for (const [id, a] of Object.entries(v.answers))
      if (isObj(a) && typeof a.right === "number" && typeof a.wrong === "number") answers[id] = { right: a.right, wrong: a.wrong, last: a.last === "wrong" ? "wrong" : "right" };
  const seen: QuestState["seen"] = {};
  if (isObj(v.seen)) for (const [k, n] of Object.entries(v.seen)) if (typeof n === "number") seen[k] = n;
  return {
    xp: v.xp,
    steps,
    badges: Array.isArray(v.badges) ? v.badges.filter((b): b is string => typeof b === "string") : [],
    streak,
    answers,
    seen,
    reviewDay: typeof v.reviewDay === "string" ? v.reviewDay : null,
  };
}

export const questStore = store<QuestState>(QUEST_KEY, EMPTY, migrate);
export const modelStore = store<ModelChoice>(MODEL_KEY, { status: "unset" }, (v) => (isObj(v) && typeof v.status === "string" ? (v as ModelChoice) : null));
export const pathStore = store<string | null>(PATH_KEY, null, (v) => (typeof v === "string" ? v : null));

export const useQuestState = () => useSyncExternalStore(questStore.subscribe, questStore.get);
export const useModelChoice = () => useSyncExternalStore(modelStore.subscribe, modelStore.get);
export const useChosenPath = () => useSyncExternalStore(pathStore.subscribe, pathStore.get);

/** Local calendar day, YYYY-MM-DD. */
export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`)) / 86_400_000);
}

/** The streak as it stands today: 0 if the last active day was before yesterday. */
export function liveStreak(s: QuestState["streak"], now = today()): number {
  if (!s.last) return 0;
  return dayDiff(s.last, now) <= 1 ? s.count : 0;
}

/** Counts today as active: +1 after yesterday, unchanged if already active today, else restart at 1. */
function bumpStreak(s: QuestState["streak"], now: string): QuestState["streak"] {
  const gap = s.last ? dayDiff(s.last, now) : Infinity;
  return gap === 0 ? s : { count: gap === 1 ? s.count + 1 : 1, last: now };
}

export interface AnswerResult {
  state: QuestState;
  gained: number;
  /** True when this answer finished the quest for the first time. */
  badge: boolean;
}

/**
 * Records a correct check. XP is awarded once per step: full on the first
 * try, less after a wrong answer. Finishing every step earns the badge and a
 * bonus. Pure, so it's easy to test; `recordPass` applies it to the store.
 */
export function applyPass(s: QuestState, questId: string, stepId: string, firstTry: boolean, now = today()): AnswerResult {
  const quest = questById.get(questId);
  if (!quest || s.steps[questId]?.[stepId]) return { state: s, gained: 0, badge: false };
  const steps = { ...s.steps, [questId]: { ...s.steps[questId], [stepId]: firstTry ? "first" : "retry" } } as QuestState["steps"];
  let gained = firstTry ? XP_FIRST_TRY : XP_RETRY;
  const finished = quest.steps.every((st) => steps[questId]?.[st.id]);
  const badge = finished && !s.badges.includes(questId);
  if (badge) gained += XP_QUEST_BONUS;
  return {
    state: { ...s, xp: s.xp + gained, steps, badges: badge ? [...s.badges, questId] : s.badges, streak: bumpStreak(s.streak, now) },
    gained,
    badge,
  };
}

export function recordPass(questId: string, stepId: string, firstTry: boolean): AnswerResult {
  const r = applyPass(questStore.get(), questId, stepId, firstTry);
  if (r.gained) questStore.set(r.state);
  return r;
}

/** Records one answer to a question (first attempt only, in quests and reviews). */
export function applyAnswer(s: QuestState, qid: string, correct: boolean): QuestState {
  const a = s.answers[qid] ?? { right: 0, wrong: 0, last: "right" as const };
  const next: AnswerStat = correct ? { right: a.right + 1, wrong: a.wrong, last: "right" } : { right: a.right, wrong: a.wrong + 1, last: "wrong" };
  return { ...s, answers: { ...s.answers, [qid]: next } };
}

export function recordAnswer(qid: string, correct: boolean) {
  questStore.set(applyAnswer(questStore.get(), qid, correct));
}

/** Remembers which variant of a step was just shown. */
export function markSeen(questId: string, stepId: string, variant: number) {
  const s = questStore.get();
  const key = `${questId}/${stepId}`;
  if (s.seen[key] !== variant) questStore.set({ ...s, seen: { ...s.seen, [key]: variant } });
}

export const lastSeen = (s: QuestState, questId: string, stepId: string): number | undefined => s.seen[`${questId}/${stepId}`];

/**
 * Finishes a review session. The first review each day earns XP_REVIEW per
 * correct answer plus a bonus; any review keeps the streak going.
 */
export function applyReview(s: QuestState, correct: number, now = today()): { state: QuestState; gained: number } {
  const gained = s.reviewDay === now ? 0 : correct * XP_REVIEW + XP_REVIEW_BONUS;
  return { state: { ...s, xp: s.xp + gained, reviewDay: now, streak: bumpStreak(s.streak, now) }, gained };
}

export function recordReview(correct: number): number {
  const r = applyReview(questStore.get(), correct);
  questStore.set(r.state);
  return r.gained;
}

export function resetQuests() {
  questStore.set(EMPTY);
}

export function questProgress(s: QuestState, questId: string): { done: number; total: number } {
  const q = questById.get(questId);
  const total = q?.steps.length ?? 0;
  const done = q ? q.steps.filter((st) => s.steps[questId]?.[st.id]).length : 0;
  return { done, total };
}

/** The step to resume at: the first one not yet passed, or the first step when finished. */
export function resumeStep(s: QuestState, questId: string): number {
  const q = questById.get(questId);
  if (!q) return 0;
  const i = q.steps.findIndex((st) => !s.steps[questId]?.[st.id]);
  return i < 0 ? 0 : i;
}

/** Quests in a level with their badge earned. */
export const levelDone = (s: QuestState, level: Level) => level.quests.filter((q) => s.badges.includes(q.id)).length;

/** Quests needed in the level before this one; 0 when unlocked. */
export function levelNeeds(s: QuestState, n: number): number {
  const prev = levels[n - 2];
  if (!prev) return 0;
  return Math.max(0, Math.min(UNLOCK_AFTER, prev.quests.length) - levelDone(s, prev));
}

export const levelUnlocked = (s: QuestState, n: number) => levelNeeds(s, n) === 0;

/** A quest is open when its level is unlocked, or when the student already started it (older saves). */
export function questUnlocked(s: QuestState, questId: string): boolean {
  const level = levelOf.get(questId);
  if (!level) return false;
  return levelUnlocked(s, level.n) || s.badges.includes(questId) || Object.keys(s.steps[questId] ?? {}).length > 0;
}

/** The next quest to take: the first unlocked, unfinished one on the path. */
export function nextQuest(s: QuestState, after?: string): string | null {
  const all = levels.flatMap((l) => l.quests.map((q) => q.id));
  const start = after ? all.indexOf(after) + 1 : 0;
  const order = [...all.slice(start), ...all.slice(0, start)];
  return order.find((id) => id !== after && !s.badges.includes(id) && questUnlocked(s, id)) ?? null;
}
