import { toolById } from "../data/tools";
import type { Trend, TrendKind } from "../data/types";
import { ago, compact, duration, thumb } from "../lib/format";
import { Icon } from "./Icon";
import { usePlayer } from "./Player";

export const TREND_LABEL: Record<TrendKind, string> = { launch: "Launch", research: "Research", talk: "Talk", news: "News" };
export const TREND_ICON: Record<TrendKind, string> = { launch: "rocket_launch", research: "science", talk: "mic", news: "newspaper" };

/** A news, launch, research or talk video. No difficulty: trends aren't lessons. */
export function TrendCard({ trend }: { trend: Trend }) {
  const play = usePlayer();
  const open = () => play({ ...trend, tools: trend.tools });
  const toolNames = trend.tools.map((id) => toolById.get(id)?.name).filter(Boolean);
  return (
    <article className="vcard trend-card">
      <button type="button" className="vcard-hit" onClick={open} aria-label={`Play: ${trend.title}`}>
        <span className="vcard-thumb">
          <img src={thumb(trend.id)} alt="" loading="lazy" width={480} height={360} />
          {trend.duration ? <span className="vcard-dur">{duration(trend.duration)}</span> : null}
        </span>
      </button>
      <div className="vcard-body">
        <div className="vcard-tags">
          <span className={`trend-kind ${trend.kind} label-m`}>
            <Icon name={TREND_ICON[trend.kind]} size={16} />
            {TREND_LABEL[trend.kind]}
          </span>
          {toolNames.length > 0 && <span className="label-m muted">{toolNames.slice(0, 2).join(", ")}</span>}
        </div>
        <h3 className="title-m vcard-title">
          <button type="button" onClick={open}>
            {trend.title}
          </button>
        </h3>
        <p className="body-s muted">
          {trend.channel}
          {trend.views ? `, ${compact(trend.views)} views` : ""}, {ago(trend.publishedAt)}
        </p>
      </div>
    </article>
  );
}
