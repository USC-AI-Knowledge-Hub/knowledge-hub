import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toolById } from "../data/tools";
import { topicById } from "../data/topics";
import type { Video } from "../data/types";
import { ago, compact, duration } from "../lib/format";
import { Icon } from "./Icon";
import { Level } from "./Level";

/** Anything playable: a feed video, or a curated one with fewer fields. */
export type Playable = Pick<Video, "id" | "title" | "channel"> & Partial<Video>;

const PlayerContext = createContext<(v: Playable) => void>(() => {});
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [video, setVideo] = useState<Playable | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  const open = useCallback((v: Playable) => setVideo(v), []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (video && !d.open) d.showModal();
    if (!video && d.open) d.close();
  }, [video]);

  return (
    <PlayerContext.Provider value={open}>
      {children}
      <dialog
        ref={ref}
        className="sheet player"
        aria-label={video?.title ?? "Video player"}
        onClose={() => setVideo(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setVideo(null);
        }}
      >
        {video && (
          <div>
            <div className="player-frame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="player-body">
              <div className="player-meta">
                {video.difficulty && <Level level={video.difficulty} />}
                {video.duration ? <span className="label-m muted">{duration(video.duration)}</span> : null}
                {video.views ? <span className="label-m muted">{compact(video.views)} views</span> : null}
                {video.publishedAt && <span className="label-m muted">{ago(video.publishedAt)}</span>}
              </div>
              <h2 className="headline-s">{video.title}</h2>
              <p className="body-m muted">{video.channel}</p>
              {video.summary && <p className="body-l measure">{video.summary}</p>}
              <div className="chip-row">
                {video.tools?.map((id) => {
                  const t = toolById.get(id);
                  return t ? (
                    <Link key={id} to={`/tools/${id}`} className="chip state" onClick={() => setVideo(null)}>
                      {t.name}
                    </Link>
                  ) : null;
                })}
                {video.topics?.map((id) => (
                  <span key={id} className="chip" style={{ cursor: "default" }}>
                    {topicById.get(id)?.label ?? id}
                  </span>
                ))}
              </div>
              <div className="player-actions">
                <a className="btn outlined sm state" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">
                  <Icon name="open_in_new" />
                  Open on YouTube
                </a>
                <button type="button" className="btn tonal sm state" onClick={() => setVideo(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </PlayerContext.Provider>
  );
}
