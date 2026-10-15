import type { Source } from "./types";

/**
 * Feeds being considered for SOURCES. None of these are read by the daily run. `npm run vet-feeds`
 * tests each one the way discovery would (reachable, valid, recent, about AI, finds product names)
 * so a feed is added on evidence rather than on a guess. A candidate whose address is only a guess
 * is marked `guessed`, because many sites publish no feed at all.
 */
export interface Candidate extends Source {
  why: string;
  /** The address wasn't confirmed from the publisher's own site. */
  guessed?: boolean;
  /** What the last check found and what was decided, so the question isn't asked twice. */
  checked?: string;
}

export const CANDIDATES: Candidate[] = [
  // Vendors: they say what exists.
  { id: "google-workspace-updates", name: "Google Workspace updates", url: "https://workspaceupdates.googleblog.com/atom.xml", tier: "vendor", maker: "Google", why: "Gemini inside Docs, Slides and NotebookLM, which students use", checked: "2026-10-15: the feed came back empty. Skip." },
  { id: "microsoft-copilot", name: "Microsoft Copilot blog", url: "https://www.microsoft.com/en-us/microsoft-copilot/blog/feed/", tier: "vendor", maker: "Microsoft", aiOnly: true, guessed: true, why: "Copilot features and launches", checked: "2026-10-15: the feed came back empty. Skip." },
  { id: "stability", name: "Stability AI news", url: "https://stability.ai/news?format=rss", tier: "vendor", maker: "Stability AI", aiOnly: true, guessed: true, why: "Image, video and audio model releases", checked: "2026-10-15: the feed came back empty. Skip." },
  { id: "meta-ai", name: "Meta AI blog", url: "https://ai.meta.com/blog/rss/", tier: "vendor", maker: "Meta", aiOnly: true, guessed: true, why: "Llama and other open models", checked: "2026-10-15: HTTP 404, no feed at this address. Skip." },
  { id: "anthropic", name: "Anthropic news", url: "https://www.anthropic.com/news/rss.xml", tier: "vendor", maker: "Anthropic", aiOnly: true, guessed: true, why: "Claude releases (the publisher may not offer a feed)", checked: "2026-10-15: HTTP 404; Anthropic publishes no feed. Claude releases come in through the press feeds and the reviewed list." },
  { id: "replicate", name: "Replicate blog", url: "https://replicate.com/blog/rss", tier: "vendor", maker: "Replicate", aiOnly: true, guessed: true, why: "Image and video models as they appear", checked: "2026-10-15: reachable but nothing in 30 days. Skip." },
  { id: "langchain", name: "LangChain blog", url: "https://blog.langchain.dev/rss/", tier: "vendor", maker: "LangChain", aiOnly: true, why: "Agent frameworks and tooling", checked: "2026-10-15: the feed came back empty. Skip." },
  // Press and newsletters: they say what people are paying attention to.
  { id: "import-ai", name: "Import AI", url: "https://importai.substack.com/feed", tier: "press", aiOnly: true, why: "Weekly research and model roundup", checked: "2026-10-15: HTTP 403, blocks automated readers. Skip." },
  { id: "edsurge", name: "EdSurge", url: "https://www.edsurge.com/articles_rss", tier: "press", why: "AI tools aimed at students and teachers", checked: "2026-10-15: reachable; 42% on topic and one weak name. Skip." },
  // Launch sites and forums: they say what people are trying.
  { id: "taaft", name: "There's An AI For That", url: "https://theresanaiforthat.com/rss/", tier: "community", titles: "product", aiOnly: true, guessed: true, why: "A large directory of new AI tools", checked: "2026-10-15: HTTP 403, blocks automated readers. Skip." },
];
