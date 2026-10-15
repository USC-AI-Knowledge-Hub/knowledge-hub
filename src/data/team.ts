/**
 * AI Team: a discussion board per tool, on GitHub Discussions. Each tool's tile opens the
 * repository's "AI Team" category filtered to that tool, and "Start a topic" opens a new
 * discussion with the tool's name in the title. The category must be open-ended, so students
 * can start topics, and its address slug is set below.
 */
export const TEAM_TOOLS = ["chatgpt", "claude", "gemini", "copilot", "perplexity", "notebooklm", "cursor", "midjourney"] as const;

export const BOARD = {
  repo: "USC-AI-Knowledge-Hub/knowledge-hub",
  /** The category's address name, from github.com/<repo>/discussions/categories/<slug>. */
  categorySlug: "ai-team",
};

const base = `https://github.com/${BOARD.repo}/discussions`;
/** The organization's discussions: where the new-topic form for the category opens. */
const orgBase = `https://github.com/orgs/${BOARD.repo.split("/")[0]}/discussions`;

/** The category filtered to topics with the tool's name in the title. */
export const boardUrl = (name: string) =>
  `${base}?${new URLSearchParams({ discussions_q: `category:${BOARD.categorySlug} in:title ${name}` })}`;

/** A new discussion in the category, titled "<Tool>: " ready to finish. */
export const newTopicUrl = (name: string) =>
  `${orgBase}/new?${new URLSearchParams({ category: BOARD.categorySlug, title: `${name}: ` })}`;
