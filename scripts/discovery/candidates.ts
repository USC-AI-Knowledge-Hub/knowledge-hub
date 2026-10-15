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
  { id: "github-ai", name: "GitHub blog: AI and ML", url: "https://github.blog/ai-and-ml/feed/", tier: "vendor", maker: "GitHub", aiOnly: true, why: "Copilot and coding-tool launches", checked: "2026-10-15: reachable, 10 recent posts, but titles are how-tos; no names. Wait for the language-model reader." },
  { id: "aws-ml", name: "AWS machine learning blog", url: "https://aws.amazon.com/blogs/machine-learning/feed/", tier: "vendor", maker: "Amazon", aiOnly: true, why: "Bedrock, Nova and Amazon Q announcements", checked: "2026-10-15: reachable but mostly tutorials; one name in 20 posts. Not worth it." },
  { id: "apple-ml", name: "Apple machine learning research", url: "https://machinelearning.apple.com/rss.xml", tier: "vendor", maker: "Apple", aiOnly: true, why: "Apple Intelligence models", checked: "2026-10-15: reachable, research papers only. Not worth it." },
  { id: "google-research", name: "Google Research blog", url: "https://research.google/blog/rss/", tier: "vendor", maker: "Google", why: "Research that becomes products", checked: "2026-10-15: reachable, research posts, no product names. Not worth it." },
  { id: "google-workspace-updates", name: "Google Workspace updates", url: "https://workspaceupdates.googleblog.com/atom.xml", tier: "vendor", maker: "Google", why: "Gemini inside Docs, Slides and NotebookLM, which students use", checked: "2026-10-15: the feed came back empty. Skip." },
  { id: "microsoft-research", name: "Microsoft Research", url: "https://www.microsoft.com/en-us/research/feed/", tier: "vendor", maker: "Microsoft", why: "Models and tools from Microsoft Research", checked: "2026-10-15: research posts; the one name found was not a product. Skip." },
  { id: "microsoft-copilot", name: "Microsoft Copilot blog", url: "https://www.microsoft.com/en-us/microsoft-copilot/blog/feed/", tier: "vendor", maker: "Microsoft", aiOnly: true, guessed: true, why: "Copilot features and launches", checked: "2026-10-15: the feed came back empty. Skip." },
  { id: "nvidia-dev", name: "NVIDIA developer blog", url: "https://developer.nvidia.com/blog/feed", tier: "vendor", maker: "NVIDIA", why: "Open models and developer tools", checked: "2026-10-15: lots of posts, but the name found was noise (\"NVIDIA Run\"). Skip." },
  { id: "cloudflare-ai", name: "Cloudflare blog: AI", url: "https://blog.cloudflare.com/tag/ai/rss/", tier: "vendor", maker: "Cloudflare", aiOnly: true, why: "Hosted-model and agent tooling", checked: "2026-10-15: reachable; names found look like internal project names. Skip." },
  { id: "stability", name: "Stability AI news", url: "https://stability.ai/news?format=rss", tier: "vendor", maker: "Stability AI", aiOnly: true, guessed: true, why: "Image, video and audio model releases", checked: "2026-10-15: the feed came back empty. Skip." },
  { id: "meta-ai", name: "Meta AI blog", url: "https://ai.meta.com/blog/rss/", tier: "vendor", maker: "Meta", aiOnly: true, guessed: true, why: "Llama and other open models", checked: "2026-10-15: HTTP 404, no feed at this address. Skip." },
  { id: "anthropic", name: "Anthropic news", url: "https://www.anthropic.com/news/rss.xml", tier: "vendor", maker: "Anthropic", aiOnly: true, guessed: true, why: "Claude releases (the publisher may not offer a feed)", checked: "2026-10-15: HTTP 404; Anthropic publishes no feed. Claude releases come in through the press feeds and the reviewed list." },
  { id: "replicate", name: "Replicate blog", url: "https://replicate.com/blog/rss", tier: "vendor", maker: "Replicate", aiOnly: true, guessed: true, why: "Image and video models as they appear", checked: "2026-10-15: reachable but nothing in 30 days. Skip." },
  { id: "elevenlabs", name: "ElevenLabs blog", url: "https://elevenlabs.io/blog/rss.xml", tier: "vendor", maker: "ElevenLabs", aiOnly: true, guessed: true, why: "Voice and audio tools", checked: "2026-10-15: works and is productive, but its posts are features of a tool we already review (\"Brand Kit\"), which would be listed as separate tools. Skip unless features get their own handling." },
  { id: "langchain", name: "LangChain blog", url: "https://blog.langchain.dev/rss/", tier: "vendor", maker: "LangChain", aiOnly: true, why: "Agent frameworks and tooling", checked: "2026-10-15: the feed came back empty. Skip." },
  // Press and newsletters: they say what people are paying attention to.
  { id: "the-decoder", name: "The Decoder", url: "https://the-decoder.com/feed/", tier: "press", aiOnly: true, why: "Short, product-focused AI news", checked: "2026-10-15: reachable, 10 recent posts, headlines the matcher can't read. A good source once the language-model reader is on (ANTHROPIC_API_KEY)." },
  { id: "ars-ai", name: "Ars Technica AI", url: "https://arstechnica.com/ai/feed/", tier: "press", aiOnly: true, why: "Careful reporting on launches", checked: "2026-10-15: reachable; one noise name in 20 posts. Skip." },
  { id: "wired-ai", name: "WIRED AI", url: "https://www.wired.com/feed/tag/ai/latest/rss", tier: "press", aiOnly: true, why: "Mainstream coverage of new tools", checked: "2026-10-15: reachable, headlines the matcher can't read. Candidate for the language-model reader." },
  { id: "mit-tr-ai", name: "MIT Technology Review: AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", tier: "press", aiOnly: true, why: "Analysis, fewer launches", checked: "2026-10-15: reachable, analysis pieces, no names. Skip." },
  { id: "zdnet-ai", name: "ZDNET AI", url: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml", tier: "press", aiOnly: true, why: "Hands-on tool reviews", checked: "2026-10-15: reachable, 25 recent posts, headlines the matcher can't read. Candidate for the language-model reader." },
  { id: "import-ai", name: "Import AI", url: "https://importai.substack.com/feed", tier: "press", aiOnly: true, why: "Weekly research and model roundup", checked: "2026-10-15: HTTP 403, blocks automated readers. Skip." },
  { id: "latent-space", name: "Latent Space", url: "https://www.latent.space/feed", tier: "press", aiOnly: true, why: "Builder-side news and interviews", checked: "2026-10-15: reachable, 20 recent posts, headlines the matcher can't read. Candidate for the language-model reader." },
  { id: "interconnects", name: "Interconnects", url: "https://www.interconnects.ai/feed", tier: "press", aiOnly: true, why: "Open model releases", checked: "2026-10-15: reachable but only 5 posts in 30 days, no names. Skip." },
  { id: "bens-bites", name: "Ben's Bites", url: "https://www.bensbites.com/feed", tier: "press", aiOnly: true, why: "Daily roundup of new tools", checked: "2026-10-15: reachable, 10 recent posts, headlines the matcher can't read. Candidate for the language-model reader." },
  { id: "edsurge", name: "EdSurge", url: "https://www.edsurge.com/articles_rss", tier: "press", why: "AI tools aimed at students and teachers", checked: "2026-10-15: reachable; 42% on topic and one weak name. Skip." },
  // Launch sites and forums: they say what people are trying.
  { id: "taaft", name: "There's An AI For That", url: "https://theresanaiforthat.com/rss/", tier: "community", titles: "product", aiOnly: true, guessed: true, why: "A large directory of new AI tools", checked: "2026-10-15: HTTP 403, blocks automated readers. Skip." },
];
