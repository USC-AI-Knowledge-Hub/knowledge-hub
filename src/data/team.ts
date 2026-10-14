/**
 * AI Team: a discussion board per tool, under Green AI. Each board is one
 * GitHub Discussion, shown with giscus. To switch it on: enable Discussions on
 * the repository, add a category (announcement-style, so only the app can open
 * threads), install the giscus app, then paste the category's id below.
 */
export const TEAM_TOOLS = ["chatgpt", "claude", "gemini", "copilot", "perplexity", "notebooklm", "cursor", "midjourney"] as const;

export const GISCUS = {
  repo: "USC-AI-Knowledge-Hub/knowledge-hub",
  repoId: "R_kgDOUtX0aA",
  category: "AI Team",
  /** From giscus.app once the category exists. Empty means the board isn't switched on yet. */
  categoryId: "DIC_kwDOUtX0aM4DIW5d",
};

export const DEFAULT_TEAM_TOOL = TEAM_TOOLS[0];

export const teamTool = (id: string | null): (typeof TEAM_TOOLS)[number] =>
  (TEAM_TOOLS as readonly string[]).includes(id ?? "") ? (id as (typeof TEAM_TOOLS)[number]) : DEFAULT_TEAM_TOOL;

/** One thread per tool: giscus matches the discussion by this exact title. */
export const threadTerm = (toolId: string) => `ai-team:${toolId}`;

/** Starter topics. They're ideas for a first post, not separate threads. */
export const TOPICS = ["Prompts that worked", "Study tips", "Things that went wrong", "Is it worth the energy?", "Cool projects"];
