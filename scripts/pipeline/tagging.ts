import { tools } from "../../src/data/tools";
import { topics } from "../../src/data/topics";

const compile = (patterns: string[] = []) => patterns.map((p) => new RegExp(p, "i"));

const toolMatchers = tools.map((t) => ({
  id: t.id,
  match: compile(t.match),
  exclude: compile(t.exclude),
}));

const topicMatchers = topics.map((t) => ({ id: t.id, match: compile(t.match) }));

/**
 * Tags text with tool IDs. The title counts double: a tool named in the title
 * is what the video is about; one named only in the description is a mention.
 * Returns tools ordered by strength, so tags[0] is the primary tool.
 */
export function tagTools(title: string, description = ""): string[] {
  const scored: { id: string; score: number }[] = [];
  const desc = description.slice(0, 600);
  for (const t of toolMatchers) {
    const hit = (text: string) => {
      if (!t.match.some((r) => r.test(text))) return false;
      // An exclusion only vetoes when the excluded phrase is the thing matched,
      // e.g. "Claude Code" shouldn't also count as "Claude" unless Claude appears on its own.
      if (t.exclude.length && t.exclude.some((r) => r.test(text))) {
        const stripped = t.exclude.reduce((s, r) => s.replace(new RegExp(r.source, "gi"), " "), text);
        return t.match.some((r) => r.test(stripped));
      }
      return true;
    };
    const score = (hit(title) ? 2 : 0) + (hit(desc) ? 1 : 0);
    if (score > 0) scored.push({ id: t.id, score });
  }
  // Description-only mentions are noisy; keep them only if the title names no tool.
  const strong = scored.filter((s) => s.score >= 2);
  const pool = strong.length ? strong : scored.filter((s) => s.score >= 1).slice(0, 1);
  return pool.sort((a, b) => b.score - a.score).map((s) => s.id);
}

export function tagTopics(title: string, description = ""): string[] {
  const text = `${title}\n${description.slice(0, 400)}`;
  return topicMatchers.filter((t) => t.match.some((r) => r.test(text))).map((t) => t.id).slice(0, 4);
}
