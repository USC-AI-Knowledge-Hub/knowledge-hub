import { RUBRIC, type Check, type RubricId } from "./quests";

/**
 * Scores a student's prompt against the dojo rubric with plain patterns, so
 * the feedback is instant, consistent, and works without a model. The model's
 * critique (when loaded) is layered on top and is told these results.
 */
const PATTERNS: Record<RubricId, RegExp[]> = {
  context: [
    /\b(i'?m|i am|as a|you are|you're|act as|pretend|imagine you|role of)\b/i,
    /\b(my|our) (class|course|exam|professor|major|job|lab|teacher|audience|team|draft|letter|essay)\b/i,
    /\b(first-year|freshman|sophomore|junior|senior|undergrad|graduate|grad student|beginner|student|for (a|an|my))\b/i,
  ],
  task: [
    /\b(write|explain|quiz|test|summari[sz]e|list|give|create|make|draft|review|critique|check|compare|outline|help|teach|ask|rewrite|edit|suggest|find|generate|analy[sz]e|point out|tell)\b/i,
  ],
  format: [
    /\b(bullet|bullets|table|list|numbered|paragraph|paragraphs|sentences?|words|steps|outline|headings?|columns?|flashcards?|one at a time|questions)\b/i,
    /\b\d+\s*(questions|bullets|points|items|words|sentences|problems|tips|ideas|cards|examples)\b/i,
    /\b(three|five|ten|two|four|six|seven|eight)\s+(questions|bullets|points|items|words|sentences|problems|tips|ideas|cards|examples|biggest)\b/i,
  ],
  constraints: [
    /\b(don'?t|do not|never|avoid|only|without|no more than|at most|under|keep|must|stick to|limit|instead of|rather than|not too|simple|plain|formal|casual|tone|level)\b/i,
  ],
  examples: [/\b(for example|e\.g\.|example|such as|like this|here'?s (a|an) sample|sample|in this style|like:)\b/i, /["“][^"”]{12,}["”]/],
};

export type RubricScore = Record<RubricId, boolean>;

export function scorePrompt(text: string): RubricScore {
  const t = text.trim();
  const out = {} as RubricScore;
  for (const r of RUBRIC) out[r.id] = t.length > 0 && PATTERNS[r.id].some((p) => p.test(t));
  // A one-liner can't meaningfully cover format or constraints.
  if (t.split(/\s+/).length < 6) {
    out.format = false;
    out.constraints = false;
  }
  return out;
}

export const scoreCount = (s: RubricScore) => Object.values(s).filter(Boolean).length;

/**
 * Deterministic option order per step, so the right answer isn't always
 * first. Stable across renders and visits.
 */
export function optionOrder(check: Check, seed: string): number[] {
  const idx = check.options.map((_, i) => i);
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  for (let i = idx.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}
