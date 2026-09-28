/**
 * Progress through guided lessons and courses, kept in this browser: where the
 * student is in each lesson, which questions they've seen and missed, their
 * reflections, and capstone checklists. Also the random draw for checks.
 */
import { useSyncExternalStore } from "react";
import type { LessonQuestion } from "../data/guided/types";

export interface LessonState {
  /** Index of the furthest step reached. */
  step: number;
  /** Best score on a check, and whether it passed. */
  best: number;
  passed: boolean;
  practiced: boolean;
  reflection: string;
  /** Question IDs answered wrong at least once and not yet answered right since. */
  missed: string[];
  /** Question IDs from the most recent check, so the next draw can avoid them. */
  lastDrawn: string[];
}

interface GuidedState {
  lessons: Record<string, LessonState>;
  /** Capstone checklist ticks, keyed by path ID. */
  capstones: Record<string, boolean[]>;
}

const KEY = "kh-guided";
const EMPTY: GuidedState = { lessons: {}, capstones: {} };
const listeners = new Set<() => void>();
let cache: GuidedState | null = null;

function read(): GuidedState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as GuidedState) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: GuidedState) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: progress lasts for this visit */
  }
  listeners.forEach((l) => l());
}

export const blankLesson = (): LessonState => ({ step: 0, best: 0, passed: false, practiced: false, reflection: "", missed: [], lastDrawn: [] });

export const guidedStore = {
  get: read,
  lesson: (module: string): LessonState => ({ ...blankLesson(), ...read().lessons[module] }),
  updateLesson(module: string, patch: Partial<LessonState>) {
    const s = read();
    write({ ...s, lessons: { ...s.lessons, [module]: { ...blankLesson(), ...s.lessons[module], ...patch } } });
  },
  capstone: (path: string, size: number): boolean[] => {
    const saved = read().capstones[path] ?? [];
    return Array.from({ length: size }, (_, i) => !!saved[i]);
  },
  setCapstone(path: string, ticks: boolean[]) {
    const s = read();
    write({ ...s, capstones: { ...s.capstones, [path]: ticks } });
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useGuided(): GuidedState {
  return useSyncExternalStore(guidedStore.subscribe, read, () => EMPTY);
}

/** Fisher–Yates shuffle with an injectable random source, for tests. */
export function shuffle<T>(xs: readonly T[], random = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A question with its options in a fresh order; `answer` points at the correct one. */
export interface DrawnQuestion extends LessonQuestion {
  order: number[];
}

/**
 * Picks `size` questions for a check. Questions missed before come first (at most half the
 * check, so it isn't all repeats), then ones not in the previous check, then anything else.
 * Every question gets its options shuffled.
 */
export function drawCheck(
  bank: readonly LessonQuestion[],
  size: number,
  { missed = [], lastDrawn = [] }: { missed?: string[]; lastDrawn?: string[] } = {},
  random = Math.random,
): DrawnQuestion[] {
  const missedQs = shuffle(bank.filter((q) => missed.includes(q.id)), random).slice(0, Math.floor(size / 2));
  const taken = new Set(missedQs.map((q) => q.id));
  const fresh = shuffle(bank.filter((q) => !taken.has(q.id) && !lastDrawn.includes(q.id)), random);
  const rest = shuffle(bank.filter((q) => !taken.has(q.id) && lastDrawn.includes(q.id)), random);
  const picked = [...missedQs, ...fresh, ...rest].slice(0, size);
  return shuffle(picked, random).map((q) => {
    const order = shuffle(q.options.map((_, i) => i), random);
    return { ...q, order, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
  });
}
