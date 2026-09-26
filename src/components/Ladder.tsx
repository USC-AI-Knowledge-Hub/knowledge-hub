import { Link } from "react-router";
import { tools } from "../data/tools";
import { DIFFICULTIES, DIFFICULTY_LABEL, type Video } from "../data/types";
import { Bars } from "./Level";
import { ToolMark } from "./ToolMark";

/**
 * The library at a glance: tools down the side, difficulty across the top.
 * Each cell is a doorway into the filtered video list. Cell color deepens
 * with the number of videos; a dot marks cells that grew today.
 */
export function Ladder({ videos, runDate, rows = 7 }: { videos: Video[]; runDate: string | null; rows?: number }) {
  const counts = new Map<string, { total: number; fresh: number }>();
  for (const v of videos) {
    for (const t of v.tools.slice(0, 1)) {
      const key = `${t}:${v.difficulty}`;
      const c = counts.get(key) ?? { total: 0, fresh: 0 };
      c.total++;
      if (v.firstSeen === runDate) c.fresh++;
      counts.set(key, c);
    }
  }
  const totalFor = (id: string) => DIFFICULTIES.reduce((s, d) => s + (counts.get(`${id}:${d}`)?.total ?? 0), 0);
  const ranked = [...tools].sort((a, b) => totalFor(b.id) - totalFor(a.id)).slice(0, rows);
  const max = Math.max(1, ...[...counts.values()].map((c) => c.total));

  let i = 0;
  return (
    <div className="ladder" role="table" aria-label="Videos by tool and difficulty">
      <div className="ladder-row ladder-head" role="row">
        <span role="columnheader" className="visually-hidden">
          Tool
        </span>
        {DIFFICULTIES.map((d) => (
          <span key={d} role="columnheader" className={`ladder-col ${d}`}>
            <Bars level={d} />
            <span>{DIFFICULTY_LABEL[d]}</span>
          </span>
        ))}
      </div>
      {ranked.map((t) => (
        <div key={t.id} className="ladder-row" role="row">
          <Link role="rowheader" to={`/tools/${t.id}`} className="ladder-tool">
            <ToolMark tool={t} size={30} />
            <span className="title-s">{t.name}</span>
          </Link>
          {DIFFICULTIES.map((d) => {
            const c = counts.get(`${t.id}:${d}`);
            const n = c?.total ?? 0;
            const strength = n ? 18 + Math.round((n / max) * 82) : 0;
            return (
              <Link
                key={d}
                role="cell"
                to={`/watch?tool=${t.id}&level=${d}`}
                className={`ladder-cell ${d} ${n ? "" : "zero"}`}
                style={{ "--s": `${strength}%`, "--i": i++ } as React.CSSProperties}
                aria-label={`${t.name}, ${DIFFICULTY_LABEL[d]}: ${n} videos${c?.fresh ? `, ${c.fresh} new today` : ""}`}
              >
                <span className="ladder-n">{n}</span>
                {c?.fresh ? <span className="ladder-dot" aria-hidden="true" /> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
