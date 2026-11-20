import type { Talk, TalkKind } from "./types";

/**
 * Editors' picks among talks and podcasts: stage talks, debates, conference keynotes and long interviews
 * worth watching whole. The daily run adds more on its own from trusted talk and podcast channels
 * (TALK_CHANNELS in scripts/pipeline/config.ts); those are labelled as picked automatically.
 *
 * Only talks published since CONTENT_SINCE (src/data/since.ts) belong here; the Hub keeps to recent material.
 *
 * Rules for adding one:
 * - Published since CONTENT_SINCE (a test checks `year`).
 * - An editor has watched it.
 * - Only the original publisher's channel (TED, not a re-upload; the podcast's
 *   own channel, not a clips channel). `channel` must match YouTube exactly:
 *   `npm run courses` checks every talk and fails CI on a mismatch.
 * - Balance: researchers and critics as well as company leaders, and more than
 *   one view on risk. No hype or clickbait.
 * - `minutes` is an estimate; the daily check replaces it with the real length.
 */
export const talks: Talk[] = [
  {
    id: "code-with-claude-2026",
    video: "GMIWm5y90xA",
    title: "Code with Claude 2026: opening keynote",
    channel: "Claude",
    speakers: ["Anthropic product and engineering leaders"],
    kind: "keynote",
    year: 2026,
    minutes: 45,
    summary: "Anthropic's developer conference keynote on Claude Code and building agents, with a candid look at how its own engineers now work.",
    modules: ["coding", "agents"],
    tags: ["developers", "Claude", "agents"],
  },
];

export const TALK_KINDS: TalkKind[] = ["talk", "debate", "keynote", "podcast"];

export const talkById = new Map(talks.map((t) => [t.id, t]));

/** Talks related to a Learn module, in catalog order. */
export const talksFor = (moduleId: string) => talks.filter((t) => t.modules.includes(moduleId));
