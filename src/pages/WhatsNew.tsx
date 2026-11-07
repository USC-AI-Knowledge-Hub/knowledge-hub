import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { NotReviewed } from "../components/NotReviewed";
import { TrendCard } from "../components/TrendCard";
import { tools } from "../data/tools";
import type { DiscoveredTool } from "../data/types";
import { useCatalog } from "../lib/catalogStore";
import { useFeed } from "../lib/feed";
import { longDate } from "../lib/format";
import { newItems } from "../lib/whatsNew";
import "../styles/new.css";

/** What changed lately: tools the daily run spotted, reviews that were updated, and the latest AI news from the video library. */
export function WhatsNew() {
  const { tools: all } = useCatalog();
  const { trends } = useFeed();
  const spotted = all.filter((t) => !t.reviewed) as unknown as DiscoveredTool[];
  const items = newItems(spotted, tools, new Date().toISOString().slice(0, 10));
  const groups = [
    { id: "spotted", title: "Spotted by the daily run", blurb: "New tools and models found automatically in announcements and launch sites, so the list can include mistakes. Not reviewed yet: we haven't tested them, and we make no claims about cost, difficulty or USC access." },
    { id: "reviewed", title: "Reviews updated", blurb: "Tools whose reviews we re-checked recently." },
  ] as const;
  return (
    <>
      <header className="page-head">
        <h1 className="display-s">What's new</h1>
        <p className="body-l muted measure">
          AI tools change fast, so each review here shows when it was last checked, and the daily run looks for new ones. This page shows what changed in the last three
          months.
        </p>
        <p className="body-m">
          <a href="/feed.xml" className="btn tonal sm state">
            <Icon name="rss_feed" size={18} />
            Follow with an RSS reader
          </a>
        </p>
      </header>
      {groups.map((g) => {
        const list = items.filter((i) => i.kind === g.id);
        return (
          <section key={g.id} className="section" aria-labelledby={`new-${g.id}`}>
            <h2 id={`new-${g.id}`} className="headline-m">
              {g.title}
            </h2>
            <p className="body-m muted measure">{g.blurb}</p>
            {list.length === 0 ? (
              <p className="body-l">Nothing new here in the last three months.</p>
            ) : (
              <ul className="new-list">
                {list.map((i) => (
                  <li key={i.id} className="new-item card outlined">
                    <div className="new-item-head">
                      <h3 className="title-m">
                        <Link to={i.path}>{i.title.replace(/: (new, not reviewed yet|review updated)$/, "")}</Link>
                      </h3>
                      <time className="label-m muted" dateTime={i.date}>
                        {longDate(i.date)}
                      </time>
                    </div>
                    <p className="body-m">{i.summary}</p>
                    {i.kind === "spotted" && (
                      <div className="new-flags">
                        <NotReviewed />
                        <span className="label-m muted">{i.sources > 1 ? `Seen in ${i.sources} sources` : "Seen in one source"}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {trends.length > 0 && (
        <section className="section" aria-labelledby="new-trends">
          <div className="section-head">
            <h2 id="new-trends" className="headline-m">
              In the news
            </h2>
            <Link to="/watch?tab=trends" className="btn text state">
              All trends
            </Link>
          </div>
          <div className="grid cols-videos">
            {trends.slice(0, 6).map((t) => (
              <TrendCard key={t.id} trend={t} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
