import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { PixelMark } from "../components/PixelMark";
import { Segmented } from "../components/Segmented";
import { ToolMap, type ToolMapHandle } from "../components/ToolMap";
import { COST_LABEL, UscBadge } from "../components/ToolProfile";
import { ToolSheet } from "../components/ToolSheet";
import { ToolMark } from "../components/ToolMark";
import { clusterById, clusterOf, clusters, type ClusterId } from "../data/toolMap";
import { TASK_ICON, TASK_LABEL, tools } from "../data/tools";
import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty, type Task } from "../data/types";
import { useFeed } from "../lib/feed";
import { searchTools, type ToolHit } from "../lib/siteSearch";
import "../styles/map.css";

export { COST_LABEL, UscBadge };

type View = "map" | "list";

const EXAMPLES = [
  "make slides from my notes",
  "check if a paper is disputed",
  "transcribe a lecture",
  "find papers for a literature review",
  "debug my Python code",
  "automate a weekly report",
];

/** Everyday phrasings to offer when a search finds nothing. */
const TRY = ["write an essay", "analyze a spreadsheet", "make a presentation", "transcribe a recording", "generate an image", "learn to code"];

/** Keep the strong matches: at most eight, and nothing far weaker than the best (which always stays). */
function strongHits(hits: ToolHit[]): ToolHit[] {
  if (!hits.length) return [];
  const floor = Math.min(hits[0].score, Math.max(10, hits[0].score * 0.25));
  return hits.filter((h) => h.score >= floor).slice(0, 8);
}

function useCyclingPlaceholder(paused: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), 3200);
    return () => clearInterval(t);
  }, [paused]);
  return `Try “${EXAMPLES[i]}”`;
}

function Legend() {
  return (
    <div className="map-legend">
      <h2 className="title-s">How to read the map</h2>
      <ul>
        <li>
          <span className="legend-swatch halo" aria-hidden="true" />
          <span className="body-s">Each colored glow is a category. Its name sits above it.</span>
        </li>
        <li>
          <svg className="legend-line" viewBox="0 0 40 12" aria-hidden="true">
            <path d="M2 6H32" className="edge built-on" />
            <path d="M31 2L38 6L31 10z" className="arrowhead built-on" />
          </svg>
          <span className="body-s">
            <strong>Runs on</strong>: built on that assistant's models.
          </span>
        </li>
        <li>
          <svg className="legend-line" viewBox="0 0 40 12" aria-hidden="true">
            <path d="M2 6H32" className="edge choose" />
            <path d="M31 2L38 6L31 10z" className="arrowhead choose" />
          </svg>
          <span className="body-s">
            <strong>Lets you pick</strong>: you choose the model. Shown when you point at the tool.
          </span>
        </li>
        <li>
          <span className="map-node-usc static" aria-hidden="true">
            <Icon name="verified" filled size={14} />
          </span>
          <span className="body-s">USC provides it to students.</span>
        </li>
      </ul>
    </div>
  );
}

function HitButton({ hit, onOpen }: { hit: ToolHit; onOpen: (id: string) => void }) {
  const t = hit.tool;
  const cat = clusterById.get(clusterOf[t.id]);
  return (
    <li>
      <button type="button" className="map-hit state" onClick={() => onOpen(t.id)}>
        <PixelMark tool={t} size={32} />
        <span className="map-hit-body">
          <span className="title-s">{t.name}</span>
          <span className="body-s muted">{cat?.label}</span>
          {hit.why.length ? (
            <span className="map-hit-why body-s">{hit.why.join(". ")}</span>
          ) : (
            <span className="map-hit-why body-s">{t.bestFor}</span>
          )}
        </span>
      </button>
    </li>
  );
}

