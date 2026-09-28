/**
 * Daily review: a short set of questions drawn from finished quests, weighted
 * toward the ones a student has missed before. Pure functions; the view is
 * ReviewView.tsx and results are stored through storage.ts.
 */
import { questById, questionId, quests, type Check, type Rng } from "./quests";
import type { AnswerStat, QuestState } from "./storage";

export const REVIEW_SIZE = 5;

export interface ReviewItem {
  qid: string;
  questId: string;
  stepId: string;
  variant: number;
  check: Check;
  /** For spot steps: what someone asked the AI; the options are its claims. */
  prompt?: string;
}

/**
 * Every reviewable question from finished quests: all variants of learn steps
 * and the spot rounds. Dojo checks are left out because they ask about a
 * stronger prompt that's only shown inside the quest.
 */
export function reviewPool(s: QuestState): ReviewItem[] {
  const out: ReviewItem[] = [];
  for (const q of quests) {
    if (!s.badges.includes(q.id)) continue;
    for (const step of q.steps) {
      if (step.kind === "learn")
        step.checks.forEach((check, v) => out.push({ qid: questionId(q.id, step.id, v), questId: q.id, stepId: step.id, variant: v, check }));
      else if (step.kind === "spot")
        out.push({ qid: questionId(q.id, step.id, 0), questId: q.id, stepId: step.id, variant: 0, check: step.check, prompt: step.question });
    }
  }
  return out;
}

/**
 * How likely a question is to be drawn. Missed questions weigh most, and the
 * weight falls as they're answered right again; unseen questions sit a little
 * above ones already answered right.
 */
export function reviewWeight(a: AnswerStat | undefined): number {
  if (!a) return 1.5;
  return 1 + (3 * a.wrong) / (1 + a.right) + (a.last === "wrong" ? 2 : 0);
}

/** Picks up to `n` questions by weight, without repeats, preferring different steps. */
export function pickReview(s: QuestState, rng: Rng = Math.random, n = REVIEW_SIZE): ReviewItem[] {
  let pool = reviewPool(s);
  const picked: ReviewItem[] = [];
  const steps = new Set<string>();
  while (picked.length < n && pool.length) {
    const fresh = pool.filter((x) => !steps.has(`${x.questId}/${x.stepId}`));
    const from = fresh.length ? fresh : pool;
    const weights = from.map((x) => reviewWeight(s.answers[x.qid]));
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < from.length - 1 && r >= weights[i]) r -= weights[i++];
    const item = from[i];
    picked.push(item);
    steps.add(`${item.questId}/${item.stepId}`);
    pool = pool.filter((x) => x.qid !== item.qid);
  }
  return picked;
}

/** A readable label for where a review question came from. */
export function reviewSource(item: ReviewItem): string {
  const q = questById.get(item.questId);
  const step = q?.steps.find((s) => s.id === item.stepId);
  return q && step ? `${q.title} · ${step.title}` : "";
}
