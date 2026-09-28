/**
 * Grounding for free chat: find the lessons (and quest notes) that cover a
 * question and turn them into short notes the model must stick to.
 */
import { guidedLessons } from "../../data/guided";
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
  /** Lessons the notes came from, most relevant first. Used to suggest videos. */
  modules: string[];
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

/**
 * Words students use that the notes put differently. Each expands a query term into the words
 * the notes actually use, so "its architecture" can find the transformer notes.
 */
const EXPAND: Record<string, string[]> = {
  llm: ["language", "model", "transformer"],
  llms: ["language", "model", "transformer"],
  gpt: ["language", "model", "transformer"],
  architecture: ["transformer", "layers", "attention", "embeddings"],
  structure: ["transformer", "layers", "attention", "embeddings"],
  built: ["transformer", "layers", "training"],
  inside: ["transformer", "layers", "attention"],
  internals: ["transformer", "layers", "attention"],
  parts: ["transformer", "layers", "embeddings"],
  components: ["transformer", "layers", "embeddings"],
  neural: ["network", "layers"],
  trained: ["training", "pre-training"],
  learn: ["training"],
  hallucinate: ["hallucination", "invent"],
  hallucinates: ["hallucination", "invent"],
  hallucinations: ["hallucination", "invent"],
  rag: ["retrieval", "documents"],
};

/** Words that say what kind of answer is wanted, not what it's about. */
const FILLER = new Set(
  "explain show tell give full whole detail details detailed more about works work working mean means meaning define definition simple simply please good make makes making made thing things stuff way ways get gets".split(" "),
);

