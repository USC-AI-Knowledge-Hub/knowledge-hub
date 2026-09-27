import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toolById } from "../data/tools";
import { topicById } from "../data/topics";
import type { Video } from "../data/types";
import { ago, compact, duration } from "../lib/format";
import { Icon } from "./Icon";
import { Level } from "./Level";

/**
 * Anything playable: a feed video, a curated one with fewer fields, or a full
 * course. For a playlist, `list` holds the playlist ID and `id` a video to show
 * first (may be empty).
 */
export type Playable = Pick<Video, "id" | "title" | "channel"> &
  Partial<Video> & { list?: string; lessons?: number; audience?: string; hoursLabel?: string };

const embedSrc = (v: Playable) =>
  v.list
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${v.list}&autoplay=1&rel=0`
    : `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1`;
const youtubeUrl = (v: Playable) =>
  v.list ? `https://www.youtube.com/playlist?list=${v.list}` : `https://www.youtube.com/watch?v=${v.id}`;

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
                src={embedSrc(video)}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="player-body">
              <div className="player-meta">
                {video.difficulty && <Level level={video.difficulty} />}
                {video.lessons && video.lessons > 1 ? <span className="label-m muted">{video.lessons} lessons</span> : null}
                {video.hoursLabel ? <span className="label-m muted">{video.hoursLabel}</span> : null}
                {video.duration ? <span className="label-m muted">{duration(video.duration)}</span> : null}
                {video.views ? <span className="label-m muted">{compact(video.views)} views</span> : null}
                {video.publishedAt && <span className="label-m muted">{ago(video.publishedAt)}</span>}
              </div>
              <h2 className="headline-s">{video.title}</h2>
              <p className="body-m muted">{video.channel}</p>
              {video.summary && <p className="body-l measure">{video.summary}</p>}
              {video.audience && (
                <p className="body-m measure player-audience">
                  <Icon name="person" size={20} />
                  {video.audience}
                </p>
              )}
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
                <a className="btn outlined sm state" href={youtubeUrl(video)} target="_blank" rel="noreferrer">
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
