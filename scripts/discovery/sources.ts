import type { Source, Tier } from "./types";

/**
 * Where new tools and models are announced. Official announcements count most, then press, then
 * launch sites and forums. Add a feed by adding a line; a feed that breaks is reported and retried,
 * and never stops the run. Keep a mix: vendors say what exists, others say what people use.
 */
/**
 * Vendors that announce whole products (the labs and big platforms) are "vendor" and count alone. Company
 * blogs that mostly post features, tutorials or research are "press" even though they are first-party, so a
 * product needs a second source before it is listed. The feed check (npm run vet-feeds) vets any new one.
 */
export const SOURCES: Source[] = [
  { id: "hf-blog", name: "Hugging Face blog", url: "https://huggingface.co/blog/feed.xml", tier: "vendor", maker: "Hugging Face", aiOnly: true },
  { id: "openai", name: "OpenAI news", url: "https://openai.com/news/rss.xml", tier: "vendor", maker: "OpenAI", aiOnly: true },
  { id: "google-ai", name: "Google AI blog", url: "https://blog.google/technology/ai/rss/", tier: "vendor", maker: "Google", aiOnly: true },
  { id: "deepmind", name: "Google DeepMind blog", url: "https://deepmind.google/blog/rss.xml", tier: "vendor", maker: "Google DeepMind", aiOnly: true },
  { id: "microsoft-ai", name: "Microsoft AI blog", url: "https://news.microsoft.com/source/topics/ai/feed/", tier: "vendor", maker: "Microsoft", aiOnly: true },
  { id: "nvidia", name: "NVIDIA blog", url: "https://blogs.nvidia.com/feed/", tier: "vendor" },
  { id: "techcrunch-ai", name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", tier: "press", aiOnly: true },
  { id: "verge-ai", name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", tier: "press", aiOnly: true },
  { id: "venturebeat-ai", name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", tier: "press", aiOnly: true },
  { id: "simonw", name: "Simon Willison's blog", url: "https://simonwillison.net/atom/everything/", tier: "press", aiOnly: true },
  { id: "one-useful-thing", name: "One Useful Thing", url: "https://www.oneusefulthing.org/feed", tier: "press", aiOnly: true },
  { id: "marktechpost", name: "MarkTechPost", url: "https://www.marktechpost.com/feed/", tier: "press", aiOnly: true },
  { id: "github-ai", name: "GitHub blog: AI and ML", url: "https://github.blog/ai-and-ml/feed/", tier: "press", maker: "GitHub", aiOnly: true },
  { id: "aws-ml", name: "AWS machine learning blog", url: "https://aws.amazon.com/blogs/machine-learning/feed/", tier: "press", maker: "Amazon", aiOnly: true },
  { id: "apple-ml", name: "Apple machine learning research", url: "https://machinelearning.apple.com/rss.xml", tier: "press", maker: "Apple", aiOnly: true },
  { id: "google-research", name: "Google Research blog", url: "https://research.google/blog/rss/", tier: "press", maker: "Google" },
  { id: "microsoft-research", name: "Microsoft Research", url: "https://www.microsoft.com/en-us/research/feed/", tier: "press", maker: "Microsoft" },
  { id: "nvidia-dev", name: "NVIDIA developer blog", url: "https://developer.nvidia.com/blog/feed", tier: "press", maker: "NVIDIA" },
  { id: "cloudflare-ai", name: "Cloudflare blog: AI", url: "https://blog.cloudflare.com/tag/ai/rss/", tier: "press", maker: "Cloudflare", aiOnly: true },
  { id: "elevenlabs", name: "ElevenLabs blog", url: "https://elevenlabs.io/blog/rss.xml", tier: "press", maker: "ElevenLabs", aiOnly: true },
  { id: "the-decoder", name: "The Decoder", url: "https://the-decoder.com/feed/", tier: "press", aiOnly: true },
  { id: "ars-ai", name: "Ars Technica AI", url: "https://arstechnica.com/ai/feed/", tier: "press", aiOnly: true },
  { id: "wired-ai", name: "WIRED AI", url: "https://www.wired.com/feed/tag/ai/latest/rss", tier: "press", aiOnly: true },
  { id: "mit-tr-ai", name: "MIT Technology Review: AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", tier: "press", aiOnly: true },
  { id: "zdnet-ai", name: "ZDNET AI", url: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml", tier: "press", aiOnly: true },
  { id: "latent-space", name: "Latent Space", url: "https://www.latent.space/feed", tier: "press", aiOnly: true },
  { id: "interconnects", name: "Interconnects", url: "https://www.interconnects.ai/feed", tier: "press", aiOnly: true },
  { id: "bens-bites", name: "Ben's Bites", url: "https://www.bensbites.com/feed", tier: "press", aiOnly: true },
  { id: "producthunt-ai", name: "Product Hunt: AI", url: "https://www.producthunt.com/feed?category=artificial-intelligence", tier: "community", titles: "product", aiOnly: true },
  { id: "reddit-localllama", name: "r/LocalLLaMA, top this week", url: "https://www.reddit.com/r/LocalLLaMA/top/.rss?t=week", tier: "community", aiOnly: true },
  { id: "hn-show", name: "Show HN", url: "https://hnrss.org/show?q=AI&points=60", tier: "community", titles: "product" },
];

/** What a mention from each tier is worth. A product is listed once its mentions add up to ACCEPT_SCORE. */
export const WEIGHT: Record<Tier, number> = { vendor: 3, press: 2, community: 1 };
export const ACCEPT_SCORE = 3;

/** Limits that keep the run polite and the catalog tidy. */
export const LIMITS = {
  /** Days a half-evidenced product waits for more before it's forgotten. */
  pendingDays: 21,
  maxPending: 200,
  /** Days of silence (and few videos) before a listed tool is dropped. */
  expireDays: 150,
  /** Videos in the library that keep a tool listed however quiet its feeds are. */
  keepWithVideos: 3,
  maxTools: 150,
  /** Most new tools listed in one run, so one odd feed can't flood the catalog. */
  maxNewPerRun: 12,
  /** Pages fetched per run to find a tool's site and check it is still up. */
  maxPageChecks: 30,
  /** Failed runs in a row before a feed is tried only once a week. */
  feedBackoff: 7,
  /** Tool queries given to YouTube search per day. */
  youtubeQueries: 12,
  /** The most categories the run may add in total, and in one run. */
  maxAutoCategories: 30,
  maxNewCategoriesPerRun: 1,
  /** Days an automatic category may have fewer than two tools before it's retired. */
  categoryRetireDays: 90,
};
