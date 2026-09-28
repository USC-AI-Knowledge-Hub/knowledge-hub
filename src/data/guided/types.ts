/**
 * Guided courses: each learning path becomes a course of units and lessons.
 * A lesson wraps one Learn module with teaching material: objectives, a
 * reading in short sections, a worked example, practice, a question bank
 * (checks draw from it at random) and a reflection. The on-device tutor
 * answers from the lesson's own sections, so it explains what the student is
 * reading rather than improvising.
 *
 * Text fields use a small Markdown subset: paragraphs separated by a blank
 * line, **bold**, and "- " bullet lines. Keep it plain and specific.
 */

export interface LessonSection {
  heading: string;
  /** 90–200 words. The tutor uses this as its notes when asked about the section. */
  body: string;
  /** A question a curious student would ask about this section, for the "Ask the tutor" button. */
  ask: string;
}

export interface LessonQuestion {
  /** Unique within the lesson. */
  id: string;
  prompt: string;
  /** Three or four options; exactly one correct. Order doesn't matter: the app shuffles them. */
  options: string[];
  /** Index of the correct option. */
  answer: number;
  /** One or two sentences shown after answering, right or wrong. */
  explain: string;
}

export interface LessonSource {
  title: string;
  url: string;
  /** e.g. "MIT", "CC BY 4.0", "CC BY-NC-SA 4.0", or "Original" for our own writing. */
  license: string;
  /** What we took from it, e.g. "Adapted the prompt anatomy". */
  note?: string;
}

export interface GuidedLesson {
  /** The Learn module this lesson teaches (src/data/learn.ts). */
  module: string;
  /** Three "You'll be able to…" outcomes, each starting with a verb. */
  objectives: string[];
  /** Three to five sections, read in order. */
  sections: LessonSection[];
  /** A concrete before/after or step-by-step example, 100–250 words. */
  example: { title: string; body: string };
  /** What the student should have at the end of the module's "Try it" activity. */
  deliverable: string;
  /** At least ten. Each check draws four at random. */
  questions: LessonQuestion[];
  /** An open question to write about; saved in the browser. */
  reflect: string;
  sources: LessonSource[];
}

export interface GuidedUnit {
  title: string;
  /** Two or three sentences: what this unit is for and how it builds on the last. */
  intro: string;
  /** Module IDs, in order. */
  modules: string[];
}

export interface GuidedPath {
  /** Path ID in src/data/learn.ts. */
  path: string;
  /** A short welcome: who it's for and how the course works. */
  welcome: string;
  /** Three to five "By the end you'll…" outcomes. */
  outcomes: string[];
  units: GuidedUnit[];
  /** A final project that uses what the course taught. */
  capstone: { title: string; brief: string; steps: string[]; checklist: string[] };
}

/** Questions in a check, and the score needed to pass it. */
export const CHECK_SIZE = 4;
export const CHECK_PASS = 3;
