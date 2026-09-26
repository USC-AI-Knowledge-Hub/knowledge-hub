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

/** "What are you trying to do?" — the Tool Finder's first question. */
export type Task =
  | "write" | "research" | "analyze" | "present" | "image"
  | "video" | "audio" | "code" | "study" | "teach" | "automate";

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
}

export interface VideoFeed {
  generatedAt: string | null;
  runDate: string | null;
  mode: "api" | "rss" | "none";
  classifier: "claude" | "heuristic";
  stats: { candidates: number; kept: number; added: number };
  videos: Video[];
}
