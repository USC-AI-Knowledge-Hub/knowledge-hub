import { useState } from "react";
import type { TalkKind } from "../data/types";
import type { LiveTalk } from "../lib/courses";
import { minutesLabel, thumb } from "../lib/format";
import { Icon } from "./Icon";
import { usePlayer, type Playable } from "./Player";

/** Singular label on a card. */
export const TALK_LABEL: Record<TalkKind, string> = { talk: "Talk", debate: "Debate", keynote: "Keynote", podcast: "Podcast" };
/** Plural label on a filter chip. */
export const TALK_FILTER_LABEL: Record<TalkKind, string> = {
  talk: "TED and talks",
  debate: "Debates",
  keynote: "Keynotes",
  podcast: "Podcasts",
};
export const TALK_ICON: Record<TalkKind, string> = { talk: "podium", debate: "forum", keynote: "campaign", podcast: "podcasts" };

const speakerLine = (speakers: string[]) =>
  speakers.length <= 2 ? speakers.join(" and ") : `${speakers.slice(0, -1).join(", ")} and ${speakers[speakers.length - 1]}`;

export const talkPlayable = (t: LiveTalk): Playable => ({
  id: t.video ?? "",
  list: t.playlist,
  title: t.title,
  channel: `${speakerLine(t.speakers)} · ${t.channel}, ${t.year}`,
  summary: t.summary,
  hoursLabel: minutesLabel(t.minutes),
});

/** A talk, debate, keynote or podcast episode. Opens in the player. */
export function TalkCard({ talk, compact }: { talk: LiveTalk; compact?: boolean }) {
  const play = usePlayer();
  const open = () => play(talkPlayable(talk));
  const [broken, setBroken] = useState(false);
  return (
    <article className={`vcard talk-card ${compact ? "compact" : ""}`} data-kind={talk.kind}>
      <button type="button" className="vcard-hit" onClick={open} aria-label={`Play: ${talk.title}`}>
        <span className="vcard-thumb">
          {talk.video && !broken && (
            <img src={thumb(talk.video)} alt="" loading="lazy" width={480} height={360} onError={() => setBroken(true)} />
          )}
          <span className="vcard-dur">{minutesLabel(talk.minutes)}</span>
        </span>
      </button>
      <div className="vcard-body">
        <div className="vcard-tags">
          <span className={`talk-kind ${talk.kind} label-m`}>
            <Icon name={TALK_ICON[talk.kind]} size={16} />
            {TALK_LABEL[talk.kind]}
          </span>
          <span className="label-m muted">{talk.year}</span>
        </div>
        <h3 className="title-m vcard-title">
          <button type="button" onClick={open}>
            {talk.title}
          </button>
        </h3>
        <p className="title-s talk-speakers">{speakerLine(talk.speakers)}</p>
        {!compact && <p className="body-m vcard-summary ccard-summary">{talk.summary}</p>}
        <p className="body-s muted">{talk.channel}</p>
      </div>
    </article>
  );
}
