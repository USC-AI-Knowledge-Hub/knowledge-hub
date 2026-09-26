import { parseIsoDuration } from "./duration";
import type { Candidate } from "./quality";

const API = "https://www.googleapis.com/youtube/v3";

async function get<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key);
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube ${path} ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

interface SearchResponse {
  items: { id: { videoId?: string } }[];
}

/** search.list costs 100 quota units per call. The default daily quota is 10,000. */
export async function searchVideoIds(query: string, publishedAfter: Date, max: number, key: string): Promise<string[]> {
  const data = await get<SearchResponse>(
    "search",
    {
      part: "id",
      type: "video",
      q: query,
      maxResults: String(max),
      order: "relevance",
      publishedAfter: publishedAfter.toISOString(),
      relevanceLanguage: "en",
      safeSearch: "strict",
      videoEmbeddable: "true",
      videoDuration: "any",
    },
    key,
  );
  return data.items.map((i) => i.id.videoId).filter((id): id is string => Boolean(id));
}

interface VideosResponse {
  items: {
    id: string;
    snippet: {
      title: string;
      description: string;
      channelTitle: string;
      channelId: string;
      publishedAt: string;
      defaultLanguage?: string;
      defaultAudioLanguage?: string;
      liveBroadcastContent?: string;
    };
    contentDetails: { duration: string };
    statistics: { viewCount?: string; likeCount?: string };
    status?: { embeddable?: boolean; privacyStatus?: string };
  }[];
}

/** videos.list costs 1 unit per call of up to 50 IDs. */
export async function videoDetails(ids: string[], key: string, trustedIds: Set<string>): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await get<VideosResponse>(
      "videos",
      { part: "snippet,contentDetails,statistics,status", id: chunk.join(","), maxResults: "50" },
      key,
    );
    for (const v of data.items) {
      if (v.status && (v.status.embeddable === false || v.status.privacyStatus !== "public")) continue;
      out.push({
        id: v.id,
        title: v.snippet.title,
        description: v.snippet.description ?? "",
        channel: v.snippet.channelTitle,
        channelId: v.snippet.channelId,
        publishedAt: v.snippet.publishedAt,
        duration: parseIsoDuration(v.contentDetails.duration),
        views: Number(v.statistics.viewCount ?? 0),
        likes: v.statistics.likeCount ? Number(v.statistics.likeCount) : undefined,
        language: v.snippet.defaultAudioLanguage ?? v.snippet.defaultLanguage,
        live: (v.snippet.liveBroadcastContent ?? "none") !== "none",
        trusted: trustedIds.has(v.snippet.channelId),
      });
    }
  }
  return out;
}

/** Returns the subset of IDs that still exist and are public. */
export async function existingIds(ids: string[], key: string): Promise<Set<string>> {
  const found = await videoDetails(ids, key, new Set());
  return new Set(found.map((v) => v.id));
}
