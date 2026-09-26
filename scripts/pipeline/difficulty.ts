import type { Difficulty } from "../../src/data/types";
import { toolById } from "../../src/data/tools";

const SIGNALS: Record<Difficulty, [RegExp, number][]> = {
  beginner: [
    [/\bbeginners?\b/i, 3],
    [/\b(complete|ultimate|absolute) beginner/i, 3],
    [/\bgetting started\b|\bget started\b/i, 2.5],
    [/\bintro(duction)?\b|\b101\b|\bbasics\b|\bfundamentals\b/i, 2],
    [/\bwhat is\b|\bexplained\b|\bexplainer\b/i, 1.5],
    [/\bhow to use\b|\bfirst time\b|\bstep[- ]by[- ]step\b|\bno experience\b/i, 1.5],
    [/\bin \d+ minutes?\b|\bquick (start|guide)\b|\bsimple\b|\beasy\b/i, 1],
    [/\bfor (students|teachers|everyone|non[- ]?technical)\b/i, 1],
  ],
  intermediate: [
    [/\btips\b|\btricks\b|\bhacks\b|\bpro tips\b|\bpower users?\b/i, 2],
    [/\bworkflows?\b|\bproductivity\b|\bsystem\b/i, 1.5],
    [/\bprompt(ing| engineering)\b|\bcustom (gpts?|instructions)\b|\bprojects\b/i, 1.5],
    [/\bbetter results\b|\blevel up\b|\bmaster(ing)?\b|\bnext level\b|\bbeyond the basics\b/i, 2],
    [/\bintermediate\b/i, 3],
    [/\bcompar(e|ison)\b|\bvs\.?\b/i, 1],
    [/\bautomat(e|ion)\b|\bno[- ]code\b/i, 1],
  ],
  advanced: [
    [/\badvanced\b|\bdeep dive\b|\bunder the hood\b|\bfrom scratch\b/i, 3],
    [/\bapi\b|\bsdk\b|\bcli\b|\bpython\b|\btypescript\b|\bjavascript\b/i, 2.5],
    [/\bagents?\b|\bagentic\b|\bmcp\b|\bmulti[- ]agent\b|\btool (use|calling)\b/i, 2],
    [/\brag\b|\bembeddings?\b|\bvector\b|\bfine[- ]?tun/i, 3],
    [/\bdeploy\b|\bproduction\b|\barchitecture\b|\bself[- ]host/i, 2],
    [/\bevals?\b|\bbenchmarks?\b|\blangchain\b|\blanggraph\b|\bllamaindex\b/i, 2],
    [/\bbuild(ing)? (an?|your own) (app|agent|saas|pipeline)\b/i, 2],
  ],
};

export interface DifficultyGuess {
  difficulty: Difficulty;
  /** 0–1. Below ~0.4 the guess is mostly the tool's baseline. */
  confidence: number;
}

/**
 * Keyword-weighted difficulty guess. Title signals count fully, description
 * signals at a third. The primary tool's own difficulty acts as a prior, and
 * long videos lean slightly harder.
 */
export function guessDifficulty(input: {
  title: string;
  description?: string;
  duration?: number;
  tools?: string[];
}): DifficultyGuess {
  const score: Record<Difficulty, number> = { beginner: 0, intermediate: 0, advanced: 0 };
  const desc = (input.description ?? "").slice(0, 500);
  for (const level of Object.keys(SIGNALS) as Difficulty[]) {
    for (const [re, w] of SIGNALS[level]) {
      if (re.test(input.title)) score[level] += w;
      else if (re.test(desc)) score[level] += w / 3;
    }
  }

  const prior = input.tools?.[0] ? toolById.get(input.tools[0])?.difficulty : undefined;
  if (prior) score[prior] += 1;
  else score.beginner += 0.5;

  const minutes = (input.duration ?? 0) / 60;
  if (minutes > 45) score.advanced += 0.75;
  else if (minutes > 20) score.intermediate += 0.5;
  else if (minutes > 0 && minutes < 8) score.beginner += 0.5;

  const ranked = (Object.entries(score) as [Difficulty, number][]).sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  const total = ranked.reduce((s, [, v]) => s + v, 0) || 1;
  const margin = (top[1] - second[1]) / total;
  return { difficulty: top[0], confidence: Math.min(1, Math.max(0, margin * 1.5 + top[1] / 12)) };
}
