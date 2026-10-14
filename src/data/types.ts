export type Difficulty = "beginner" | "intermediate" | "advanced";
export const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  beginner: "No experience needed. You'll finish with something working.",
  intermediate: "You use the tool already and want better results, faster.",
  advanced: "APIs, agents, automation and building your own workflows.",
};

/**
 * A category in the tool finder ("What are you trying to do?"). The tree of categories lives in
 * categories.ts and public/data/taxonomy.json; a tool lists the ids it belongs to, most specific first.
 */
export type Task = string;

export type Cost = "free" | "freemium" | "paid";
export type UscAccess = "provided" | "check" | "personal";

export interface Tool {
  id: string;
  name: string;
  maker: string;
  url: string;
  /** Two letters for the shaped monogram. We don't reproduce vendor logos. */
  monogram: string;
  bestFor: string;
  tasks: Task[];
  /** How hard it is to get real value on day one. */
  difficulty: Difficulty;
  cost: Cost;
  usc: UscAccess;
  uscNote?: string;
  bestUses: string[];
  poorUses: string[];
  different: string;
  quickStart: string[];
  strengths: string[];
  weaknesses: string[];
  privacy: string;
  integrity: string;
  lastReviewed: string;
  nextReview: string;
  /** Pipeline: YouTube search queries (API mode) for this tool. */
  queries: string[];
  /** Pipeline: case-insensitive patterns that tag a video with this tool. */
  match: string[];
  /** Pipeline: patterns that veto a match (e.g. "claude code" for Claude). */
  exclude?: string[];
}

/** What every entry in the tool finder has, whether editors reviewed it or the discovery run found it. */
export type ToolCore = Pick<Tool, "id" | "name" | "maker" | "url" | "monogram" | "bestFor" | "tasks" | "queries" | "match" | "exclude">;

/** Where a discovered tool was mentioned. */
export interface Evidence {
  /** The feed's name, e.g. "Hugging Face blog". */
  source: string;
  title: string;
  url: string;
  date: string;
}

/**
 * A tool found automatically in trusted feeds (scripts/discovery) and listed in public/data/discovered.json.
 * Editors haven't reviewed it: the site says so wherever it shows one.
 */
export interface DiscoveredTool extends ToolCore {
  /** A product ("Higgsfield") or a model family ("Veo"). */
  kind: "tool" | "model";
  /** "site" when `url` is the product's own address; "announcement" when it's a post about it. */
  urlKind: "site" | "announcement";
  /** "feed": found by the daily run. "editor": added by hand to get it started. */
  origin: "feed" | "editor";
  firstSeen: string;
  lastSeen: string;
  evidence: Evidence[];
  /** Daily-run bookkeeping: checks in a row that found the product's own site down. */
  siteFailures?: number;
}

/** A catalog entry: a reviewed tool with a full profile, or a discovered one with the basics. */
export type CatalogTool = (Tool & { reviewed: true }) | (DiscoveredTool & { reviewed: false });

export type Track = "foundations" | "skills";

export interface CuratedVideo {
  id: string;
  title: string;
  channel: string;
  minutes: number;
}

/** Who made a course: a university, the company behind a tool, or an independent educator. */
export type CourseSource = "university" | "maker" | "educator";

/**
 * A full course on YouTube: a playlist, or one long single-video course.
 * Lesson counts and hours here are editor estimates; `npm run courses`
 * checks every course against YouTube and writes live numbers to
 * public/data/courses.json, which the app prefers when present.
 */
export interface Course {
  id: string;
  /** YouTube playlist ID. Set this or `video`. */
  playlist?: string;
  /** YouTube video ID, for a course published as one long video. */
  video?: string;
  title: string;
  /** The YouTube channel exactly as YouTube shows it. The checker compares against this. */
  channel: string;
  /** Short name for the institution or company, e.g. "Stanford". */
  org: string;
  source: CourseSource;
  lessons: number;
  hours: number;
  difficulty: Difficulty;
  summary: string;
  /** Who should take it, and what it assumes. */
  audience: string;
  /**
   * The playlist keeps adding each year's lectures (MIT 6.S191). Its live totals cover every
   * year, so the site shows the catalog's one-year lesson count and hours instead.
   */
  rolling?: boolean;
  /** Video ID used for the thumbnail, usually the first lesson. */
  cover?: string;
  /** Learn modules this course goes deeper on. */
  modules: string[];
  tools?: string[];
}

