import { Link, useParams } from "react-router";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { WavyProgress } from "../components/WavyProgress";
import { moduleById, pathById } from "../data/learn";
import { minutesLabel } from "../lib/format";
import { useProgress } from "../lib/progress";
import { NotFound } from "./NotFound";

export function PathPage() {
  const { id = "" } = useParams();
  const path = pathById.get(id);
  const { isDone, toggle } = useProgress();
  if (!path) return <NotFound />;

  const steps = path.steps.map((s) => ({ ...s, m: moduleById.get(s.module)! }));
  const complete = steps.filter((s) => isDone(s.module)).length;
  const next = steps.find((s) => !isDone(s.module));
  const total = steps.reduce((s, st) => s + st.m.minutes, 0);

  return (
    <>
      <header className="page-head">
        <Link to="/learn" className="crumb">
          <Icon name="arrow_back" />
          Learn
        </Link>
        <h1 className="display-s">{path.title}</h1>
        <p className="body-l muted measure">{path.summary}</p>
        <div className="path-progress">
          <WavyProgress value={complete / steps.length} label={`${complete} of ${steps.length} modules done`} />
          <span className="label-l">
            {complete} of {steps.length} done, {minutesLabel(total)} in total
          </span>
        </div>
        {next && (
          <Link to={`/learn/${next.module}`} className="btn filled state" style={{ marginTop: 20 }}>
            <Icon name="play_arrow" />
            {complete ? "Continue" : "Start"}: {next.m.title}
          </Link>
        )}
      </header>

      <ol className="stepper">
        {steps.map((s, i) => {
          const done = isDone(s.module);
          const current = s === next;
          return (
            <li key={s.module} className={`step ${done ? "done" : ""} ${current ? "current" : ""}`}>
              <button
                type="button"
                className="step-mark state"
                onClick={() => toggle(s.module)}
                aria-label={done ? `Mark “${s.m.title}” as not done` : `Mark “${s.m.title}” as done`}
                aria-pressed={done}
              >
                {done ? <Icon name="check" /> : <span className="title-m">{i + 1}</span>}
              </button>
              <Link to={`/learn/${s.module}`} className="step-card card state">
                <span className="label-l muted">{s.note}</span>
                <span className="title-l">{s.m.title}</span>
                <span className="body-m muted">{s.m.summary}</span>
                <span className="step-meta">
                  <Level level={s.m.difficulty} />
                  <span className="label-m muted">{minutesLabel(s.m.minutes)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
