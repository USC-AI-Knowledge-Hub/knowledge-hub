import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { ToolMark } from "../components/ToolMark";
import { COST_LABEL } from "../components/ToolProfile";
import { COST_TEXT, USC_LABEL, differences, pairSlug, pairsFor, parsePair, toolsFor } from "../data/compare";
import { tools } from "../data/tools";
import type { Tool } from "../data/types";
import { longDate } from "../lib/format";
import { NotFound } from "./NotFound";
import "../styles/compare.css";

const MAX = 3;
const ROWS: { id: string; label: string; cell: (t: Tool) => React.ReactNode }[] = [
  { id: "best", label: "Best for", cell: (t) => <p className="body-m">{t.bestFor}</p> },
  { id: "cost", label: "Cost", cell: (t) => <p className="body-m">{COST_TEXT[t.cost]}</p> },
  { id: "level", label: "Getting started", cell: (t) => <Level level={t.difficulty} /> },
  { id: "usc", label: "USC access", cell: (t) => <p className="body-m">{USC_LABEL[t.usc]}{t.uscNote ? `. ${t.uscNote}` : ""}</p> },
  { id: "different", label: "What makes it different", cell: (t) => <p className="body-m">{t.different}</p> },
  { id: "uses", label: "Good for", cell: (t) => <ul className="cmp-list">{t.bestUses.map((x) => <li key={x} className="body-m">{x}</li>)}</ul> },
  { id: "poor", label: "Not good for", cell: (t) => <ul className="cmp-list">{t.poorUses.map((x) => <li key={x} className="body-m">{x}</li>)}</ul> },
  { id: "strengths", label: "Strengths", cell: (t) => <ul className="cmp-list">{t.strengths.map((x) => <li key={x} className="body-m">{x}</li>)}</ul> },
  { id: "weak", label: "Limits", cell: (t) => <ul className="cmp-list">{t.weaknesses.map((x) => <li key={x} className="body-m">{x}</li>)}</ul> },
  { id: "privacy", label: "Privacy", cell: (t) => <p className="body-m">{t.privacy}</p> },
  { id: "integrity", label: "Academic integrity", cell: (t) => <p className="body-m">{t.integrity}</p> },
  { id: "reviewed", label: "Last reviewed", cell: (t) => <p className="body-m">{longDate(t.lastReviewed)}</p> },
];

/** Compare two or three reviewed tools side by side: at /tools/compare (pick any) and /tools/compare/a-vs-b (the popular matchups). */
export function Compare() {
  const { pair } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const fromPair = pair ? parsePair(pair) : null;
  if (pair && !fromPair) return <NotFound />;

  const wanted = fromPair ?? (["a", "b", "c"].map((k) => params.get(k)).filter(Boolean) as string[]);
  const ids = (wanted.length ? wanted : ["chatgpt", "claude"]).filter((id, i, all) => all.indexOf(id) === i).slice(0, MAX);
  const chosen = toolsFor(ids);
  const go = (next: string[]) => {
    const unique = next.filter((id, i) => id && next.indexOf(id) === i);
    const q = new URLSearchParams();
    unique.forEach((id, i) => q.set(["a", "b", "c"][i], id));
    navigate(`/tools/compare?${q}`, { replace: !!pair === false });
  };
  const slots = chosen.length < MAX && chosen.length >= 2 ? [...ids, ""] : ids;
  const diffs = differences(chosen);
  const cols = Math.max(chosen.length, 2);

  return (
    <>
      <header className="page-head">
        <Link to="/tools" className="crumb">
          <Icon name="arrow_back" />
          All tools
        </Link>
        <h1 className="display-s">{chosen.length >= 2 ? `${chosen.map((t) => t.name).join(" vs ")}` : "Compare AI tools"}</h1>
        <p className="body-l muted measure">
          Side by side, from our reviews. Pick up to three tools. Each review shows when it was last checked, and tools we haven't reviewed aren't listed here.
        </p>
      </header>

      <section className="cmp-pickers" aria-label="Choose tools to compare">
        {slots.map((id, i) => (
          <div key={i} className="cmp-picker">
            <label htmlFor={`cmp-${i}`} className="label-l">
              {i === 0 ? "First tool" : i === 1 ? "Second tool" : "Third tool (optional)"}
            </label>
            <select id={`cmp-${i}`} value={id} onChange={(e) => go(slots.map((x, j) => (j === i ? e.target.value : x)))}>
              {i >= 2 && <option value="">None</option>}
              {tools.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </section>

      {chosen.length < 2 ? (
        <p className="body-l">Pick two tools to compare them.</p>
      ) : (
        <>
          {diffs.length > 0 && (
            <section className="section" aria-labelledby="glance-h">
              <h2 id="glance-h" className="headline-s">
                At a glance
              </h2>
              <ul className="cmp-glance body-l">
                {diffs.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
          )}
          <div className="cmp-grid" style={{ ["--cols" as string]: cols }}>
            <div className="cmp-head" role="row">
              {chosen.map((t) => (
                <Link key={t.id} to={`/tools/${t.id}`} className="cmp-tool card outlined state">
                  <ToolMark tool={t} size={48} />
                  <span className="title-m">{t.name}</span>
                  <span className="body-s muted">by {t.maker} · {COST_LABEL[t.cost]}</span>
                  <span className="label-m cmp-open">Full review</span>
                </Link>
              ))}
            </div>
            {ROWS.map((r) => (
              <section key={r.id} className="cmp-row" aria-labelledby={`row-${r.id}`}>
                <h2 id={`row-${r.id}`} className="title-s">
                  {r.label}
                </h2>
                <div className="cmp-cells">
                  {chosen.map((t) => (
                    <div key={t.id} className="cmp-cell">
                      <span className="label-m muted cmp-cell-tool">{t.name}</span>
                      {r.cell(t)}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <section className="section" aria-labelledby="also-h">
            <h2 id="also-h" className="headline-s">
              Other comparisons
            </h2>
            <ul className="chip-row">
              {chosen.slice(0, 1).flatMap((t) =>
                pairsFor(t.id).map((other) => {
                  const o = tools.find((x) => x.id === other);
                  return o ? (
                    <li key={other}>
                      <Link className="chip state" to={`/tools/compare/${pairSlug(t.id, other)}`}>
                        {t.name} vs {o.name}
                      </Link>
                    </li>
                  ) : null;
                }),
              )}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
