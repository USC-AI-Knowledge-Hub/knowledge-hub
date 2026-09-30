import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { Ladder } from "../components/Ladder";
import { TrendCard } from "../components/TrendCard";
import { VideoCard } from "../components/VideoCard";
import { moduleById, paths } from "../data/learn";
import { TASK_ICON, TASK_LABEL, tools } from "../data/tools";
import type { Task } from "../data/types";
import { useFeed } from "../lib/feed";
import { longDate, minutesLabel } from "../lib/format";
import { useProgress } from "../lib/progress";
import { SHAPES } from "../lib/shapes";
import { WavyProgress } from "../components/WavyProgress";

const PATH_SHAPES = [SHAPES.cookie9, SHAPES.clover4, SHAPES.sunny, SHAPES.cookie6];

export function Home() {
  const { feed, today, trends } = useFeed();
  const { isDone } = useProgress();
  const videos = feed?.videos ?? [];
  const picks = (today.length ? today : [...videos].sort((a, b) => b.score - a.score)).slice(0, 6);
  const taskCounts = new Map<Task, number>();
  for (const t of tools) for (const k of t.tasks) taskCounts.set(k, (taskCounts.get(k) ?? 0) + 1);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1 className="display-l">Learn AI. Use AI. Understand what's next.</h1>
          <p className="body-l muted measure">
            Short learning paths, honest tool guides, and a video library that refreshes every morning, sorted by tool and by how much you
            already know.
          </p>
          <div className="hero-actions">
            <Link to="/learn" className="btn filled state">
              <Icon name="route" />
              Start a learning path
            </Link>
            <Link to="/watch" className="btn outlined state">
              <Icon name="smart_display" />
              Browse videos
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <div className="hero-panel-head">
            <div>
              <h2 className="title-l">The library today</h2>
              <p className="body-s muted">
                {feed?.runDate
                  ? // Counts every video first seen that day, not just the last run's additions.
                    `Updated ${longDate(feed.runDate)}. ${today.length} new, ${videos.length} in total.`
                  : "The first daily update hasn't run yet."}
              </p>
            </div>
            <Link to="/about" className="icon-btn state" aria-label="How videos are chosen">
              <Icon name="info" />
            </Link>
          </div>
          <Ladder videos={videos} runDate={feed?.runDate ?? null} />
          <p className="body-s muted ladder-legend">
            <span className="ladder-dot static" aria-hidden="true" /> grew today. Pick any cell to watch.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="paths-h">
        <div className="section-head">
          <div>
            <h2 id="paths-h" className="headline-m">
              Pick a path
            </h2>
            <p className="body-m muted">Short, ordered modules. Your progress stays in this browser.</p>
          </div>
          <Link to="/learn" className="btn text state">
            All lessons
          </Link>
        </div>
        <div className="paths">
          {paths.map((p, i) => {
            const total = p.steps.reduce((s, st) => s + (moduleById.get(st.module)?.minutes ?? 0), 0);
            const done = p.steps.filter((s) => isDone(s.module)).length;
            return (
              <Link key={p.id} to={`/learn/path/${p.id}`} className={`path-card card state tone-${i}`}>
                <svg className="path-shape" viewBox="0 0 100 100" aria-hidden="true">
                  <path d={PATH_SHAPES[i % PATH_SHAPES.length]} />
                </svg>
                <Icon name={p.icon} className="path-icon" size={32} />
                <span className="label-l path-aud">{p.audience}</span>
                <h3 className="headline-s">{p.title}</h3>
                <p className="body-m">{p.summary}</p>
                <span className="path-foot">
                  <span className="label-m">
                    {p.steps.length} modules, {minutesLabel(total)}
                  </span>
                  {done > 0 && <WavyProgress value={done / p.steps.length} label={`${p.title} progress`} />}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section" aria-labelledby="today-h">
        <div className="section-head">
          <div>
            <h2 id="today-h" className="headline-m">
              {today.length ? "New today" : "Top picks"}
            </h2>
            <p className="body-m muted">
              {today.length
                ? "Picked up by this morning's run and ranked for teaching value, not hype."
                : "The highest-rated videos in the library right now."}
            </p>
          </div>
          <Link to={today.length ? "/watch?new=1" : "/watch"} className="btn text state">
            See all
          </Link>
        </div>
        {picks.length ? (
          <div className="grid cols-videos">
            {picks.map((v) => (
              <VideoCard key={v.id} video={v} isNew={v.firstSeen === feed?.runDate} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <Icon name="schedule" size={32} />
            <p className="title-m">Videos arrive with the first daily run</p>
            <p className="body-m muted measure">
              The pipeline runs every morning in GitHub Actions. Until then, each lesson in Learn has hand-picked videos to start with.
            </p>
            <Link to="/learn" className="btn tonal sm state">
              Go to lessons
            </Link>
          </div>
        )}
      </section>

      {trends.length > 0 && (
        <section className="section" aria-labelledby="trends-h">
          <div className="section-head">
            <div>
              <h2 id="trends-h" className="headline-m">
                What's new in AI
              </h2>
              <p className="body-m muted">Launches, research, talks and news from the last three weeks, official channels first.</p>
            </div>
            <Link to="/watch?tab=trends" className="btn text state">
              All trends
            </Link>
          </div>
          <div className="grid cols-videos">
            {trends.slice(0, 4).map((t) => (
              <TrendCard key={t.id} trend={t} />
            ))}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="task-h">
        <div className="section-head">
          <div>
            <h2 id="task-h" className="headline-m">
              What are you trying to do?
            </h2>
            <p className="body-m muted">Start from the job, and we'll show you the tools that fit it.</p>
          </div>
        </div>
        <div className="tasks">
          {(Object.keys(TASK_LABEL) as Task[]).map((k) => (
            <Link key={k} to={`/tools?task=${k}`} className="task state">
              <Icon name={TASK_ICON[k]} size={28} />
              <span className="title-s">{TASK_LABEL[k]}</span>
              <span className="body-s muted">{taskCounts.get(k) ?? 0} tools</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
