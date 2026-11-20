import { CONTENT_SINCE } from "../../src/data/since";

export { CONTENT_SINCE };

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

/**
 * Searches (API mode) for what's new in AI. Results land in the trends feed,
 * not the lesson library. The hand-picked, evergreen talks live in src/data/talks.ts. Channel feeds from TRUSTED_CHANNELS supply most trends.
 */
export const TREND_QUERIES = [
  "AI news this week",
  "new AI model release",
  // Talks: conference sessions, debates and long interviews (3 searches, 300 units a day).
  "AI conference keynote",
  "AI debate",
  "AI podcast interview",
];

export const SETTINGS = {
  /** Only consider videos published in the last N days on search. */
  searchWindowDays: 30,
  /** Anything older is dropped, including old uploads that show up in channel feeds. */
  maxAgeDays: 60,
  /**
   * Fewest likes per view for a video to stay in (0.004 = 4 likes per 1,000 views, about the bottom 8% of the
   * library). Applied once a video has enough views for the ratio to mean something. Hidden like counts pass.
   */
  minLikeRatio: 0.004,
  likeRatioFromViews: 2000,
  /**
   * Comment sentiment (sentiment.ts): read this many top comments of each new video (1 quota unit each) and drop
   * videos whose comments lean negative. Videos with fewer comments than `minComments` are judged on views and likes.
   */
  commentsPerVideo: 20,
  maxCommentChecks: 200,
  minComments: 5,
  minSentiment: -0.15,
  /** Results requested per search query (max 50). Each search costs 100 quota units. */
  resultsPerQuery: 15,
  /**
   * Most searches per run. 82 searches is 8,200 of the default 10,000 daily
   * units, leaving room for the talk searches, videos.list, comments and the course check. With more
   * queries than this, the pipeline rotates through them day by day.
   */
  maxSearches: 82,
  /**
   * Of those, at most this many go to tools found by daily discovery (one query each), so a burst of new
   * tools can't crowd out the reviewed catalog. They rotate like the rest when there are more.
   */
  maxDiscoveredSearches: 12,
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
  /** Trends: only take videos this new, keep them this long, and cap the feed. */
  trendMaxAgeDays: 14,
  trendRetentionDays: 21,
  trendCap: 48,
  /** At most this many trends from one channel, so a daily news channel can't fill the feed. */
  trendPerChannel: 4,
  /** Claude classification batch size. */
  claudeBatch: 20,
  /**
   * Niche tools (SciSpace, ResearchRabbit) rarely get a 1,000-view tutorial in any 30-day
   * window, so they'd never show up. A tool with fewer than this many videos in the library
   * gets an evergreen search: tutorials from the past year, with a lower view floor.
   */
  sparseTool: 5,
  evergreenWindowDays: 365,
  evergreenMaxAgeDays: 730,
  evergreenMinViews: 300,
};

/**
 * Where talks and podcasts come from (the Talks and podcasts tab). The daily run reads each channel's feed for
 * free, and in API mode also searches `talkSearchesPerDay` of them (rotating, 100 units each) for AI episodes
 * published since CONTENT_SINCE. Only long videos about AI with strong views, likes and comments are kept, and
 * the page labels them as picked automatically. Handles are resolved at run time and cached in channels.lock.json.
 */
export const TALK_CHANNELS: { handle: string; kind: "talk" | "podcast" | "keynote" | "debate" }[] = [
  { handle: "TED", kind: "talk" },
  { handle: "TEDx", kind: "talk" },
  { handle: "lexfridman", kind: "podcast" },
  { handle: "DwarkeshPatel", kind: "podcast" },
  { handle: "NoPriorsPodcast", kind: "podcast" },
  { handle: "LatentSpacePod", kind: "podcast" },
  { handle: "CognitiveRevolutionPodcast", kind: "podcast" },
  { handle: "hardfork", kind: "podcast" },
  { handle: "a16z", kind: "podcast" },
  { handle: "ycombinator", kind: "talk" },
  { handle: "stanfordonline", kind: "talk" },
  { handle: "aiDotEngineer", kind: "keynote" },
];

export const TALK_SETTINGS = {
  /** Channel searches per day (API mode), rotating through TALK_CHANNELS. */
  talkSearchesPerDay: 6,
  resultsPerSearch: 10,
  /** Talks shorter than this are clips, not talks. */
  minDuration: 8 * 60,
  maxDuration: 5 * 60 * 60,
  /** Views needed, unless the episode is under a week old. */
  minViews: 5000,
  minViewsFresh: 500,
  /** Most talks kept, and most from one channel, so one prolific podcast can't fill the tab. */
  cap: 60,
  perChannel: 8,
};
