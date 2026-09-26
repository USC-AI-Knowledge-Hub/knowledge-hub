import { Link, useSearchParams } from "react-router";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { ToolMark } from "../components/ToolMark";
import { TASK_ICON, TASK_LABEL, tools } from "../data/tools";
import { DIFFICULTIES, DIFFICULTY_LABEL, type Cost, type Difficulty, type Task } from "../data/types";
import { useFeed } from "../lib/feed";

export const COST_LABEL: Record<Cost, string> = { free: "Free", freemium: "Free tier", paid: "Paid" };

export function UscBadge({ usc }: { usc: "provided" | "check" | "personal" }) {
  if (usc === "provided")
    return (
      <span className="usc-badge provided">
        <Icon name="verified" filled size={16} />
        USC provides
      </span>
    );
  if (usc === "check")
    return (
      <span className="usc-badge">
        <Icon name="help" size={16} />
        Check USC access
      </span>
    );
  return null;
}

export function Tools() {
  const [params, setParams] = useSearchParams();
  const task = params.get("task") as Task | null;
  const level = params.get("level") as Difficulty | null;
  const { feed } = useFeed();

  const counts = new Map<string, number>();
  for (const v of feed?.videos ?? []) for (const t of v.tools) counts.set(t, (counts.get(t) ?? 0) + 1);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const list = tools.filter((t) => (!task || t.tasks.includes(task)) && (!level || t.difficulty === level));

  return (
    <>
      <header className="page-head">
        <h1 className="display-s">Find the right tool</h1>
        <p className="body-l muted measure">
          Every tool gets the same review: what it's best at, where it fails, what it means for your privacy and your coursework. Reviewed by
          USC AI Knowledge Hub Fellows.
        </p>
      </header>

      <section className="finder" aria-labelledby="finder-h">
        <h2 id="finder-h" className="title-l">
          What are you trying to do?
        </h2>
        <div className="chip-row">
          {(Object.keys(TASK_LABEL) as Task[]).map((k) => (
            <button key={k} type="button" className="chip state" aria-pressed={task === k} onClick={() => set("task", task === k ? null : k)}>
              <Icon name={task === k ? "check" : TASK_ICON[k]} />
              {TASK_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="chip-row">
          <span className="label-l muted finder-sub">Day-one difficulty</span>
          {DIFFICULTIES.map((d) => (
            <button key={d} type="button" className="chip state" aria-pressed={level === d} onClick={() => set("level", level === d ? null : d)}>
              {level === d && <Icon name="check" />}
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
      </section>

      <p className="body-m muted result-count" aria-live="polite">
        {list.length} {list.length === 1 ? "tool" : "tools"}
        {task ? ` for “${TASK_LABEL[task].toLowerCase()}”` : ""}
      </p>

      <div className="grid cols-auto">
        {list.map((t) => (
          <Link key={t.id} to={`/tools/${t.id}`} className="tool-card card state">
            <div className="tool-card-top">
              <ToolMark tool={t} size={56} />
              <div>
                <h3 className="title-l">{t.name}</h3>
                <p className="body-s muted">{t.maker}</p>
              </div>
            </div>
            <p className="body-m">{t.bestFor}</p>
            <div className="tool-card-meta">
              <Level level={t.difficulty} />
              <span className="label-m muted">{COST_LABEL[t.cost]}</span>
              <UscBadge usc={t.usc} />
              {counts.get(t.id) ? (
                <span className="label-m muted tool-card-videos">
                  <Icon name="smart_display" size={16} />
                  {counts.get(t.id)}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
