/**
 * Grounding for free chat: find the lessons (and quest notes) that cover a
 * question and turn them into short notes the model must stick to.
 */
import type { GuidedLesson } from "../../data/guided/types";
import { moduleById } from "../../data/learn";
import { toolById } from "../../data/tools";
import type { Module, Tool } from "../../data/types";
import { searchSite, tokenize, type SiteHit } from "../siteSearch";
import { LIMITS, clip } from "./prompt";
import { quests, type Quest, type QuestStep } from "./quests";

export interface Source {
  title: string;
  route: string;
}

export interface Grounding {
  notes: string;
  sources: Source[];
  /** Up to three "Related on this site" links. */
  related: SiteHit[];
  /** Best lesson for this question, if any. Used when there's no model. */
  lesson: Module | null;
}

export function lessonNotes(m: Module, budget = 900): string {
  const ideas = m.keyIdeas.map((k) => `- ${k}`).join("\n");
  return clip(`Lesson “${m.title}”: ${m.what} ${m.why}`, Math.max(200, budget - ideas.length - 12)) + `\nKey ideas:\n${ideas}`;
}

/**
 * Notes for a question asked while reading a guided lesson: the lesson's sections that share the
 * most words with the question (the first section if none do), so the tutor explains what the
 * student is reading.
 */
export function lessonGround(question: string, lesson: GuidedLesson): { notes: string; headings: string[] } {
  const terms = new Set(tokenize(question).filter((t) => t.length > 2));
  const scored = lesson.sections
    .map((s, i) => {
      const text = `${s.heading} ${s.body}`.toLowerCase();
      let score = 0;
      for (const t of terms) if (text.includes(t.length > 4 ? t.slice(0, -1) : t)) score++;
      return { s, i, score };
    })
    .sort((a, b) => b.score - a.score || a.i - b.i);
  const picked = scored[0].score ? scored.filter((x) => x.score > 0).slice(0, 2) : [scored[0]];
  const per = Math.floor(LIMITS.notes / picked.length) - 20;
  return {
    notes: picked.map((x) => clip(`${x.s.heading}: ${x.s.body.replace(/\*\*/g, "")}`, per)).join("\n\n"),
    headings: picked.map((x) => x.s.heading),
  };
}

export function toolNotes(t: Tool): string {
  return [
    `Tool profile: ${t.name} by ${t.maker}. Best for: ${t.bestFor}`,
    `Good uses: ${t.bestUses.join("; ")}.`,
    `Poor uses: ${t.poorUses.join("; ")}.`,
    `What's different: ${t.different}`,
    `USC access: ${t.usc === "provided" ? "provided by USC" : t.usc === "check" ? "check with USC IT" : "personal account"}.`,
  ].join("\n");
}

/** Question words that tokenize() keeps but that say nothing about the topic. */
const QUESTION_WORDS = new Set("what was were does did why who when which much many there have has does doing work works really actually".split(" "));

function stepScore(q: string, quest: Quest, step: QuestStep): number {
  const terms = [...new Set(tokenize(q).filter((t) => t.length > 2 && !QUESTION_WORDS.has(t)))];
  if (!terms.length) return 0;
  const head = `${quest.title} ${step.title} ${step.ask}`.toLowerCase();
  const body = step.notes.toLowerCase();
  let s = 0;
  let matched = 0;
  for (const t of terms) {
    const root = t.length > 4 ? t.slice(0, -1) : t;
    if (head.includes(root)) s += 2;
    else if (body.includes(root)) s += 1;
    else continue;
    matched++;
  }
  // One shared word isn't enough: "prompt engineering" once matched the energy-per-prompt step.
  if (terms.length > 1 && matched < 2) return 0;
  return s / Math.sqrt(terms.length);
}

/** The quest step whose notes best cover a question, if one clearly does. */
export function bestQuestStep(q: string): { quest: Quest; step: QuestStep } | null {
  let best: { quest: Quest; step: QuestStep; s: number } | null = null;
  for (const quest of quests)
    for (const step of quest.steps) {
      const s = stepScore(q, quest, step);
      if (!best || s > best.s) best = { quest, step, s };
    }
  return best && best.s >= 1.2 ? { quest: best.quest, step: best.step } : null;
}

export function ground(question: string): Grounding {
  const hits = searchSite(question, 8);
  const lessonHits = hits.filter((h) => h.kind === "lesson");
  // A second lesson only if it's nearly as relevant; a weak match adds noise, not help.
  const lessons = lessonHits
    .filter((h, i) => i === 0 || h.score >= lessonHits[0].score * 0.6)
    .slice(0, 2)
    .map((h) => moduleById.get(h.id)!)
    .filter(Boolean);
  const step = bestQuestStep(question);
  const parts: string[] = [];
  const sources: Source[] = [];
  if (step) {
    parts.push(`${step.step.title}: ${step.step.notes}`);
    sources.push({ title: step.quest.title, route: "" });
  }
  const per = Math.floor((LIMITS.notes - (parts[0]?.length ?? 0)) / Math.max(1, lessons.length)) - 10;
  for (const m of lessons) {
    if (per < 250) break;
    parts.push(lessonNotes(m, per));
    sources.push({ title: m.title, route: `/learn/${m.id}` });
  }
  return {
    notes: parts.join("\n\n").slice(0, LIMITS.notes),
    sources,
    related: hits.slice(0, 3),
    lesson: lessons[0] ?? null,
  };
}

export const moduleNotes = (id: string) => {
  const m = moduleById.get(id);
  return m ? lessonNotes(m, LIMITS.notes) : "";
};

export const toolNotesById = (id: string) => {
  const t = toolById.get(id);
  return t ? toolNotes(t) : "";
};
