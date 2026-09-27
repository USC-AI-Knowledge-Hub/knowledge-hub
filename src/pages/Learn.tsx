import { Link, useSearchParams } from "react-router";
import { CourseCard } from "../components/CourseCard";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { WavyProgress } from "../components/WavyProgress";
import { courseById, courses } from "../data/courses";
import { moduleById, modules, paths } from "../data/learn";
import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty, type Module } from "../data/types";
import { live, useCourseStatus } from "../lib/courses";
import { minutesLabel } from "../lib/format";
import { useProgress } from "../lib/progress";

function ModuleTile({ m, done }: { m: Module; done: boolean }) {
  return (
    <Link to={`/learn/${m.id}`} className={`module-tile card state ${done ? "done" : ""}`}>
      <div className="module-tile-top">
        <Level level={m.difficulty} />
        <span className="label-m muted">{minutesLabel(m.minutes)}</span>
        {done && (
          <span className="module-done label-m">
            <Icon name="check_circle" filled size={18} />
            Done
          </span>
        )}
      </div>
      <h3 className="title-l">{m.title}</h3>
      <p className="body-m muted">{m.summary}</p>
    </Link>
  );
}

/** One strong starting course per level, then one per kind of source. */
const FEATURED = ["anthropic-ai-fluency", "karpathy-deep-dive", "3b1b-neural-networks", "cs50-ai"];

export function Learn() {
  const { isDone, done } = useProgress();
  const status = useCourseStatus();
  const featured = FEATURED.map((id) => live(courseById.get(id)!, status)).filter((c) => c.available);
  const [params, setParams] = useSearchParams();
  const level = params.get("level") as Difficulty | null;
  const show = (track: Module["track"]) => modules.filter((m) => m.track === track && (!level || m.difficulty === level));

  return (
    <>
      <header className="page-head">
        <h1 className="display-s">Learn AI at your own pace</h1>
        <p className="body-l muted measure">
          Each lesson answers three questions: what is it, why does it matter to me, and how do I use it. Follow a path, or pick any lesson on
          its own.
        </p>
        {done.length > 0 && (
          <p className="label-l progress-note">
            <Icon name="emoji_events" filled size={20} />
            {done.length} of {modules.length} lessons done
          </p>
        )}
      </header>

      <section className="section" aria-labelledby="lp-h" style={{ marginTop: 40 }}>
        <h2 id="lp-h" className="headline-m section-head">
          Learning paths
        </h2>
        <div className="path-list">
          {paths.map((p) => {
            const complete = p.steps.filter((s) => isDone(s.module)).length;
            const total = p.steps.reduce((s, st) => s + (moduleById.get(st.module)?.minutes ?? 0), 0);
            return (
              <Link key={p.id} to={`/learn/path/${p.id}`} className="path-row card state">
                <span className="path-row-icon">
                  <Icon name={p.icon} size={28} />
                </span>
                <span className="path-row-body">
                  <span className="title-l">{p.title}</span>
                  <span className="body-m muted">{p.summary}</span>
                  <span className="path-row-steps body-s muted">{p.steps.map((s) => moduleById.get(s.module)?.title).join("  ›  ")}</span>
                </span>
                <span className="path-row-meta">
                  <span className="label-m">{minutesLabel(total)}</span>
                  <WavyProgress value={complete / p.steps.length} label={`${p.title}: ${complete} of ${p.steps.length} done`} />
                  <span className="label-m muted">
                    {complete}/{p.steps.length}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section" aria-labelledby="fc-h">
        <div className="section-head">
          <div>
            <h2 id="fc-h" className="headline-m">
              Full courses
            </h2>
            <p className="body-m muted">
              Complete playlists from Harvard, MIT, Stanford, Berkeley and the companies behind the tools. Free, and checked daily.
            </p>
          </div>
          <Link to="/learn/courses" className="btn tonal state">
            All {courses.length} courses
          </Link>
        </div>
        <div className="grid cols-videos">
          {featured.map((c) => (
            <CourseCard key={c.id} course={c} compact />
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="lib-h">
        <div className="section-head">
          <h2 id="lib-h" className="headline-m">
            All lessons
          </h2>
          <div className="chip-row">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className="chip state"
                aria-pressed={level === d}
                onClick={() => setParams(level === d ? {} : { level: d }, { replace: true, preventScrollReset: true })}
              >
                {level === d && <Icon name="check" />}
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
        </div>
        <h3 className="title-l track-h">AI 101</h3>
        <p className="body-m muted track-sub">How the technology works, and where it breaks.</p>
        <div className="grid cols-auto">
          {show("foundations").map((m) => (
            <ModuleTile key={m.id} m={m} done={isDone(m.id)} />
          ))}
        </div>
        <h3 className="title-l track-h">AI skills</h3>
        <p className="body-m muted track-sub">Practical workflows for study, research, teaching and building.</p>
        <div className="grid cols-auto">
          {show("skills").map((m) => (
            <ModuleTile key={m.id} m={m} done={isDone(m.id)} />
          ))}
        </div>
      </section>
    </>
  );
}
