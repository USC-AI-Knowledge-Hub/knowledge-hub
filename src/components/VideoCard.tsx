import { toolById } from "../data/tools";
import { ago, compact, duration, thumb } from "../lib/format";
import { Level } from "./Level";
import { usePlayer, type Playable } from "./Player";

export function VideoCard({ video, isNew }: { video: Playable; isNew?: boolean }) {
  const play = usePlayer();
  const toolNames = (video.tools ?? []).map((id) => toolById.get(id)?.name).filter(Boolean);
  return (
    <article className="vcard">
      <button type="button" className="vcard-hit" onClick={() => play(video)} aria-label={`Play: ${video.title}`}>
        <span className="vcard-thumb">
          <img src={thumb(video.id)} alt="" loading="lazy" width={480} height={360} />
          {video.duration ? <span className="vcard-dur">{duration(video.duration)}</span> : null}
          {isNew && <span className="vcard-new">New today</span>}
        </span>
      </button>
      <div className="vcard-body">
        <div className="vcard-tags">
          {video.difficulty && <Level level={video.difficulty} />}
          {toolNames.length > 0 && <span className="label-m muted">{toolNames.slice(0, 2).join(", ")}</span>}
        </div>
        <h3 className="title-m vcard-title">
          <button type="button" onClick={() => play(video)}>
            {video.title}
          </button>
        </h3>
        {video.summary && <p className="body-m vcard-summary">{video.summary}</p>}
        <p className="body-s muted">
          {video.channel}
          {video.views ? `, ${compact(video.views)} views` : ""}
          {video.publishedAt ? `, ${ago(video.publishedAt)}` : ""}
        </p>
      </div>
    </article>
  );
}

/** Compact horizontal row for dense lists (tool pages, module pages). */
export function VideoRow({ video }: { video: Playable }) {
  const play = usePlayer();
  return (
    <button type="button" className="vrow state" onClick={() => play(video)}>
      <span className="vrow-thumb">
        <img src={thumb(video.id)} alt="" loading="lazy" width={160} height={120} />
        {video.duration ? <span className="vcard-dur">{duration(video.duration)}</span> : null}
      </span>
      <span className="vrow-body">
        <span className="title-s vrow-title">{video.title}</span>
        <span className="body-s muted">
          {video.channel}
          {video.publishedAt ? `, ${ago(video.publishedAt)}` : ""}
        </span>
      </span>
    </button>
  );
}
