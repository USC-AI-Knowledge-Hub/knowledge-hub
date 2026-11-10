/**
 * Using AI in coursework: what's usually fine, how to disclose it and how to cite it, and a syllabus
 * statement builder for instructors. Everything here is general guidance, not USC policy: the course's own
 * rules always win. The citation builders follow the style guides as they stood on STYLE_CHECKED; the guides
 * change, so each result links to the official page.
 */

/** When the citation formats below were last checked against the official guidance. */
export const STYLE_CHECKED = "2026-11-07";

// ── Can I use AI for this? ────────────────────────────────────────────────

export type Stance = "unknown" | "open" | "disclose" | "limited" | "none";

export const STANCES: { id: Stance; label: string; hint: string }[] = [
  { id: "unknown", label: "I don't know", hint: "The syllabus doesn't say, or I haven't checked." },
  { id: "open", label: "AI is allowed", hint: "The instructor allows AI tools for this work." },
  { id: "disclose", label: "Allowed if I say so", hint: "AI is allowed as long as I disclose how I used it." },
  { id: "limited", label: "Only some uses", hint: "The instructor named a few things AI is OK for." },
  { id: "none", label: "AI is not allowed", hint: "The instructor says no AI for this work." },
];

export type Verdict = "fine" | "check" | "no";

export interface Use {
  id: string;
  label: string;
  /** Plain advice that holds whatever the stance. */
  advice: string;
  /** How risky it is by default, on a scale of 0 (studying) to 3 (handing in AI's work). */
  weight: 0 | 1 | 2 | 3;
}

export const USES: Use[] = [
  { id: "explain", label: "Have a concept explained to me", advice: "Good for understanding. Check anything important against your course materials, because AI can sound sure and be wrong.", weight: 0 },
  { id: "quiz", label: "Quiz myself on material I'm studying", advice: "A good use. Make sure the questions match what your course covers.", weight: 0 },
  { id: "summarize", label: "Summarize a reading", advice: "Fine for review, but read the source yourself before you cite or rely on it. Summaries leave things out and sometimes invent them.", weight: 1 },
  { id: "brainstorm", label: "Brainstorm ideas or an outline", advice: "Fine where AI is allowed. The ideas you choose and develop should be yours; mention it if it shaped your work.", weight: 1 },
  { id: "feedback", label: "Get feedback on a draft I wrote", advice: "Fine where AI is allowed. You decide which changes to make, and the writing stays yours.", weight: 1 },
  { id: "proofread", label: "Proofread or fix grammar", advice: "Often allowed, but some instructors count heavy rewriting as AI-written work. Disclose it if the changes are more than small fixes.", weight: 1 },
  { id: "code", label: "Write or debug code", advice: "Rules differ a lot between courses. If it's allowed, make sure you understand every line, and say you used it.", weight: 2 },
  { id: "draft", label: "Write text I'll hand in", advice: "Only with clear permission, and disclose it. Handing in AI-written work as your own is the clearest way to get into trouble.", weight: 3 },
  { id: "graded", label: "Answer a quiz, exam or graded question", advice: "Don't, unless the instructor has said you may in so many words.", weight: 3 },
];

/**
 * Whether a use is likely fine, worth checking first, or a no. The course's rules decide: this only
 * says how much to worry when they're unclear, and what a stance changes.
 */
export function verdictFor(use: Use, stance: Stance): { verdict: Verdict; why: string } {
  const w = use.weight;
  if (stance === "none") {
    return { verdict: "no", why: "The instructor said no AI for this work, so don't use it for this, even for something that seems harmless. If you're unsure whether studying with it counts, ask." };
  }
  if (stance === "unknown") {
    if (w === 0) return { verdict: "fine", why: "Studying with AI usually isn't a problem, but you still haven't checked the rules. Look at the syllabus or ask." };
    if (w === 3) return { verdict: "no", why: "Without clear permission, don't. Ask your instructor first." };
    return { verdict: "check", why: "The rules aren't clear to you yet. Check the syllabus or ask before you use it for graded work." };
  }
  if (stance === "limited") {
    if (w === 0) return { verdict: "fine", why: "Learning uses are the least likely to be restricted, but check that the named uses cover it." };
    if (w === 3) return { verdict: "no", why: "Handing in AI's work, or using it on graded questions, is very unlikely to be among the allowed uses." };
    return { verdict: "check", why: "Only the uses your instructor named are OK. If this isn't one of them, ask first." };
  }
  if (stance === "disclose") {
    if (w === 3) return { verdict: "check", why: "Allowed if you disclose, but make sure that covers writing you hand in, and keep your own thinking in it." };
    return { verdict: "fine", why: "Fine, as long as you say how you used it." };
  }
  // open
  if (w === 3 && use.id === "graded") return { verdict: "check", why: "Even where AI is allowed, quizzes and exams often have their own rules. Confirm this one." };
  return { verdict: "fine", why: w >= 2 ? "Allowed, but you're still responsible for the result: understand it and check it." : "Allowed. Check what it gives you before you rely on it." };
}