/** One entry in public/data/courses.json, written by `npm run courses`. */
export interface CourseCheck {
  ok: boolean;
  title?: string;
  channel?: string;
  lessons?: number;
  seconds?: number;
  cover?: string;
  problem?: string;
}

export interface CourseStatus {
  generatedAt: string;
  via: "api" | "oembed";
  courses: Record<string, CourseCheck>;
  /** Editors' picks in learn.ts, keyed by video ID. */
  curated: Record<string, CourseCheck>;
  /** Talks and podcasts in talks.ts, keyed by talk ID. Absent in files written before talks existed. */
  talks?: Record<string, CourseCheck>;
}

/** What kind of talk: a stage talk (TED and the like), a debate, a conference keynote or a podcast episode. */
export type TalkKind = "talk" | "debate" | "keynote" | "podcast";

/**
 * A talk, debate, keynote or podcast episode worth watching whole. Hand-picked
 * and evergreen, unlike the daily trends. Each is checked by `npm run courses`.
 */
export interface Talk {
  id: string;
  /** YouTube video ID. Set this or `playlist`. */
  video?: string;
  /** YouTube playlist ID, for a talk published in parts. */
  playlist?: string;
  title: string;
  /** The YouTube channel exactly as YouTube shows it: the original publisher's. */
  channel: string;
  speakers: string[];
  kind: TalkKind;
  year: number;
  /** Editor estimate; the check's live length wins when present. */
  minutes: number;
  /** One plain sentence on why it's worth the time. */
  summary: string;
  /** Learn modules it relates to. */
  modules: string[];
  tags: string[];
}

export interface Module {
  id: string;
  track: Track;
  title: string;
  minutes: number;
  difficulty: Difficulty;
  summary: string;
  what: string;
  why: string;
  keyIdeas: string[];
  tryIt: { title: string; steps: string[] };
  watchFor?: string;
  tools: string[];
  /** Topic id used by the pipeline to attach fresh videos to this module. */
  topic: string;
  curated: CuratedVideo[];
}

export interface PathStep {
  module: string;
  note: string;
}

export interface LearningPath {
  id: string;
  title: string;
  audience: string;
  summary: string;
  icon: string;
  steps: PathStep[];
}

/** One entry in public/data/videos.json, written by the daily pipeline. */
export interface Video {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  /** Seconds. 0 when the source didn't report one (RSS mode). */
  duration: number;
  views: number;
  likes?: number;
  tools: string[];
  topics: string[];
  difficulty: Difficulty;
  difficultySource: "claude" | "heuristic";
  summary?: string;
  score: number;
  /** YYYY-MM-DD of the pipeline run that first picked this video up. */
  firstSeen: string;
  /** Picked up by the evergreen search for a tool the library barely covered, so it may be older. */
  evergreen?: boolean;
}

/** What kind of trend video it is. Shown as a label; trends have no difficulty. */
export type TrendKind = "launch" | "research" | "talk" | "news";

/**
 * A news, launch, research or talk video: what's happening in AI, rather than
 * how to use it. Kept apart from lessons and dropped after a few weeks.
 */
export interface Trend {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  duration: number;
  views: number;
  likes?: number;
  kind: TrendKind;
  tools: string[];
  score: number;
  firstSeen: string;
}

export interface VideoFeed {
  generatedAt: string | null;
  runDate: string | null;
  mode: "api" | "rss" | "none";
  classifier: "claude" | "heuristic";
  stats: { candidates: number; kept: number; added: number; trends?: number };
  videos: Video[];
  /** AI news, launches, research and talks. Absent in feeds written before trends existed. */
  trends?: Trend[];
}
