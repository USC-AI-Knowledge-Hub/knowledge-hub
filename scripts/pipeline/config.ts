/**
 * Pipeline settings. Tools, their search queries and match patterns live in
 * src/data/tools.ts; learning topics live in src/data/topics.ts.
 */

/**
 * Channels we trust to teach well. They get a small ranking boost, and in RSS
 * mode (no API key) they are the only source. Handles are resolved to channel
 * IDs at run time and cached in channels.lock.json.
 */
export const TRUSTED_CHANNELS: { handle: string; kind: "official" | "educator" }[] = [
  { handle: "OpenAI", kind: "official" },
  { handle: "anthropic-ai", kind: "official" },
  { handle: "GoogleDeepMind", kind: "official" },
  { handle: "googleworkspace", kind: "official" },
  { handle: "GitHub", kind: "official" },
  { handle: "3blue1brown", kind: "educator" },
  { handle: "AndrejKarpathy", kind: "educator" },
  { handle: "freecodecamp", kind: "educator" },
  { handle: "IBMTechnology", kind: "educator" },
  { handle: "JeffSu", kind: "educator" },
  { handle: "KevinStratvert", kind: "educator" },
  { handle: "TinaHuang1", kind: "educator" },
  { handle: "TwoMinutePapers", kind: "educator" },
  { handle: "mreflow", kind: "educator" },
];

/**
 * Extra searches (API mode) for lessons that aren't about one tool.
 * Each costs 100 quota units a day.
 */
export const TOPIC_QUERIES = [
  "prompt engineering tutorial",
  "AI agents explained",
  "how large language models work",
  "RAG explained",
  "AI hallucinations explained",
  "AI for teachers tutorial",
  "AI literature review tutorial",
];

export const SETTINGS = {
  /** Only consider videos published in the last N days on search. */
  searchWindowDays: 30,
  /** Results requested per search query (max 50). Each search costs 100 quota units. */
  resultsPerQuery: 15,
  /** Drop videos from the feed once they were first seen this many days ago. */
  retentionDays: 120,
  /** Keep at most this many videos per tool × difficulty cell. */
  perCell: 15,
  /** Keep at most this many videos that match a topic but no tool. */
  topicOnlyCap: 60,
  /** Duration bounds, seconds. Shorts and marathon streams are out. */
  minDuration: 150,
  maxDuration: 4 * 60 * 60,
  /** Minimum views for non-trusted channels, scaled down for very new uploads. */
  minViews: 1000,
  minViewsFresh: 150,
  /** Claude classification batch size. */
  claudeBatch: 20,
};