export const VERDICT_LABEL: Record<Verdict, string> = { fine: "Usually fine", check: "Check first", no: "Don't" };

// ── Disclosure and citation ───────────────────────────────────────────────

export const PURPOSES = [
  "brainstorm ideas",
  "understand a concept",
  "get feedback on my draft",
  "proofread my writing",
  "draft text that I then rewrote",
  "write or debug code",
  "summarize a reading",
] as const;

export interface Disclosure {
  tool: string;
  company: string;
  date: string;
  purposes: string[];
  changed: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MLA_MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

/** Splits "2025-08-21" without time zones getting in the way. Null when it isn't a date. */
export function parts(date: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? { y, m: mo, d } : null;
}

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

/** A short statement for the end of an assignment. */
export function disclosure(i: Disclosure): string {
  const p = parts(i.date);
  const tool = i.tool.trim() || "[AI tool]";
  const company = i.company.trim();
  const when = p ? ` on ${MONTHS[p.m - 1]} ${p.d}, ${p.y}` : "";
  const uses = i.purposes.length ? list(i.purposes) : "[what you used it for]";
  const changed = i.changed.trim();
  return [
    `I used ${tool}${company ? ` (${company})` : ""}${when} to ${uses}.`,
    changed ? `${changed.replace(/\.?$/, ".")}` : "I reviewed what it produced, changed what I needed to, and checked its claims.",
    "The final work, and any mistakes in it, are my own.",
  ].join(" ");
}

export interface Citation {
  tool: string;
  company: string;
  /** The date of the chat, YYYY-MM-DD. */
  date: string;
  /** What you called the chat, for APA. */
  title: string;
  prompt: string;
  url: string;
  /** For MLA, e.g. "GPT-5". */
  version: string;
}

const clean = (s: string) => s.trim().replace(/\s+/g, " ");
const noScheme = (u: string) => u.trim().replace(/^https?:\/\//, "");

/** APA 7, in the format APA published in September 2025 (a specific chat is treated as a retrievable source). */
export function apa(c: Citation): { reference: string; inText: string } {
  const p = parts(c.date);
  const date = p ? `${p.y}, ${MONTHS[p.m - 1]} ${p.d}` : "[year, month day]";
  const title = clean(c.title) || "[Title of the chat]";
  const company = clean(c.company) || "[AI company]";
  return {
    reference: `${company}. (${date}). ${title} [Generative AI chat]. ${clean(c.tool) || "[Tool]"}.${c.url.trim() ? ` ${c.url.trim()}` : ""}`,
    inText: `(${company}, ${p ? p.y : "[year]"})`,
  };
}

/** MLA 9: the prompt is the title, the tool is the container, and the AI is not an author. */
export function mla(c: Citation): { entry: string; inText: string } {
  const p = parts(c.date);
  const prompt = clean(c.prompt) || "[Prompt]";
  const tool = clean(c.tool) || "[Tool]";
  const version = clean(c.version);
  const date = p ? `${p.d} ${MLA_MONTHS[p.m - 1]} ${p.y}` : "[day month year]";
  const url = noScheme(c.url);
  return {
    entry: `“${prompt}” prompt. ${tool}${version ? `, ${version}` : ""}, ${clean(c.company) || "[Developer]"}, ${date}${url ? `, ${url}` : ""}.`,
    inText: `(“${prompt.split(" ").slice(0, 4).join(" ")}${prompt.split(" ").length > 4 ? "…" : ""}”)`,
  };
}

/** Chicago, as a footnote. Chicago usually leaves generative AI out of the bibliography. */
export function chicago(c: Citation, withPrompt: boolean): string {
  const p = parts(c.date);
  const date = p ? `${MONTHS[p.m - 1]} ${p.d}, ${p.y}` : "[Month day, year]";
  const prompt = clean(c.prompt);
  const note = `Text generated by ${clean(c.tool) || "[Tool]"}, ${clean(c.company) || "[Developer]"}, ${date}${c.url.trim() ? `, ${c.url.trim()}` : ""}.`;
  return withPrompt && prompt ? `${note} Prompt: “${prompt.length > 160 ? `${prompt.slice(0, 160)}…` : prompt}”` : note;
}

export const STYLE_LINKS = {
  apa: "https://apastyle.apa.org/blog/cite-generative-ai-references",
  mla: "https://style.mla.org/citing-generative-ai/",
  chicago: "https://www.chicagomanualofstyle.org/",
  usc: "https://libguides.usc.edu/generative-AI/citing-generative-ai",
} as const;

// ── For instructors: a syllabus statement ─────────────────────────────────

export type PolicyStance = "none" | "limited" | "disclose" | "open";

export const POLICY_STANCES: { id: PolicyStance; label: string; hint: string }[] = [
  { id: "none", label: "No AI on graded work", hint: "Students don't use generative AI for any graded work." },
  { id: "limited", label: "Some uses only", hint: "You name the uses that are OK; everything else is off." },
  { id: "disclose", label: "Allowed, with disclosure", hint: "Students may use AI if they say how." },
  { id: "open", label: "Open, with judgment", hint: "AI is part of the course; students are responsible for the result." },
];

export const POLICY_USES = [
  "explaining concepts and answering questions while studying",
  "brainstorming ideas and outlines",
  "getting feedback on a draft the student wrote",
  "proofreading and grammar checks",
  "writing and debugging code",
  "summarizing readings (the student still reads the source)",
] as const;

export interface PolicyInput {
  stance: PolicyStance;
  /** Indices into POLICY_USES, for the "some uses" and "disclose" stances. */
  uses: string[];
  /** Whether the statement asks students to disclose use. Always on for "disclose". */
  disclose: boolean;
  /** Anything extra, e.g. "Exams are closed to AI." */
  extra: string;
}

/** A syllabus statement to start from. It is a draft: instructors should adapt it and check it against department and university policy. */
export function syllabusStatement(p: PolicyInput): string {
  const uses = p.uses.length ? list(p.uses) : "[the uses you allow]";
  const disclose = p.stance === "disclose" || p.disclose;
  const lines: string[] = ["Generative AI in this course"];
  if (p.stance === "none") {
    lines.push(
      "Please do not use generative AI tools, such as ChatGPT, Claude or Gemini, to produce or edit any work you submit for a grade in this course. I want to see your own thinking and writing. If you aren't sure whether a tool counts, ask me before you use it.",
    );
  } else if (p.stance === "limited") {
    lines.push(
      `You may use generative AI tools for ${uses}. Please don't use them for anything else in this course, including producing text, code or answers that you submit as your own. If you aren't sure whether a use is allowed, ask me before you do it.`,
    );
  } else if (p.stance === "disclose") {
    lines.push(
      `You may use generative AI tools in this course${p.uses.length ? `, for example for ${uses}` : ""}. You are responsible for everything you submit: check what the tool gives you, because it can be wrong, and make sure the work reflects your own understanding.`,
    );
  } else {
    lines.push(
      "Generative AI tools are part of how this course works, and you are encouraged to use them. You are responsible for everything you submit: check what a tool gives you, because it can be wrong, and make sure the work reflects your own understanding. Use judgment about what you share with these tools, and never enter private or sensitive information.",
    );
  }
  if (disclose) lines.push("When you use AI on work you submit, add a short note saying which tool you used, what you used it for, and what you changed or checked.");
  if (p.stance !== "none" && p.stance !== "open") lines.push("Please don't enter private or sensitive information into AI tools.");
  if (p.extra.trim()) lines.push(p.extra.trim());
  lines.push("If you have questions about this policy, ask me. It's easier to talk about it early than to sort it out after something is submitted.");
  return lines.join("\n\n");
}
