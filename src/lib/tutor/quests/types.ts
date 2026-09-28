/**
 * Quest types and shared constants. Kept apart from the quest content so the
 * level files can import them without a circular import through quests.ts.
 *
 * Step kinds:
 *  - "learn": ask → tutor answers from notes → a check drawn from `checks`.
 *  - "dojo":  the student writes a prompt for one of `tasks` (rotated); it's
 *             scored against the rubric in code, the tutor critiques it, then
 *             that task's check.
 *  - "spot":  the student reads an AI answer with one planted error and picks
 *             the wrong claim (the check's options are the claims, shown in a
 *             random order); the tutor then explains how to catch it.
 */

export interface Check {
  question: string;
  options: string[];
  /** Index of the one correct option. */
  answer: number;
  /** Shown after answering, right or wrong. */
  explain: string;
}

interface StepBase {
  id: string;
  title: string;
  /** The question the tutor answers, phrased as the student would ask it. */
  ask: string;
  /** Facts the tutor must stick to. Plain sentences; also shown as the reading card. */
  notes: string;
}

export interface LearnStep extends StepBase {
  kind: "learn";
  /** Different questions on the same idea. One is drawn each time the step is shown. */
  checks: Check[];
}

export interface DojoTask {
  /** What the student's prompt should get an AI to do. */
  task: string;
  /** A stronger prompt for the same task, shown after the critique. */
  stronger: string;
  /** A question about the stronger prompt. */
  check: Check;
}

export interface DojoStep extends StepBase {
  kind: "dojo";
  /** Tasks rotated between visits. */
  tasks: DojoTask[];
}

export interface SpotStep extends StepBase {
  kind: "spot";
  /** What someone asked the AI. */
  question: string;
  /** The AI's answer. Its claims are the options; `answer` is the planted error. */
  check: Check;
}

export type QuestStep = LearnStep | DojoStep | SpotStep;

export type BadgeShape = "cookie9" | "clover4" | "cookie6" | "sunny" | "cookie4" | "soft12";

export interface Quest {
  id: string;
  title: string;
  blurb: string;
  /** Material Symbols name for the badge. */
  icon: string;
  /** Shape from src/lib/shapes.ts for the badge. */
  shape: BadgeShape;
  /** A lesson to continue with afterwards. */
  lesson: string;
  steps: QuestStep[];
}

export const XP_FIRST_TRY = 10;
export const XP_RETRY = 5;
export const XP_QUEST_BONUS = 25;
/** Daily review: per correct answer, and for finishing a session. Once a day. */
export const XP_REVIEW = 2;
export const XP_REVIEW_BONUS = 5;

/** The dojo rubric. Also used to score a student's prompt in code (see rubric.ts). */
export const RUBRIC = [
  { id: "context", label: "Role or context", hint: "Say who you are, who it's for, or what it needs to know." },
  { id: "task", label: "Task", hint: "Name the exact job with a clear verb." },
  { id: "format", label: "Format", hint: "Describe the output: a table, five bullets, 150 words." },
  { id: "constraints", label: "Constraints", hint: "Say what to avoid or stick to: level, tone, sources." },
  { id: "examples", label: "Examples", hint: "Show a sample of what good looks like." },
] as const;

export type RubricId = (typeof RUBRIC)[number]["id"];

export const RUBRIC_NOTES =
  "A strong prompt usually covers five things. Role or context: who you are, who the output is for, and background the model can't guess. Task: the exact job, with a clear verb. Format: the shape of the output, such as a table, five bullets or 150 words. Constraints: what to avoid or stick to, the level, the tone. Examples: a short sample of what good looks like. Not every prompt needs all five, but missing context and missing format cause most weak answers.";

/** Shorthand for a check whose first option is the right one. Options are shuffled when shown. */
export function mc(question: string, options: string[], explain: string): Check {
  return { question, options, answer: 0, explain };
}
