import type { Source, Tier } from "./types";

/**
 * Where new tools and models are announced. Official announcements count most, then press, then
 * launch sites and forums. Add a feed by adding a line; a feed that breaks is reported and retried,
 * and never stops the run. Keep a mix: vendors say what exists, others say what people use.
 */
export const SOURCES: Source[] = [
  { id: "hf-blog", name: "Hugging Face blog", url: "https://huggingface.co/blog/feed.xml", tier: "vendor", maker: "Hugging Face", aiOnly: true },
  { id: "openai", name: "OpenAI news", url: "https://openai.com/news/rss.xml", tier: "vendor", maker: "OpenAI", aiOnly: true },
  { id: "google-ai", name: "Google AI blog", url: "https://blog.google/technology/ai/rss/", tier: "vendor", maker: "Google", aiOnly: true },
  { id: "deepmind", name: "Google DeepMind blog", url: "https://deepmind.google/blog/rss.xml", tier: "vendor", maker: "Google DeepMind", aiOnly: true },
  { id: "microsoft-ai", name: "Microsoft AI blog", url: "https://blogs.microsoft.com/ai/feed/", tier: "vendor", maker: "Microsoft", aiOnly: true },
  { id: "nvidia", name: "NVIDIA blog", url: "https://blogs.nvidia.com/feed/", tier: "vendor" },
  { id: "techcrunch-ai", name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", tier: "press", aiOnly: true },
  { id: "verge-ai", name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", tier: "press", aiOnly: true },
  { id: "venturebeat-ai", name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", tier: "press", aiOnly: true },
  { id: "simonw", name: "Simon Willison's blog", url: "https://simonwillison.net/atom/everything/", tier: "press", aiOnly: true },
  { id: "one-useful-thing", name: "One Useful Thing", url: "https://www.oneusefulthing.org/feed", tier: "press", aiOnly: true },
  { id: "producthunt-ai", name: "Product Hunt: AI", url: "https://www.producthunt.com/feed?category=artificial-intelligence", tier: "community", titles: "product", aiOnly: true },
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
