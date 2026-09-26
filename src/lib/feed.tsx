import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Video, VideoFeed } from "../data/types";

interface FeedState {
  feed: VideoFeed | null;
  error: string | null;
  /** Videos first picked up by the latest pipeline run. */
  today: Video[];
}

const FeedContext = createContext<FeedState>({ feed: null, error: null, today: [] });

export function FeedProvider({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<VideoFeed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cache-bust per day so a fresh daily run shows up without a hard reload.
    const day = new Date().toISOString().slice(0, 10);
    fetch(`${import.meta.env.BASE_URL}data/videos.json?d=${day}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Video library didn't load (HTTP ${r.status}).`);
        return r.json();
      })
      .then(setFeed)
      .catch((e: Error) => setError(e.message));
  }, []);

  const value = useMemo<FeedState>(() => {
    const today = feed?.runDate ? feed.videos.filter((v) => v.firstSeen === feed.runDate) : [];
    return { feed, error, today: [...today].sort((a, b) => b.score - a.score) };
  }, [feed, error]);

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export const useFeed = () => useContext(FeedContext);
