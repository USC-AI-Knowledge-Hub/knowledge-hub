import { Link, useParams } from "react-router";
import { CourseCard } from "../components/CourseCard";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { TalkCard } from "../components/TalkCard";
import { ToolMark } from "../components/ToolMark";
import { VideoCard } from "../components/VideoCard";
import { coursesFor } from "../data/courses";
import { lessonByModule } from "../data/guided";
import { moduleById, paths } from "../data/learn";
import { talksFor } from "../data/talks";
import { toolById } from "../data/tools";
import { live, liveTalk, useCourseStatus } from "../lib/courses";
import { useFeed } from "../lib/feed";
import { minutesLabel } from "../lib/format";
import { useProgress } from "../lib/progress";
import { NotFound } from "./NotFound";

export function ModulePage() {
  const { id = "" } = useParams();
  const m = moduleById.get(id);
  const { feed } = useFeed();
  const { isDone, toggle } = useProgress();
  const status = useCourseStatus();
  if (!m) return <NotFound />;

  // Courses at this lesson's level first, then the closest levels, shortest first.
  const rank = { beginner: 0, intermediate: 1, advanced: 2 };
  const moduleCourses = coursesFor(m.id)
    .map((c) => live(c, status))
    .filter((c) => c.available)
    .sort((a, b) => Math.abs(rank[a.difficulty] - rank[m.difficulty]) - Math.abs(rank[b.difficulty] - rank[m.difficulty]) || a.hours - b.hours);
  const curated = m.curated.filter((c) => status?.curated[c.id]?.ok ?? true);

  // Talks listing this lesson first are the closest fit; at most three, so lessons stay the focus.
  const moduleTalks = talksFor(m.id)
    .map((t) => liveTalk(t, status))
    .filter((t) => t.available)
    .sort((a, b) => a.modules.indexOf(m.id) - b.modules.indexOf(m.id))
    .slice(0, 3);

  const done = isDone(m.id);
  const curatedIds = new Set(curated.map((c) => c.id));
  const fresh = (feed?.videos ?? [])
    .filter((v) => v.topics.includes(m.topic) && !curatedIds.has(v.id))
    // Prefer videos at this lesson's level, then the best-rated.
    .sort((a, b) => Number(b.difficulty === m.difficulty) - Number(a.difficulty === m.difficulty) || b.score - a.score)
    .slice(0, 6);
  const inPaths = paths.filter((p) => p.steps.some((s) => s.module === m.id));
  const nextInPath = inPaths
    .map((p) => {
      const i = p.steps.findIndex((s) => s.module === m.id);
      const next = p.steps[i + 1];
      return next ? { path: p, next: moduleById.get(next.module)! } : null;
    })
    .find(Boolean);

  return (
    <>
      <header className="page-head">
        <Link to="/learn" className="crumb">
          <Icon name="arrow_back" />
          Learn
        </Link>
        <div className="module-meta">
          <Level level={m.difficulty} />
          <span className="label-l muted">{minutesLabel(m.minutes)}</span>
          <span className="label-l muted">{m.track === "foundations" ? "AI 101" : "AI skills"}</span>
        </div>
        <h1 className="display-s measure">{m.title}</h1>
        <p className="headline-s muted measure module-summary">{m.summary}</p>
        {lessonByModule.has(m.id) && (
          <Link to={`/learn/lesson/${m.id}`} className="btn filled state" style={{ marginTop: 20 }}>
            <Icon name="school" />
            Take the guided lesson
          </Link>
        )}
      </header>

      <div className="module-layout">
        <article className="module-body">
          <section>
            <h2 className="title-l q-h">
              <span className="q-mark">1</span>What is it?
            </h2>
            <p className="body-l measure">{m.what}</p>
          </section>
          <section>
            <h2 className="title-l q-h">
              <span className="q-mark">2</span>Why does it matter to me?
            </h2>
            <p className="body-l measure">{m.why}</p>
            <ul className="ideas">
              {m.keyIdeas.map((k) => (
                <li key={k} className="body-l">
                  {k}
                </li>
              ))}
            </ul>
          </section>
          <section className="tryit">
            <h2 className="title-l q-h">
              <span className="q-mark">3</span>Show me how
            </h2>
            <div className="card filled tryit-card">
              <p className="headline-s">{m.tryIt.title}</p>
              <ol>
                {m.tryIt.steps.map((s) => (
                  <li key={s} className="body-l">
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            {m.watchFor && (
              <p className="watchfor body-m measure">
                <Icon name="warning" size={20} />
                {m.watchFor}
              </p>
            )}
          </section>

          {moduleCourses.length > 0 && (
            <section aria-labelledby="courses-h">
              <h2 id="courses-h" className="headline-s watch-h">
                Go deeper with a full course
              </h2>
              <p className="body-m muted measure sub-h">Complete, free courses that cover this lesson in depth. Pick one; you don't need them all.</p>
              <div className="grid cols-videos">
                {moduleCourses.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </section>
          )}

          {(curated.length > 0 || fresh.length > 0) && (
            <section>
              <h2 className="headline-s watch-h">Watch</h2>
              {curated.length > 0 && (
                <>
                  <p className="label-l muted sub-h">Editors' picks</p>
                  <div className="grid cols-videos">
                    {curated.map((c) => (
                      <VideoCard key={c.id} video={{ ...c, duration: c.minutes * 60 }} />
                    ))}
                  </div>
                </>
              )}
              {fresh.length > 0 && (
                <>
                  <p className="label-l muted sub-h">Fresh from this week's library</p>
                  <div className="grid cols-videos">
                    {fresh.map((v) => (
                      <VideoCard key={v.id} video={v} isNew={v.firstSeen === feed?.runDate} />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {moduleTalks.length > 0 && (
            <section aria-labelledby="talks-h">
              <h2 id="talks-h" className="headline-s watch-h">
                Talks and debates
              </h2>
              <p className="body-m muted measure sub-h">
                The bigger picture from researchers and critics. <Link to="/watch?tab=talks">All talks and podcasts</Link>
              </p>
              <div className="grid cols-videos">
                {moduleTalks.map((t) => (
                  <TalkCard key={t.id} talk={t} compact />
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="module-side">
          <button type="button" className={`btn ${done ? "tonal" : "filled"} state complete-btn`} onClick={() => toggle(m.id)} aria-pressed={done}>
            <Icon name={done ? "check_circle" : "radio_button_unchecked"} filled={done} />
            {done ? "Completed" : "Mark as complete"}
          </button>
          {nextInPath && (
            <Link to={`/learn/${nextInPath.next.id}`} className="card outlined side-card next-card state">
              <span className="label-m muted">Next in {nextInPath.path.title}</span>
              <span className="title-m">{nextInPath.next.title}</span>
            </Link>
          )}
          <div className="card outlined side-card">
            <h2 className="title-m">Tools for this lesson</h2>
            <ul className="side-tools">
              {m.tools.map((tid) => {
                const t = toolById.get(tid);
                return t ? (
                  <li key={tid}>
                    <Link to={`/tools/${tid}`} className="side-tool state">
                      <ToolMark tool={t} size={32} />
                      <span className="title-s">{t.name}</span>
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
