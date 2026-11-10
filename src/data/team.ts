/**
 * AI Team: the discussion boards. There is one board for each course in the three proficiency buckets,
 * and one general board for AI tools. Posts live on the site's own database (supabase/schema.sql, set up
 * as described in supabase/README.md); until a database is connected the boards work on each visitor's own
 * device, so nothing is shared. A board's id is stored with every post, so don't change one once it's in use.
 */

export interface Topic {
  id: string;
  label: string;
  icon: string;
  /** What the box asks for when this topic is picked. */
  hint: string;
}

/** What students post about on a course's board. */
export const COURSE_TOPICS: readonly Topic[] = [
  { id: "questions", label: "Questions", icon: "help", hint: "What are you stuck on or unsure about?" },
  { id: "learned", label: "What I learned", icon: "lightbulb", hint: "A takeaway worth sharing" },
  { id: "resources", label: "Resources", icon: "bookmark", hint: "A link, video or article that helped" },
  { id: "tips", label: "Study tips", icon: "checklist", hint: "How you worked through it" },
];

/** What students post about on the tools board. */
export const TOOL_TOPICS: readonly Topic[] = [
  { id: "videos", label: "Videos", icon: "smart_display", hint: "A video that helped you learn" },
  { id: "articles", label: "Articles", icon: "article", hint: "A guide, post or paper worth reading" },
  { id: "new", label: "New tools and features", icon: "new_releases", hint: "Something new a tool can do" },
  { id: "prompts", label: "Prompts and tips", icon: "lightbulb", hint: "A prompt or habit that works" },
  { id: "help", label: "Questions", icon: "help", hint: "Ask what worked for others" },
];

export const topicById = new Map<string, Topic>([...COURSE_TOPICS, ...TOOL_TOPICS].map((t) => [t.id, t]));

import { BUCKETS, BUCKET_COURSES, type Bucket } from "./buckets";

export { BUCKETS };
export type { Bucket };

export interface BoardDef {
  id: string;
  kind: "tools" | "course";
  title: string;
  /** Who runs the course. */
  provider?: string;
  bucket?: Bucket["id"];
  /** The course's own page. Course pages can change, so students are told to check them. */
  url?: string;
  topics: readonly Topic[];
}

export const TOOLS_BOARD: BoardDef = { id: "tools", kind: "tools", title: "AI tools", topics: TOOL_TOPICS };

/** One board per course in the three buckets (the course list is in buckets.ts). */
export const COURSE_BOARDS: readonly BoardDef[] = BUCKET_COURSES.map((c) => ({
  id: c.id,
  kind: "course" as const,
  title: c.title,
  provider: c.provider,
  bucket: c.bucket,
  url: c.url,
  topics: COURSE_TOPICS,
}));

export const BOARDS: readonly BoardDef[] = [TOOLS_BOARD, ...COURSE_BOARDS];
export const boardById = new Map(BOARDS.map((b) => [b.id, b]));

/** A board from an address's `board` value, or null when it isn't one. */
export const boardFor = (id: string | null): BoardDef | null => (id ? (boardById.get(id) ?? null) : null);

/**
 * Where posts are shared, set when the site is built from repository variables. Firebase (FIREBASE_API_KEY and
 * FIREBASE_PROJECT_ID, see firebase/README.md) is used when it's set; the older Supabase database (BOARD_URL and
 * BOARD_ANON_KEY) otherwise. With neither, posts stay on each visitor's device.
 */
export const DATABASE = {
  url: (import.meta.env.VITE_BOARD_URL as string | undefined) ?? "",
  anonKey: (import.meta.env.VITE_BOARD_KEY as string | undefined) ?? "",
  firebase: {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) ?? "",
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? "",
    /** For testing a build against the local emulators: "127.0.0.1:8080,http://127.0.0.1:9099". */
    emulators: (import.meta.env.VITE_FIREBASE_EMULATORS as string | undefined) ?? "",
  },
};
