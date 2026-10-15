/**
 * AI Team: a discussion board per tool, kept on the site's own database (supabase/schema.sql, set up
 * as described in supabase/README.md). Until a database is connected the boards work on each visitor's
 * own device, so nothing is shared. Every tool starts with the same topics.
 */
export const TEAM_TOOLS = ["chatgpt", "claude", "gemini", "copilot", "perplexity", "notebooklm", "cursor", "midjourney"] as const;

/** The topics every tool's board starts with. Add one here and every tool gets it. */
export const TOPICS = [
  { id: "videos", label: "Videos", icon: "smart_display", hint: "A video that taught you something" },
  { id: "articles", label: "Articles", icon: "article", hint: "A guide, post or paper worth reading" },
  { id: "new", label: "New tools and features", icon: "new_releases", hint: "Something new it can do" },
  { id: "prompts", label: "Prompts and tips", icon: "lightbulb", hint: "A prompt or habit that works" },
  { id: "help", label: "Questions", icon: "help", hint: "Ask what worked for others" },
] as const;

export type Topic = (typeof TOPICS)[number];

export const topicById = new Map<string, Topic>(TOPICS.map((t) => [t.id, t]));

export const teamTool = (id: string | null): (typeof TEAM_TOOLS)[number] | null =>
  (TEAM_TOOLS as readonly string[]).includes(id ?? "") ? (id as (typeof TEAM_TOOLS)[number]) : null;

/** The shared database's address and its public key, set when the site is built (repository variables BOARD_URL and BOARD_ANON_KEY). */
export const BOARD = {
  url: (import.meta.env.VITE_BOARD_URL as string | undefined) ?? "",
  anonKey: (import.meta.env.VITE_BOARD_KEY as string | undefined) ?? "",
};
