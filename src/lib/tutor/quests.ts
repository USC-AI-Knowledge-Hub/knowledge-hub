/**
 * Guided quests, arranged as a three-level training path. Each step pairs a
 * question the tutor answers with notes we wrote, so a small model
 * paraphrases accurate material instead of inventing it. Every step ends with
 * a multiple-choice check graded in code, so a quest works (and teaches) even
 * when the model is weak or not downloaded.
 *
 * Checks are pools: each time a step is shown one variant is drawn at random
 * (never the one just seen) and its options are shuffled. The content lives in
 * quests/level1–3.ts; types and constants in quests/types.ts.
 */
import { level1 } from "./quests/level1";
import { level2 } from "./quests/level2";
import { level3 } from "./quests/level3";
import type { Check, Quest, QuestStep } from "./quests/types";

export * from "./quests/types";

export interface Level {
  n: 1 | 2 | 3;
  title: string;
  blurb: string;
  quests: Quest[];
}

/** Finished quests needed in a level before the next one unlocks. */
export const UNLOCK_AFTER = 3;

export const levels: Level[] = [
  { n: 1, title: "How AI works", blurb: "Tokens, training, reasoning and media: what's going on inside.", quests: level1 },
  { n: 2, title: "Using AI well", blurb: "Prompting, checking, grounding, agents and picking the right model.", quests: level2 },
  { n: 3, title: "AI and the world", blurb: "Energy, fairness, privacy, integrity, work and the rules.", quests: level3 },
];

export const quests: Quest[] = levels.flatMap((l) => l.quests);

export const questById = new Map(quests.map((q) => [q.id, q]));

export const levelOf = new Map(levels.flatMap((l) => l.quests.map((q) => [q.id, l] as const)));

/** A random source in [0, 1). Injected in tests. */
export type Rng = () => number;

/** How many check variants a step has: learn checks, dojo tasks, or the one spot answer. */
export function variantCount(step: QuestStep): number {
  return step.kind === "learn" ? step.checks.length : step.kind === "dojo" ? step.tasks.length : 1;
}

/** The check for one variant of a step. */
export function checkFor(step: QuestStep, variant: number): Check {
  if (step.kind === "learn") return step.checks[variant % step.checks.length];
  if (step.kind === "dojo") return step.tasks[variant % step.tasks.length].check;
  return step.check;
}

/** Draws a variant index at random, never `last` when there's a choice. */
export function drawVariant(count: number, last: number | undefined, rng: Rng = Math.random): number {
  if (count <= 1) return 0;
  if (last === undefined || last < 0 || last >= count) return Math.floor(rng() * count);
  // Pick from the other count - 1 variants, then skip over `last`.
  const i = Math.floor(rng() * (count - 1));
  return i >= last ? i + 1 : i;
}

/** A random order for `n` options (Fisher–Yates). */
export function shuffle(n: number, rng: Rng = Math.random): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/** Stable id for one question: quest/step#variant. Used for per-question results and review. */
export const questionId = (questId: string, stepId: string, variant: number) => `${questId}/${stepId}#${variant}`;
