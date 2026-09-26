import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { DIFFICULTIES, DIFFICULTY_BLURB } from "../data/types";
import { useFeed } from "../lib/feed";
import { longDate } from "../lib/format";

const STEPS = [
  {
    icon: "travel_explore",
    title: "Collect",
    body: "Every morning we search YouTube for each tool in the catalog and read the latest uploads from a list of trusted educators and official channels.",
  },
  {
    icon: "filter_alt",
    title: "Filter",
    body: "Shorts, livestreams, news roundups, product announcements, non-English videos, clickbait titles, anything older than 60 days and videos with too little audience are dropped. Without Claude, a title also has to read like a lesson: a tutorial, a guide, tips, “how to”.",
  },
  {
    icon: "label",
    title: "Label",
    body: "Each video is tagged with the tools it teaches, the lessons it supports and a difficulty level. When enabled, Claude reads the title and description to label it and writes a one-line summary; otherwise a keyword model does it.",
  },
  {
    icon: "leaderboard",
    title: "Rank",
    body: "A score weighs reach, momentum, likes, freshness and whether the channel is a trusted teacher, and subtracts points for hype. Each tool keeps its best 15 videos per level, so no single tool floods the library.",
  },
];

export function About() {
  const { feed } = useFeed();
  return (
    <>
      <header className="page-head">
        <Link to="/watch" className="crumb">
          <Icon name="arrow_back" />
          Watch
        </Link>
        <h1 className="display-s">How the video library works</h1>
        <p className="body-l muted measure">
          The library is rebuilt automatically every day. Here's exactly what happens, so you can judge how much to trust it.
        </p>
        {feed?.generatedAt && (
          <p className="label-l" style={{ marginTop: 16 }}>
            Last run {longDate(feed.runDate!)}: {feed.stats.candidates} videos checked, {feed.stats.added} added, {feed.stats.kept} in the library.
            Labels by {feed.classifier === "claude" ? "Claude" : "keyword model"}.
          </p>
        )}
      </header>

      <ol className="how">
        {STEPS.map((s) => (
          <li key={s.title} className="how-step">
            <span className="how-icon">
              <Icon name={s.icon} size={28} />
            </span>
            <div>
              <h2 className="title-l">{s.title}</h2>
              <p className="body-l measure muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="section">
        <h2 className="headline-m section-head">What the levels mean</h2>
        <div className="grid cols-auto">
          {DIFFICULTIES.map((d) => (
            <div key={d} className="card filled level-explain">
              <Level level={d} />
              <p className="body-l">{DIFFICULTY_BLURB[d]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="headline-m section-head">What it can't do</h2>
        <ul className="ideas measure">
          <li className="body-l">It judges videos by their title, description and statistics. Nobody has watched every one.</li>
          <li className="body-l">Difficulty labels are a best guess. If one looks wrong, trust your own sense of the video.</li>
          <li className="body-l">
            Lessons in Learn also have editors' picks and full courses from universities and the companies behind the tools. Those are
            the ones to start with. Every course is checked against YouTube each day, and any that disappear are hidden.
          </li>
        </ul>
      </section>
    </>
  );
}
