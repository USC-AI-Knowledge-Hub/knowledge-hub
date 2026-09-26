import { Link, useParams } from "react-router";
import { Icon } from "../components/Icon";
import { Bars, Level } from "../components/Level";
import { ToolMark } from "../components/ToolMark";
import { VideoRow } from "../components/VideoCard";
import { modules } from "../data/learn";
import { TASK_LABEL, toolById } from "../data/tools";
import { DIFFICULTIES, DIFFICULTY_BLURB, DIFFICULTY_LABEL } from "../data/types";
import { useFeed } from "../lib/feed";
import { longDate } from "../lib/format";
import { NotFound } from "./NotFound";
import { COST_LABEL, UscBadge } from "./Tools";

function List({ items, tone }: { items: string[]; tone: "good" | "bad" }) {
  return (
    <ul className={`plist ${tone}`}>
      {items.map((x) => (
        <li key={x} className="body-m">
          <Icon name={tone === "good" ? "check_circle" : "block"} size={20} />
          {x}
        </li>
      ))}
    </ul>
  );
}

export function ToolPage() {
  const { id = "" } = useParams();
  const tool = toolById.get(id);
  const { feed } = useFeed();
  if (!tool) return <NotFound />;

  const videos = (feed?.videos ?? []).filter((v) => v.tools.includes(tool.id));
  const related = modules.filter((m) => m.tools.includes(tool.id)).slice(0, 4);

  return (
    <>
      <header className="page-head tool-head">
        <Link to="/tools" className="crumb">
          <Icon name="arrow_back" />
          All tools
        </Link>
        <div className="tool-hero">
          <ToolMark tool={tool} size={96} />
          <div>
            <h1 className="display-s">{tool.name}</h1>
            <p className="body-m muted">by {tool.maker}</p>
          </div>
        </div>
        <p className="headline-s measure tool-bestfor">{tool.bestFor}</p>
        <div className="tool-card-meta">
          <Level level={tool.difficulty} />
          <span className="label-m muted">{COST_LABEL[tool.cost]}</span>
          <UscBadge usc={tool.usc} />
          <span className="label-m muted">{tool.tasks.map((t) => TASK_LABEL[t]).join(", ")}</span>
        </div>
        {tool.uscNote && (
          <p className="usc-note body-m measure">
            <Icon name="school" size={20} />
            {tool.uscNote}
          </p>
        )}
        <div className="hero-actions">
          <a href={tool.url} target="_blank" rel="noreferrer" className="btn filled state">
            <Icon name="open_in_new" />
            Open {tool.name}
          </a>
          <a href="#quickstart" className="btn outlined state">
            5-minute quick start
          </a>
        </div>
      </header>

      <section className="section" aria-labelledby="levels-h">
        <div className="section-head">
          <div>
            <h2 id="levels-h" className="headline-m">
              Learn {tool.name}, level by level
            </h2>
            <p className="body-m muted">{videos.length ? "Updated daily. Start in the column that matches you." : "Videos appear here after the first daily run."}</p>
          </div>
          <Link to={`/watch?tool=${tool.id}`} className="btn text state">
            All {tool.name} videos
          </Link>
        </div>
        <div className="level-cols">
          {DIFFICULTIES.map((d) => {
            const list = videos.filter((v) => v.difficulty === d).sort((a, b) => b.score - a.score);
            return (
              <div key={d} className={`level-col ${d}`}>
                <div className="level-col-head">
                  <Bars level={d} />
                  <h3 className="title-m">{DIFFICULTY_LABEL[d]}</h3>
                  <span className="label-m">{list.length}</span>
                </div>
                <p className="body-s level-col-blurb">{DIFFICULTY_BLURB[d]}</p>
                <div className="level-col-list">
                  {list.slice(0, 4).map((v) => (
                    <VideoRow key={v.id} video={v} />
                  ))}
                  {!list.length && <p className="body-s muted">Nothing at this level yet.</p>}
                </div>
                {list.length > 4 && (
                  <Link to={`/watch?tool=${tool.id}&level=${d}`} className="btn text sm state">
                    {list.length - 4} more
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="section profile" aria-label="Tool review">
        <div className="profile-main">
          <div id="quickstart" className="card filled quickstart">
            <h2 className="headline-s">5-minute quick start</h2>
            <ol>
              {tool.quickStart.map((s) => (
                <li key={s} className="body-l">
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <div className="profile-pair">
            <div>
              <h2 className="title-l">Best uses</h2>
              <List items={tool.bestUses} tone="good" />
            </div>
            <div>
              <h2 className="title-l">Poor uses</h2>
              <List items={tool.poorUses} tone="bad" />
            </div>
          </div>
          <div>
            <h2 className="title-l">What makes it different</h2>
            <p className="body-l measure">{tool.different}</p>
          </div>
          <div className="profile-pair">
            <div>
              <h2 className="title-l">Strengths</h2>
              <List items={tool.strengths} tone="good" />
            </div>
            <div>
              <h2 className="title-l">Weaknesses</h2>
              <List items={tool.weaknesses} tone="bad" />
            </div>
          </div>
        </div>
        <aside className="profile-side">
          <div className="card outlined side-card">
            <Icon name="shield_person" />
            <h2 className="title-m">Privacy and data</h2>
            <p className="body-m">{tool.privacy}</p>
          </div>
          <div className="card outlined side-card">
            <Icon name="gavel" />
            <h2 className="title-m">Academic integrity</h2>
            <p className="body-m">{tool.integrity}</p>
          </div>
          <div className="card outlined side-card">
            <Icon name="event_available" />
            <h2 className="title-m">Review status</h2>
            <p className="body-m">
              Last reviewed {longDate(tool.lastReviewed)}
              <br />
              Next review {longDate(tool.nextReview)}
            </p>
            <p className="body-s muted">Reviewed by the USC AI Knowledge Hub student team.</p>
          </div>
          {related.length > 0 && (
            <div className="card outlined side-card">
              <Icon name="school" />
              <h2 className="title-m">Lessons that use it</h2>
              <ul className="side-links">
                {related.map((m) => (
                  <li key={m.id}>
                    <Link to={`/learn/${m.id}`} className="body-m">
                      {m.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
