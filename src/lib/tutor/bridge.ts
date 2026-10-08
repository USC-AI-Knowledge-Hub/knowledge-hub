/**
 * Lets any page hand the tutor a question with the notes to answer from, e.g.
 * "Ask the tutor about this section" in a guided lesson. The page calls
 * askTutor(); Tutor.tsx opens the sheet (loading it if needed) and TutorApp
 * takes the request from the queue once it's mounted.
 */

export interface TutorAsk {
  /** What the student sees as their message. */
  question: string;
  /** What the tutor answers from. Keep it to the relevant lesson text. */
  notes: string;
  /** Where the notes come from, shown under the answer. */
  source?: { title: string; route: string };
  /** Shown in place of a model answer when no model is loaded. */
  fallback?: { title: string; body: string };
  /** "answer" explains; "feedback" responds to something the student wrote. */
  mode?: "answer" | "feedback";
}

const EVENT = "kh-tutor-ask";
const queue: TutorAsk[] = [];

export function askTutor(ask: TutorAsk) {
  queue.push(ask);
  window.dispatchEvent(new Event(EVENT));
}

/** Takes every waiting request, oldest first. */
export function takeAsks(): TutorAsk[] {
  return queue.splice(0, queue.length);
}

export function onAsk(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

const OPEN_EVENT = "kh-tutor-open";

/** Opens the tutor with nothing asked, e.g. from the offline page. */
export function openTutor() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenTutor(cb: () => void): () => void {
  window.addEventListener(OPEN_EVENT, cb);
  return () => window.removeEventListener(OPEN_EVENT, cb);
}
