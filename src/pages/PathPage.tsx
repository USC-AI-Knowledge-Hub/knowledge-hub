import { Link, useParams } from "react-router";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { WavyProgress } from "../components/WavyProgress";
import { lessonByModule } from "../data/guided";
import { guidedPathById, pathModules } from "../data/guided/paths";
import { moduleById, pathById } from "../data/learn";
import { minutesLabel } from "../lib/format";
import { guidedStore, useGuided } from "../lib/guided";
import { useProgress } from "../lib/progress";
import "../styles/guided.css";
import { NotFound } from "./NotFound";

/** A learning path as a guided course: welcome, outcomes, units of lessons, and a capstone. */
export function PathPage() {
  const { id = "" } = useParams();
  const path = pathById.get(id);
  const course = guidedPathById.get(id);
  const { isDone, toggle } = useProgress();
  const guided = useGuided();
  if (!path || !course) return <NotFound />;

  const order = pathModules(course);
  const complete = order.filter((m) => isDone(m)).length;
  const next = order.find((m) => !isDone(m));
  const total = order.reduce((s, m) => s + (moduleById.get(m)?.minutes ?? 0), 0);
  const href = (m: string) => (lessonByModule.has(m) ? `/learn/path/${id}/${m}` : `/learn/${m}`);
  const ticks = guidedStore.capstone(id, course.capstone.checklist.length);
  const nextModule = next ? moduleById.get(next) : undefined;
  const started = next ? (guided.lessons[next]?.step ?? 0) > 0 : false;

  let n = 0;
  return (
    <div className="course">
      <header className="page-head">
        <Link to="/learn" className="crumb">
          <Icon name="arrow_back" />
          Learn
        </Link>
        <p className="label-l muted">
          Guided course · {path.audience} · {order.length} lessons, {minutesLabel(total)}
        </p>
        <h1 className="display-s">{path.title}</h1>
        <p className="body-l measure">{course.welcome}</p>
        <div className="path-progress">
          <WavyProgress value={complete / order.length} label={`${complete} of ${order.length} lessons done`} />
          <span className="label-l">
            {complete} of {order.length} lessons done
          </span>
        </div>
        {nextModule ? (
          <Link to={href(nextModule.id)} className="btn filled state course-cta">
            <Icon name="play_arrow" />
            {complete || started ? "Continue" : "Start"}: {nextModule.title}
          </Link>
        ) : (
          <a href="#capstone" className="btn filled state course-cta">
            <Icon name="flag" />
            All lessons done. On to the capstone
          </a>
        )}
      </header>

      <section className="card filled course-outcomes" aria-labelledby="outcomes">
        <h2 id="outcomes" className="title-l">
          By the end, you'll be able to
        </h2>
        <ul className="ideas">
          {course.outcomes.map((o) => (
            <li key={o} className="body-l">
              {o}
            </li>
          ))}
        </ul>
      </section>

      {course.units.map((u, ui) => (
        <section key={u.title} className="course-unit" aria-labelledby={`unit-${ui}`}>
          <p className="label-l muted">Unit {ui + 1}</p>
          <h2 id={`unit-${ui}`} className="headline-s">
            {u.title}
          </h2>
          <p className="body-m muted measure">{u.intro}</p>
          <ol className="stepper">
            {u.modules.map((mid) => {
              const m = moduleById.get(mid)!;
              const note = path.steps.find((s) => s.module === mid)?.note;
              const done = isDone(mid);
              const lesson = guided.lessons[mid];
              const current = mid === next;
              n += 1;
              return (
                <li key={mid} className={`step ${done ? "done" : ""} ${current ? "current" : ""}`}>
                  <button
                    type="button"
                    className="step-mark state"
                    onClick={() => toggle(mid)}
                    aria-label={done ? `Mark “${m.title}” as not done` : `Mark “${m.title}” as done`}
                    aria-pressed={done}
                  >
                    {done ? <Icon name="check" /> : <span className="title-m">{n}</span>}
                  </button>
                  <Link to={href(mid)} className="step-card card state">
                    {note && <span className="label-l muted">{note}</span>}
                    <span className="title-l">{m.title}</span>
                    <span className="body-m muted">{m.summary}</span>
                    <span className="step-meta">
                      <Level level={m.difficulty} />
                      <span className="label-m muted">{minutesLabel(m.minutes)}</span>
                      {lessonByModule.has(mid) ? (
                        <span className="label-m course-tag">
                          <Icon name="school" size={16} />
                          Guided
                        </span>
                      ) : null}
                      {lesson?.passed ? (
                        <span className="label-m course-tag passed">
                          <Icon name="check_circle" filled size={16} />
                          Check passed
                        </span>
                      ) : lesson && lesson.step > 0 ? (
                        <span className="label-m course-tag">In progress</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <section id="capstone" className="card outlined course-capstone" aria-labelledby="capstone-title">
        <p className="label-l muted">Capstone project</p>
        <h2 id="capstone-title" className="headline-s">
          {course.capstone.title}
        </h2>
        <p className="body-l measure">{course.capstone.brief}</p>
        <h3 className="title-m">Steps</h3>
        <ol className="course-capstone-steps">
          {course.capstone.steps.map((s) => (
            <li key={s} className="body-m">
              {s}
            </li>
          ))}
        </ol>
        <h3 className="title-m">Before you call it done</h3>
        <ul className="course-checklist">
          {course.capstone.checklist.map((c, i) => (
            <li key={c}>
              <label className="body-m">
                <input
                  type="checkbox"
                  checked={ticks[i]}
                  onChange={(e) => guidedStore.setCapstone(id, ticks.map((t, j) => (j === i ? e.target.checked : t)))}
                />
                {c}
              </label>
            </li>
          ))}
        </ul>
        <p className="body-s muted">Your ticks stay in this browser.</p>
      </section>
    </div>
  );
}
