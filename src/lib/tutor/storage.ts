import { useSyncExternalStore } from "react";
import { XP_FIRST_TRY, XP_QUEST_BONUS, XP_RETRY, questById } from "./quests";

/**
 * Tutor state kept in this browser only: quest progress, XP, badges, streak,
 * and whether the student chose to download a model. Same pattern as
 * src/lib/progress.ts: a module-level snapshot with useSyncExternalStore.
 */

export interface QuestState {
  xp: number;
  /** questId → stepId → how the check was passed. */
  steps: Record<string, Record<string, "first" | "retry">>;
  /** Quest ids whose badge is earned. */
  badges: string[];
  streak: { count: number; last: string | null };
}

export type ModelChoice =
  | { status: "unset" }
  | { status: "declined" }
  | { status: "downloaded"; model: string; device: "webgpu" | "wasm" };

const QUEST_KEY = "kh-tutor-quests";
const MODEL_KEY = "kh-tutor-model";
const PATH_KEY = "kh-tutor-path";

const EMPTY: QuestState = { xp: 0, steps: {}, badges: [], streak: { count: 0, last: null } };

function load<T>(key: string, fallback: T, valid: (v: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return valid(v) ? (v as T) : fallback;
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

function store<T>(key: string, fallback: T, valid: (v: unknown) => boolean) {
  let snap = load(key, fallback, valid);
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

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";

export const questStore = store<QuestState>(QUEST_KEY, EMPTY, (v) => isObj(v) && typeof v.xp === "number" && isObj(v.steps));
export const modelStore = store<ModelChoice>(MODEL_KEY, { status: "unset" }, (v) => isObj(v) && typeof v.status === "string");
export const pathStore = store<string | null>(PATH_KEY, null, (v) => typeof v === "string");

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
  const gap = s.streak.last ? dayDiff(s.streak.last, now) : Infinity;
  const streak = gap === 0 ? s.streak : { count: gap === 1 ? s.streak.count + 1 : 1, last: now };
  return {
    state: { xp: s.xp + gained, steps, badges: badge ? [...s.badges, questId] : s.badges, streak },
    gained,
    badge,
  };
}

export function recordPass(questId: string, stepId: string, firstTry: boolean): AnswerResult {
  const r = applyPass(questStore.get(), questId, stepId, firstTry);
  if (r.gained) questStore.set(r.state);
  return r;
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