function MapView({
  q,
  cluster,
  selected,
  setParam,
  onOpen,
  viewSwitch,
}: {
  viewSwitch: ReactNode;
  q: string;
  cluster: ClusterId | null;
  selected: string | null;
  setParam: (key: string, value: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const map = useRef<ToolMapHandle>(null);
  const [focused, setFocused] = useState(false);
  const placeholder = useCyclingPlaceholder(focused || Boolean(q));

  const hits = useMemo(() => strongHits(searchTools(q)).filter((h) => !cluster || clusterOf[h.tool.id] === cluster), [q, cluster]);
  const highlight = useMemo(() => {
    if (q.trim()) return new Set(hits.map((h) => h.tool.id));
    if (cluster) return new Set(tools.filter((t) => clusterOf[t.id] === cluster).map((t) => t.id));
    return null;
  }, [q, cluster, hits]);

  // Fly to whatever is highlighted, a beat after typing stops.
  const key = highlight ? [...highlight].join(",") : "";
  const first = useRef(true);
  useEffect(() => {
    if (first.current && !key) {
      first.current = false;
      return;
    }
    first.current = false;
    const t = setTimeout(() => map.current?.fit(key ? key.split(",") : undefined), 220);
    return () => clearTimeout(t);
  }, [key]);

  // "/" jumps to the search box, as on most sites with search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable], dialog[open]") || document.querySelector("dialog[open]")) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const clusterTools = cluster ? tools.filter((t) => clusterOf[t.id] === cluster) : [];
  const c = cluster ? clusterById.get(cluster) : null;

  return (
    <section className="map-view" aria-label="Tool map">
      <div className="map-search-row">
        <form
          role="search"
          className="search map-search"
          onSubmit={(e) => {
            e.preventDefault();
            if (hits[0]) onOpen(hits[0].tool.id);
          }}
        >
          <Icon name="travel_explore" />
          <label htmlFor="map-q" className="visually-hidden">
            Describe what you want to do
          </label>
          <input
            id="map-q"
            ref={input}
            type="search"
            autoComplete="off"
            placeholder={placeholder}
            value={q}
            onChange={(e) => setParam("q", e.target.value || null)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-describedby="map-q-hint"
          />
          {q ? (
            <button type="button" className="icon-btn sm-icon state" aria-label="Clear search" onClick={() => setParam("q", null)}>
              <Icon name="close" />
            </button>
          ) : (
            <kbd className="map-kbd" aria-hidden="true">
              /
            </kbd>
          )}
        </form>
        {viewSwitch}
        <p id="map-q-hint" className="visually-hidden">
          Describe a task in your own words. Matching tools stay bright on the map and are listed next to it.
        </p>
      </div>

      <div className="chip-row scroll map-chips" role="group" aria-label="Highlight a category">
        {clusters.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`chip state map-chip cat-${k.id}`}
            aria-pressed={cluster === k.id}
            onClick={() => setParam("cluster", cluster === k.id ? null : k.id)}
          >
            <Icon name={cluster === k.id ? "check" : k.icon} />
            {k.label}
          </button>
        ))}
      </div>

      <div className="map-layout">
        <ToolMap
          handle={map}
          highlight={highlight}
          activeCluster={cluster}
          selected={selected}
          onOpen={onOpen}
          onCluster={(id) => setParam("cluster", cluster === id ? null : id)}
        />

        <aside className="map-panel" aria-label="Matches and legend">
          <div aria-live="polite" className="map-panel-results">
            {q.trim() ? (
              hits.length ? (
                <>
                  <h2 className="title-m">
                    {hits.length} {hits.length === 1 ? "tool fits" : "tools fit"} “{q.trim()}”
                    {c ? ` in ${c.label.toLowerCase()}` : ""}
                  </h2>
                  <ol className="map-hits">
                    {hits.map((h) => (
                      <HitButton key={h.tool.id} hit={h} onOpen={onOpen} />
                    ))}
                  </ol>
                </>
              ) : (
                <div className="map-empty">
                  <h2 className="title-m">No tool matches “{q.trim()}”{c ? ` in ${c.label.toLowerCase()}` : ""}</h2>
                  <p className="body-m muted">Describe the job rather than the tool. For example:</p>
                  <div className="chip-row">
                    {TRY.map((t) => (
                      <button key={t} type="button" className="chip state" onClick={() => setParam("q", t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                  {c && (
                    <button type="button" className="btn text sm state" onClick={() => setParam("cluster", null)}>
                      Search every category
                    </button>
                  )}
                </div>
              )
            ) : c ? (
              <>
                <h2 className="title-m">{c.label}</h2>
                <p className="body-m muted">{c.blurb}</p>
                <ol className="map-hits">
                  {clusterTools.map((t) => (
                    <HitButton key={t.id} hit={{ tool: t, score: 0, why: [] }} onOpen={onOpen} />
                  ))}
                </ol>
              </>
            ) : (
              <div className="map-intro">
                <h2 className="title-m">Pick a tool for the job</h2>
                <p className="body-m muted">
                  Tools that do similar jobs sit together. Type what you want to do, or select any tool for its review, a quick start and
                  videos.
                </p>
              </div>
            )}
          </div>
          <Legend />
        </aside>
      </div>
    </section>
  );
}

function ListView({ onOpen, viewSwitch }: { onOpen: (id: string, e: MouseEvent) => void; viewSwitch: ReactNode }) {
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
  const hrefFor = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("tool", id);
    return `?${next}`;
  };

  return (
    <>
      <div className="map-search-row list-switch">{viewSwitch}</div>
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
          // A real link, so it can open in a new tab; a plain click opens the pop-up instead.
          <Link key={t.id} to={hrefFor(t.id)} className="tool-card card state" onClick={(e) => onOpen(t.id, e)} preventScrollReset>
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

const narrow = () => typeof matchMedia !== "undefined" && matchMedia("(max-width: 599px)").matches;

export function Tools() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [defaultView] = useState<View>(() => (narrow() ? "list" : "map"));
  const view: View = params.get("view") === "list" ? "list" : params.get("view") === "map" ? "map" : defaultView;
  const q = params.get("q") ?? "";
  const clusterParam = params.get("cluster") as ClusterId | null;
  const cluster = clusterParam && clusterById.has(clusterParam) ? clusterParam : null;
  const toolParam = params.get("tool");
  const selected = toolParam && tools.some((t) => t.id === toolParam) ? toolParam : null;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true, state: location.state });
  };

  /** Opening a tool adds a history entry, so Back closes the pop-up. Switching tools inside it doesn't. */
  const open = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("tool", id);
    const inSheet = Boolean(selected);
    setParams(next, { replace: inSheet, preventScrollReset: true, state: { sheet: true } });
  };
  const close = () => {
    if ((location.state as { sheet?: boolean } | null)?.sheet) navigate(-1);
    else setParam("tool", null);
  };

  const viewSwitch = (
      <Segmented<View>
        label="Show tools as"
        value={view}
        onChange={(v) => setParam("view", v === defaultView ? null : v)}
        options={[
          {
            value: "map",
            label: (
              <>
                <Icon name="bubble_chart" />
                Map
              </>
            ),
          },
          {
            value: "list",
            label: (
              <>
                <Icon name="view_agenda" />
                List
              </>
            ),
          },
        ]}
      />
  );

  return (
    <>
      <header className="page-head">
        <h1 className="display-s">Find the right tool</h1>
        <p className="body-l muted">
            Every tool gets the same review: what it's best at, where it fails, what it means for your privacy and your coursework. Reviewed
            by USC AI Knowledge Hub Fellows.
        </p>
      </header>

      {view === "map" ? (
        <MapView q={q} cluster={cluster} selected={selected} setParam={setParam} onOpen={open} viewSwitch={viewSwitch} />
      ) : (
        <ListView
          viewSwitch={viewSwitch}
          onOpen={(id, e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            open(id);
          }}
        />
      )}

      <ToolSheet toolId={selected} onClose={close} onOpen={open} />
    </>
  );
}
