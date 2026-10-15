/**
 * AI Team: a discussion board per tool, on GitHub Discussions. GitHub has no sub-categories, so each
 * topic is a tag in the title ("ChatGPT · Videos: ..."), and the site builds the filtered views and
 * the new-topic links from it. The "AI Team" category must be open-ended so students can start topics;
 * its address name is set below.
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

export const BOARD = {
  org: "USC-AI-Knowledge-Hub",
  /** The category's address name, from github.com/orgs/<org>/discussions/categories/<slug>. */
  categorySlug: "ai-team",
};

/** The organization's discussions. The repository address redirects here and drops the filter, so use this one. */
const base = `https://github.com/orgs/${BOARD.org}/discussions`;

/** The category filtered to topics for a tool, and for one topic of it when given. */
export const boardUrl = (name: string, topic?: Topic) =>
  `${base}?${new URLSearchParams({ discussions_q: `category:${BOARD.categorySlug} in:title ${name}${topic ? ` ${topic.label}` : ""}` })}`;

/** A new discussion in the category, titled so it lands on the right board: "ChatGPT · Videos: ". */
export const newTopicUrl = (name: string, topic: Topic) =>
  `${base}/new?${new URLSearchParams({ category: BOARD.categorySlug, title: `${name} · ${topic.label}: ` })}`;
