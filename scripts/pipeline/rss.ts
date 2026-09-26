import { XMLParser } from "fast-xml-parser";
import type { Candidate } from "./quality";

const UA = { "user-agent": "Mozilla/5.0 (compatible; USC-AI-Knowledge-Hub/1.0; +https://sites.usc.edu/ai-knowledge-hub/)" };

/** Resolves a YouTube @handle to its channel ID by reading the channel page. */
export async function resolveHandle(handle: string): Promise<string | null> {
  const res = await fetch(`https://www.youtube.com/@${encodeURIComponent(handle)}`, { headers: UA });
  if (!res.ok) return null;
  const html = await res.text();
  const m =
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/.exec(html) ??
    /"(?:externalId|channelId)":"(UC[\w-]{22})"/.exec(html);
  return m ? m[1] : null;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

type Entry = {
  "yt:videoId": string;
  "yt:channelId": string;
  title: string;
  published: string;
  author: { name: string };
  link?: { "@_href"?: string } | { "@_href"?: string }[];
  "media:group"?: {
    "media:description"?: string;
    "media:community"?: { "media:statistics"?: { "@_views"?: string }; "media:starRating"?: { "@_count"?: string } };
  };
};

/** Parses a channel's Atom feed (the latest 15 uploads). No API key or quota needed. */
export function parseFeed(xml: string): Candidate[] {
  const doc = parser.parse(xml);
  const raw = doc?.feed?.entry;
  const entries: Entry[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return entries.map((e) => {
    const group = e["media:group"] ?? {};
    const community = group["media:community"] ?? {};
    const links = Array.isArray(e.link) ? e.link : e.link ? [e.link] : [];
    const short = links.some((l) => String(l["@_href"] ?? "").includes("/shorts/"));
    return {
      id: String(e["yt:videoId"]),
      title: String(e.title ?? ""),
      description: String(group["media:description"] ?? ""),
      channel: String(e.author?.name ?? ""),
      channelId: String(e["yt:channelId"] ?? ""),
      publishedAt: String(e.published),
      duration: 0,
      views: Number(community["media:statistics"]?.["@_views"] ?? 0),
      likes: community["media:starRating"]?.["@_count"] ? Number(community["media:starRating"]["@_count"]) : undefined,
      short,
      trusted: true,
    };
  });
}

export async function fetchChannelFeed(channelId: string): Promise<Candidate[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { headers: UA });
  if (!res.ok) throw new Error(`RSS ${channelId} ${res.status}`);
  return parseFeed(await res.text());
}
