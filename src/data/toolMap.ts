/**
 * How the tool map groups and connects tools.
 *
 * Each tool sits in one cluster (its main job). Links say what a tool runs on:
 * - "built-on": the product runs on one company's models, and that's stable
 *   public information (NotebookLM runs on Gemini).
 * - "choose": the product lets you pick between several companies' models
 *   (GitHub Copilot, Cursor, Perplexity). Shown only when a tool is selected,
 *   because these lists change often and would clutter the map.
 *
 * Only add a link you can point to a public source for, and re-check links at
 * each tool review. Parents are the flagship assistants, standing in for their
 * model families (ChatGPT for OpenAI's GPT models, and so on).
 */

export type ClusterId = "assistants" | "research" | "study" | "code" | "create" | "media" | "automate";

export interface Cluster {
  id: ClusterId;
  label: string;
  /** One line for the legend and the empty state. */
  blurb: string;
  /** Seed color. `npm run theme` harmonizes it into --kh-cat-<id> tokens for light and dark. */
  seed: string;
  icon: string;
}

export const clusters: Cluster[] = [
  { id: "assistants", label: "General assistants", blurb: "Chat with an AI about almost anything.", seed: "#C0392B", icon: "forum" },
  { id: "research", label: "Research and papers", blurb: "Find, read and check academic sources.", seed: "#1F6FB2", icon: "travel_explore" },
  { id: "study", label: "Study and writing", blurb: "Notes, transcripts, proofreading and rephrasing.", seed: "#7B4FB3", icon: "school" },
  { id: "code", label: "Code and data", blurb: "Write code, build apps and analyze data.", seed: "#1E8E5A", icon: "code" },
  { id: "create", label: "Slides and design", blurb: "Decks, posters and diagrams.", seed: "#D9822B", icon: "slideshow" },
  { id: "media", label: "Image, video and voice", blurb: "Generate and edit media.", seed: "#C2378C", icon: "palette" },
  { id: "automate", label: "Automation", blurb: "Connect apps and run workflows without code.", seed: "#4A6B7C", icon: "account_tree" },
];

export const clusterOf: Record<string, ClusterId> = {
  chatgpt: "assistants",
  claude: "assistants",
  gemini: "assistants",
  copilot: "assistants",

  perplexity: "research",
  elicit: "research",
  scispace: "research",
  consensus: "research",
  scite: "research",
  researchrabbit: "research",
  "semantic-scholar": "research",

  notebooklm: "study",
  otter: "study",
  grammarly: "study",
  quillbot: "study",

  "github-copilot": "code",
  cursor: "code",
  "claude-code": "code",
  replit: "code",
  julius: "code",

  gamma: "create",
  canva: "create",
  napkin: "create",

  midjourney: "media",
  runway: "media",
  "adobe-firefly": "media",
  descript: "media",
  elevenlabs: "media",

  zapier: "automate",
  n8n: "automate",
};

export type LinkKind = "built-on" | "choose";

export interface ToolLink {
  from: string;
  to: string;
  kind: LinkKind;
  /** Plain-language label for the tooltip and the pop-up. */
  note: string;
}

export const links: ToolLink[] = [
  { from: "copilot", to: "chatgpt", kind: "built-on", note: "Runs mainly on OpenAI's GPT models, the family behind ChatGPT." },
  { from: "notebooklm", to: "gemini", kind: "built-on", note: "Runs on Google's Gemini models." },
  { from: "claude-code", to: "claude", kind: "built-on", note: "Runs on Anthropic's Claude models, in your terminal." },

  { from: "github-copilot", to: "chatgpt", kind: "choose", note: "You can pick OpenAI models." },
  { from: "github-copilot", to: "claude", kind: "choose", note: "You can pick Claude models." },
  { from: "github-copilot", to: "gemini", kind: "choose", note: "You can pick Gemini models." },
  { from: "cursor", to: "chatgpt", kind: "choose", note: "You can pick OpenAI models." },
  { from: "cursor", to: "claude", kind: "choose", note: "You can pick Claude models." },
  { from: "cursor", to: "gemini", kind: "choose", note: "You can pick Gemini models." },
  { from: "perplexity", to: "chatgpt", kind: "choose", note: "Paid plans can pick OpenAI models." },
  { from: "perplexity", to: "claude", kind: "choose", note: "Paid plans can pick Claude models." },
  { from: "perplexity", to: "gemini", kind: "choose", note: "Paid plans can pick Gemini models." },
];

export const clusterById = new Map(clusters.map((c) => [c.id, c]));
