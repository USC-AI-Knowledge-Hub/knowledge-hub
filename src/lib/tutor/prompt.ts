/**
 * Prompt assembly for small on-device models. They follow short instructions
 * well and long ones badly, so: one short system prompt, the notes they must
 * stick to, the last few turns, and hard character limits on each part.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const LIMITS = {
  // Tiny models get lost in long context: keep only the notes that clearly match.
  notes: 1200,
  turn: 500,
  turns: 6,
  question: 800,
  /** Whole prompt. About 1,300 tokens, well inside every model's context window. */
  total: 5200,
} as const;

export const GENERATION = { maxNewTokens: 256, temperature: 0.4, topP: 0.9, repetitionPenalty: 1.15 } as const;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Small models sometimes fall into a loop, repeating one sentence until they run out of
 * tokens. Cuts the text at the first repeat of a sentence already said, so the student sees
 * the useful part once, and reports it so generation can stop early.
 */
export function trimRepetition(text: string): { text: string; looping: boolean } {
  const seen = new Set<string>();
  const re = /[^.!?\n]+[.!?]?(\s+|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const sentence = norm(m[0]);
    if (sentence.length < 12) continue;
    // Only a finished sentence can count as a repeat; the last one may still be streaming.
    const finished = /[.!?\n]/.test(m[0]) || re.lastIndex < text.length;
    if (seen.has(sentence) && finished) return { text: text.slice(0, m.index).trimEnd(), looping: true };
    if (finished) seen.add(sentence);
  }
  return { text, looping: false };
}

const BASE =
  "You are the AI tutor on USC's AI Knowledge Hub. You help students understand AI. Use plain language. Base every fact on the notes below; never invent numbers, names, dates or sources.";

export type Mode = "answer" | "quest" | "critique" | "quiz" | "simpler" | "tool" | "frame";

const TASKS: Record<Mode, string> = {
  answer:
    "Answer in under 120 words. If the notes don't cover the question, say that in one sentence and suggest the lesson named in the notes.",
  quest: "Explain the answer to the student's question in under 110 words, like a friendly tutor. Use one concrete example. Don't quiz them.",
  critique:
    "The student wrote a prompt for the task in the notes. In under 110 words: say what works, then the one or two most useful improvements, using the rubric. Don't rewrite the whole prompt.",
  quiz: "Write 3 short quiz questions about the lesson, numbered 1 to 3. Then a line that says Answers, then the three answers, each one sentence.",
  simpler: "Explain the lesson to a first-year student in under 100 words, using an everyday comparison.",
  tool: "Using only the tool profile in the notes, say in under 100 words when to use this tool and when to pick something else.",
  frame: "In one sentence of under 30 words, tell the student which of the listed tools to try first and why. Only mention tools in the notes.",
};

export function clip(text: string, max: number): string {
  const t = text.replace(/[ \t]+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return `${cut.slice(0, end > max * 0.5 ? end + (cut[end] === "." ? 1 : 0) : max - 1).trimEnd()}…`;
}

export function systemPrompt(mode: Mode, notes: string): string {
  return `${BASE} ${TASKS[mode]}\n\nNotes:\n${clip(notes, LIMITS.notes) || "(none)"}`;
}

/**
 * Builds the message list. History is trimmed from the oldest end until the
 * whole prompt fits in LIMITS.total.
 */
export function buildMessages(mode: Mode, notes: string, question: string, history: ChatMessage[] = []): ChatMessage[] {
  const system: ChatMessage = { role: "system", content: systemPrompt(mode, notes) };
  const user: ChatMessage = { role: "user", content: clip(question, LIMITS.question) };
  const turns = history
    .filter((m) => m.role !== "system" && m.content.trim())
    .slice(-LIMITS.turns)
    .map((m) => ({ role: m.role, content: clip(stripThink(m.content), LIMITS.turn) }));
  const size = (ms: ChatMessage[]) => ms.reduce((n, m) => n + m.content.length, 0);
  while (turns.length && size([system, ...turns, user]) > LIMITS.total) turns.shift();
  // Chat templates expect user/assistant alternation starting with a user turn.
  while (turns.length && turns[0].role !== "user") turns.shift();
  return [system, ...turns, user];
}

/**
 * Removes reasoning blocks. Qwen3 is asked not to think, but this is cheap
 * insurance: complete <think>…</think> blocks, an unclosed block still
 * streaming, and a stray closing tag whose opening was in the prompt.
 */
export function stripThink(text: string): string {
  let t = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const open = t.indexOf("<think>");
  if (open >= 0) t = t.slice(0, open);
  const close = t.lastIndexOf("</think>");
  if (close >= 0) t = t.slice(close + "</think>".length);
  return t.replace(/^\s+/, "");
}