const PRONOUN = /\b(it|its|it's|this|that|they|them|their|these|those|he|she)\b/i;

/** Phrases students use for an idea the notes name with one word. */
const PHRASES: [RegExp, string][] = [
  [/\b(make|makes|making|made) (things|stuff|facts|it) up\b|\bmade[- ]up\b|\bconfidently wrong\b/i, "hallucination"],
  [/\bhow (is|are) (it|they|llms?|models?) (built|made|structured)\b/i, "architecture"],
];

/** The words that say what a question is about, expanded with the words the notes use. */
export function topicTerms(q: string): string[] {
  const base = tokenize(q).filter((t) => t.length > 2 && !QUESTION_WORDS.has(t) && !FILLER.has(t));
  for (const [re, word] of PHRASES) if (re.test(q)) base.push(word);
  return [...new Set(base.flatMap((t) => [t, ...(EXPAND[t] ?? [])]))];
}

/**
 * Follow-ups like "explain its architecture" or "show me how it works" name no topic of their
 * own. Returns the earlier question to carry the topic over from, or null for a fresh question.
 */
export function followUpContext(question: string, previous: string | null): string | null {
  if (!previous) return null;
  const own = tokenize(question).filter((t) => t.length > 2 && !QUESTION_WORDS.has(t) && !FILLER.has(t));
  const vague = own.every((t) => EXPAND[t] && ["architecture", "structure", "built", "inside", "internals", "parts", "components"].includes(t));
  return own.length === 0 || vague || (PRONOUN.test(question) && own.length < 3) ? previous : null;
}

interface Chunk {
  head: string;
  body: string;
  source: Source;
  /** Guided lesson module, when the chunk is a lesson section. */
  module?: string;
  /** Order within its source, so steps come out in sequence. */
  order: number;
  group: string;
}

let CHUNKS: Chunk[] | null = null;
function chunks(): Chunk[] {
  if (CHUNKS) return CHUNKS;
  const out: Chunk[] = [];
  for (const l of guidedLessons) {
    const m = moduleById.get(l.module);
    if (!m) continue;
    l.sections.forEach((s, i) =>
      out.push({
        head: `${m.title} ${s.heading} ${s.ask}`,
        body: s.body.replace(/\*\*/g, ""),
        source: { title: m.title, route: `/learn/${m.id}` },
        module: m.id,
        order: i,
        group: `lesson:${m.id}`,
      }),
    );
  }
  for (const q of quests)
    q.steps.forEach((st, i) =>
      out.push({ head: `${q.title} ${st.title} ${st.ask}`, body: st.notes, source: { title: q.title, route: "" }, order: i, group: `quest:${q.id}` }),
    );
  return (CHUNKS = out);
}

const rootOf = (t: string) => (t.length > 4 ? t.slice(0, -1) : t);

let DF: Map<string, number> | null = null;
/** How rare a word is across the notes: rare words ("electricity") say more than common ones ("model"). */
function idf(root: string): number {
  DF ??= new Map();
  let df = DF.get(root);
  if (df === undefined) {
    df = chunks().filter((c) => c.head.toLowerCase().includes(root) || c.body.toLowerCase().includes(root)).length;
    DF.set(root, df);
  }
  return Math.log(1 + chunks().length / (df + 1));
}

/** Terms with weights: the question's own words count fully, carried-over ones half. */
type Weighted = { root: string; w: number }[];

function chunkScore(terms: Weighted, c: Chunk): number {
  const head = c.head.toLowerCase();
  const body = c.body.toLowerCase();
  let s = 0;
  let matched = 0;
  let inHead = false;
  let total = 0;
  for (const { root, w } of terms) {
    const weight = w * idf(root);
    total += weight;
    if (head.includes(root)) {
      s += 3 * weight;
      inHead = true;
    } else if (body.includes(root)) s += weight;
    else continue;
    matched++;
  }
  // One shared body word isn't a match: "prompt engineering" once pulled in the energy-per-prompt notes.
  if (matched === 1 && terms.length > 1 && !inHead) return 0;
  return total ? s / Math.sqrt(total) : 0;
}

/**
 * Grounding for free chat. Searches every guided lesson section and quest step, keeps the few
 * that clearly match, and returns them in reading order so "how does it work" gets the steps in
 * sequence. `prefer` is the lesson the student is reading, which wins ties.
 */
export function ground(question: string, { prefer, context }: { prefer?: string; context?: string | null } = {}): Grounding {
  const hits = searchSite(context ? `${context} ${question}` : question, 8);
  const lessonHits = hits.filter((h) => h.kind === "lesson");
  const topLesson = lessonHits[0] ? moduleById.get(lessonHits[0].id) ?? null : null;
  const own = topicTerms(question);
  const carried = context ? topicTerms(context).filter((t) => !own.includes(t)) : [];
  const terms: Weighted = [...own.map((t) => ({ root: rootOf(t), w: 1 })), ...carried.map((t) => ({ root: rootOf(t), w: 0.5 }))];

  const scored = terms.length
    ? chunks()
        .map((c) => {
          let s = chunkScore(terms, c);
          if (s && c.module && c.module === topLesson?.id) s *= 1.15;
          if (s && c.module && c.module === prefer) s *= 1.3;
          return { c, s };
        })
        .filter((x) => x.s >= 2)
        .sort((a, b) => b.s - a.s)
    : [];

  let picked: Chunk[] = [];
  if (scored.length) {
    const best = scored[0].s;
    // Chunks from the best source first, then close runners-up from elsewhere.
    const lead = scored[0].c.group;
    // Another source has to be nearly as relevant: a weak match adds noise, not help.
    const pool = scored.filter((x) => x.s >= best * (x.c.group === lead ? 0.55 : 0.6));
    picked = [...pool.filter((x) => x.c.group === lead), ...pool.filter((x) => x.c.group !== lead)].slice(0, 3).map((x) => x.c);
  } else if (prefer && !terms.length) {
    // A vague question on a lesson page ("explain this") is about that lesson.
    const l = guidedLessons.find((g) => g.module === prefer);
    const m = moduleById.get(prefer);
    if (l && m) picked = l.sections.slice(0, 2).map((s, i) => ({ head: s.heading, body: s.body.replace(/\*\*/g, ""), source: { title: m.title, route: `/learn/${m.id}` }, module: m.id, order: i, group: `lesson:${m.id}` }));
  }

  // Reading order: group by source, then position within it.
  const groups = [...new Set(picked.map((c) => c.group))];
  picked.sort((a, b) => groups.indexOf(a.group) - groups.indexOf(b.group) || a.order - b.order);

  const parts: string[] = [];
  const sources: Source[] = [];
  if (picked.length) {
    const per = Math.floor(LIMITS.notes / picked.length) - 4;
    for (const c of picked) {
      parts.push(clip(`${headOf(c)}: ${c.body}`, per));
      if (!sources.some((x) => x.title === c.source.title)) sources.push(c.source);
    }
  } else if (topLesson) {
    parts.push(lessonNotes(topLesson, LIMITS.notes));
    sources.push({ title: topLesson.title, route: `/learn/${topLesson.id}` });
  }

  const lessonId = picked.find((c) => c.module)?.module;
  const modules = [...new Set([...picked.map((c) => c.module ?? quests.find((q) => `quest:${q.id}` === c.group)?.lesson), topLesson?.id])].filter(
    (m): m is string => !!m && moduleById.has(m),
  );
  return {
    notes: parts.join("\n\n").slice(0, LIMITS.notes),
    sources,
    related: hits.slice(0, 3),
    lesson: (lessonId ? moduleById.get(lessonId) : null) ?? topLesson,
    modules,
  };
}

/** A chunk's own heading, without the lesson title and question it's indexed under. */
function headOf(c: Chunk): string {
  if (c.module) {
    const l = guidedLessons.find((g) => g.module === c.module);
    return l?.sections[c.order]?.heading ?? c.source.title;
  }
  const q = quests.find((x) => `quest:${x.id}` === c.group);
  return q?.steps[c.order]?.title ?? c.source.title;
}

export const moduleNotes = (id: string) => {
  const m = moduleById.get(id);
  return m ? lessonNotes(m, LIMITS.notes) : "";
};

export const toolNotesById = (id: string) => {
  const t = toolById.get(id);
  return t ? toolNotes(t) : "";
};
