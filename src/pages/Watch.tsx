import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Icon } from "../components/Icon";
import { Bars } from "../components/Level";
import { Segmented } from "../components/Segmented";
import { AutoTalkCard, TALK_FILTER_LABEL, TALK_ICON, TalkCard } from "../components/TalkCard";
import { TaskExplorer } from "../components/TaskExplorer";
import { TREND_ICON, TREND_LABEL, TrendCard } from "../components/TrendCard";
import { VideoCard } from "../components/VideoCard";
import { TALK_KINDS, talks } from "../data/talks";
import { useCatalog } from "../lib/catalogStore";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  type Difficulty,
  type TalkKind,
  type Trend,
  type TrendKind,
} from "../data/types";
import { liveTalk, useCourseStatus } from "../lib/courses";
import { buildVideoMap, findOnMap, videosIn } from "../lib/watchMap";
import { useFeed } from "../lib/feed";
import { longDate } from "../lib/format";

type Sort = "new" | "top";
type LevelFilter = "all" | Difficulty;

const KINDS: TrendKind[] = ["launch", "research", "talk", "news"];

function groupTrends(trends: Trend[]) {
  const groups: { label: string; items: Trend[] }[] = [
    { label: "Last 2 days", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const t of trends) {
    const days = (Date.now() - Date.parse(t.publishedAt)) / 86_400_000;
    groups[days <= 2 ? 0 : days <= 7 ? 1 : 2].items.push(t);
  }
  return groups.filter((g) => g.items.length);
}

/** What's happening in AI: launches, research, talks and news, kept apart from lessons. */
function Trends() {
  const { trends } = useFeed();
  const [params, setParams] = useSearchParams();
  const kind = params.get("kind") as TrendKind | null;
  const set = (value: TrendKind | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set("kind", value);
    else next.delete("kind");
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const shown = trends.filter((t) => !kind || t.kind === kind);
  return (
    <>
      <div className="chip-row trend-filters" aria-label="Kind of trend">
        <button type="button" className="chip state" aria-pressed={!kind} onClick={() => set(null)}>
          {!kind && <Icon name="check" />}
          Everything
        </button>
        {KINDS.map((k) => (
          <button key={k} type="button" className="chip state" aria-pressed={kind === k} onClick={() => set(kind === k ? null : k)}>
            <Icon name={kind === k ? "check" : TREND_ICON[k]} />
            {TREND_LABEL[k]}
            <span className="chip-count">{trends.filter((t) => t.kind === k).length}</span>
          </button>
        ))}
      </div>
      <p className="body-m muted measure trend-note">
        Picked for recency and source, not teaching value. Official channels come first, and each video leaves after three weeks.
      </p>
      {!shown.length && (
        <div className="empty">
          <Icon name="newspaper" size={32} />
          <p className="title-m">{trends.length ? "Nothing of this kind right now" : "Trends arrive with the next daily run"}</p>
          <p className="body-m muted measure">Launches, research, talks and news from the last three weeks show up here.</p>
        </div>
      )}
      {groupTrends(shown).map((g) => (
        <section key={g.label} className="video-group">
          <h2 className="title-l group-h">
            {g.label}
            <span className="label-m muted">{g.items.length}</span>
          </h2>
          <div className="grid cols-videos">
            {g.items.map((t) => (
              <TrendCard key={t.id} trend={t} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

type Tab = "lessons" | "trends" | "talks";
const TAB_TITLE: Record<Tab, string> = { lessons: "Watch and learn", trends: "What's new in AI", talks: "Talks and podcasts" };

/**
 * Talks, debates, keynotes and podcasts from 2026: editors' picks first, then the episodes the daily run found on
 * trusted talk and podcast channels (labelled as picked automatically), best received first.
 */
const TALKS_PAGE = 12;

function Talks() {
  const status = useCourseStatus();
  const { talks: auto } = useFeed();
  const [params, setParams] = useSearchParams();
  const raw = params.get("kind") as TalkKind | null;
  const kind = raw && TALK_KINDS.includes(raw) ? raw : null;
  const set = (value: TalkKind | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set("kind", value);
    else next.delete("kind");
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const picks = useMemo(() => talks.map((t) => liveTalk(t, status)).filter((t) => t.available), [status]);
  const pickIds = useMemo(() => new Set(picks.map((t) => t.video)), [picks]);
  const found = useMemo(() => auto.filter((t) => !pickIds.has(t.id)).sort((a, b) => b.score - a.score), [auto, pickIds]);
  const count = (k: TalkKind) => picks.filter((t) => t.kind === k).length + found.filter((t) => t.kind === k).length;
  const shownPicks = picks.filter((t) => !kind || t.kind === kind);
  const shownFound = found.filter((t) => !kind || t.kind === kind);
  // The automatic picks run to dozens, so they come a page at a time.
  const [limit, setLimit] = useState(TALKS_PAGE);
  useEffect(() => setLimit(TALKS_PAGE), [kind]);
  return (
    <>
      <div className="chip-row talk-filters" aria-label="Kind of talk">
        <button type="button" className="chip state" aria-pressed={!kind} onClick={() => set(null)}>
          {!kind && <Icon name="check" />}
          All
          <span className="chip-count">{picks.length + found.length}</span>
        </button>
        {TALK_KINDS.filter((k) => count(k) || kind === k).map((k) => (
          <button key={k} type="button" className="chip state" aria-pressed={kind === k} onClick={() => set(kind === k ? null : k)}>
            <Icon name={kind === k ? "check" : TALK_ICON[k]} />
            {TALK_FILTER_LABEL[k]}
            <span className="chip-count">{count(k)}</span>
          </button>
        ))}
      </div>
      <p className="body-m muted measure trend-note">
        Talks and podcasts from 2026. Editors' picks come first. The rest are found each morning on TED, TEDx and well-known AI podcast and
        conference channels, and kept only when they're long, about AI, and well received in views, likes and comments.
      </p>
      {!shownPicks.length && !shownFound.length && (
        <div className="empty">
          <Icon name="podcasts" size={32} />
          <p className="title-m">{picks.length + found.length ? "Nothing of this kind right now" : "Talks and podcasts arrive with the next daily run"}</p>
          {kind && (
            <button type="button" className="btn tonal sm state" onClick={() => set(null)}>
              Show everything
            </button>
          )}
        </div>
      )}
      {shownPicks.length > 0 && (
        <section className="video-group">
          <h2 className="title-l group-h">
            Editors' picks<span className="label-m muted">{shownPicks.length}</span>
          </h2>
          <div className="grid cols-videos">
            {shownPicks.map((t) => (
              <TalkCard key={t.id} talk={t} />
            ))}
          </div>
        </section>
      )}
      {shownFound.length > 0 && (
        <section className="video-group">
          <h2 className="title-l group-h">
            Picked automatically<span className="label-m muted">{shownFound.length}</span>
          </h2>
          <div className="grid cols-videos">
            {shownFound.slice(0, limit).map((t) => (
              <AutoTalkCard key={t.id} talk={t} />
            ))}
          </div>
          {shownFound.length > limit && (
            <button type="button" className="btn outlined state watch-more" onClick={() => setLimit(limit + TALKS_PAGE)}>
              Show more ({shownFound.length - limit} left)
            </button>
          )}
        </section>
      )}
    </>
  );
}

const PAGE = 24;

/**
 * Lessons: the daily library as a map of tasks (TaskExplorer). Search for a tool, a task or any word: a tool or
 * task zooms the map to it, anything else filters the videos below. Picking a task or tool narrows the list.
 */
function Lessons() {
  const { feed, error } = useFeed();
  const catalog = useCatalog();
  const [params, setParams] = useSearchParams();
  const level = (params.get("level") as LevelFilter) || "all";
  const sort = (params.get("sort") as Sort) || "new";
  const onlyNew = params.get("new") === "1";
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const [shown, setShown] = useState(PAGE);
  // Picking a tool on the map scrolls down to its videos, once they've rendered.
  const results = useRef<HTMLElement>(null);
  const scrollToVideos = useRef(false);

  const all = useMemo(() => feed?.videos ?? [], [feed]);
  const map = useMemo(() => buildVideoMap(all, catalog), [all, catalog]);
  const match = useMemo(() => findOnMap(q, map, catalog), [q, map, catalog]);
  // A shared link with only ?q= zooms where the search points.
  const fromSearch = !params.has("task") && !params.has("tool");
  const toolParam = params.get("tool") ?? (fromSearch ? match.tool : null);
  const tool = toolParam && map.toolTask.has(toolParam) ? toolParam : null;
  // The map zooms to the chosen task; a tool on its own (a search or an old link) zooms to its main task.
  const task = params.get("task") ?? (tool ? map.toolTask.get(tool) ?? null : fromSearch ? match.task : null);
  // The list: a tool picked inside a task shows its videos there; a tool on its own shows all of them.
  const listTask = params.get("task") ?? (tool ? null : task);

  useEffect(() => {
    if (!tool || !scrollToVideos.current) return;
    scrollToVideos.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    results.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [tool]);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true, preventScrollReset: true });
    setShown(PAGE);
  };

  // Typing searches after a short pause; a tool or task in the words zooms the map there.
  useEffect(() => setDraft(q), [q]);
  useEffect(() => {
    if (draft === q) return;
    const t = setTimeout(() => {
      const found = findOnMap(draft, map, catalog);
      update({ q: draft.trim() || null, ...(found.tool ? { task: null, tool: found.tool } : found.task ? { task: found.task, tool: null } : {}) });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // A search that named a tool or task is answered by the map; otherwise its words filter the videos.
  const textFilter = q.trim() && !match.task ? q.trim().toLowerCase() : "";
  const list = useMemo(() => {
    const words = textFilter.split(/\s+/).filter(Boolean);
    const inScope = videosIn(all, map, listTask, tool).filter(
      (v) =>
        (level === "all" || v.difficulty === level) &&
        (!onlyNew || v.firstSeen === feed?.runDate) &&
        words.every((w) => `${v.title} ${v.channel} ${v.summary ?? ""}`.toLowerCase().includes(w)),
    );
    return sort === "top" ? [...inScope].sort((a, b) => b.score - a.score) : [...inScope].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }, [all, map, listTask, tool, level, onlyNew, textFilter, sort, feed?.runDate]);

  const taskInfo = task ? map.tasks.find((t) => t.id === task) : undefined;
  const toolInfo = tool ? catalog.toolById.get(tool) : undefined;
  const listTaskInfo = listTask ? map.tasks.find((t) => t.id === listTask) : undefined;
  const heading = toolInfo
    ? listTaskInfo
      ? `${toolInfo.name} in ${listTaskInfo.label}`
      : toolInfo.name
    : taskInfo?.label ?? (textFilter ? `Videos matching “${q.trim()}”` : "All videos");

  return (
    <>
      <div className="search watch-search">
        <Icon name="search" />
        <label htmlFor="watch-q" className="visually-hidden">
          Search videos by tool, task or keyword
        </label>
        <input
          id="watch-q"
          type="search"
          placeholder="Search a tool, a task or anything: n8n, make slides, RAG"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDraft("");
          }}
        />
        {draft && (
          <button type="button" className="icon-btn state" aria-label="Clear search" onClick={() => (setDraft(""), update({ q: null }))}>
            <Icon name="close" />
          </button>
        )}
      </div>
      {q.trim() && (
        <p className="body-s muted watch-search-note" role="status">
          {match.tool
            ? `Showing every ${catalog.toolById.get(match.tool)?.name} video. The map is zoomed to ${map.tasks.find((t) => t.id === match.task)?.label}, where most of them are.`
            : match.task
              ? `Zoomed to ${map.tasks.find((t) => t.id === match.task)?.label}.`
              : `No tool or task by that name, so the videos below are the ones that mention it.`}
        </p>
      )}

      {feed && (
        <TaskExplorer
          map={map}
          total={all.length}
          task={task}
          tool={tool}
          onTask={(id) => update({ task: id, tool: null, ...(!id && match.task ? { q: null } : {}) })}
          onTool={(id) => {
            scrollToVideos.current = !!id;
            update({ tool: id, task });
          }}
        />
      )}

      <section ref={results} className="video-group watch-results" aria-labelledby="watch-results-h">
        <div className="watch-results-head">
          <h2 id="watch-results-h" className="headline-s">
            {heading} <span className="label-l muted">{list.length}</span>
          </h2>
          {(task || tool || q) && (
            <button type="button" className="btn text sm state" onClick={() => (setDraft(""), update({ task: null, tool: null, q: null }))}>
              Show everything
            </button>
          )}
        </div>
        {toolInfo && (
          <div className="context-note">
            <p className="body-m">
              <strong>{toolInfo.name}</strong>: {toolInfo.bestFor}
            </p>
            {listTask && (
              <button type="button" className="btn text sm state" onClick={() => update({ task: null })}>
                All {toolInfo.name} videos
              </button>
            )}
            <Link to={`/tools/${toolInfo.id}`} className="btn text sm state">
              Tool guide
            </Link>
          </div>
        )}
        <div className="filters-row">
          <Segmented<LevelFilter>
            label="Difficulty"
            value={level}
            onChange={(v) => update({ level: v === "all" ? null : v })}
            options={[
              { value: "all", label: "All levels" },
              ...DIFFICULTIES.map((d) => ({
                value: d,
                label: (
                  <>
                    <Bars level={d} />
                    {DIFFICULTY_LABEL[d]}
                  </>
                ),
              })),
            ]}
          />
          <div className="filters-right">
            <label className="switch">
              <input type="checkbox" checked={onlyNew} onChange={(e) => update({ new: e.target.checked ? "1" : null })} />
              <span className="track" />
              New today
            </label>
            <Segmented<Sort>
              label="Sort"
              value={sort}
              onChange={(v) => update({ sort: v === "new" ? null : v })}
              options={[
                { value: "new", label: "Newest" },
                { value: "top", label: "Top rated" },
              ]}
            />
          </div>
        </div>

        {error && (
          <div className="empty" role="alert">
            <p className="title-m">{error}</p>
            <p className="body-m muted">Reload the page to try again.</p>
          </div>
        )}
        {!error && feed && !list.length && (
          <div className="empty">
            <Icon name={all.length ? "filter_alt_off" : "schedule"} size={32} />
            <p className="title-m">{all.length ? "No videos match" : "The library fills up after the first daily run"}</p>
            <p className="body-m muted measure">{all.length ? "Try another task, level or word, or turn off New today." : "Every lesson in Learn has videos you can watch now."}</p>
            {all.length > 0 && (
              <button type="button" className="btn tonal sm state" onClick={() => (setDraft(""), setParams({}, { replace: true }))}>
                Clear filters
              </button>
            )}
          </div>
        )}
        <div className="grid cols-videos">
          {list.slice(0, shown).map((v) => (
            <VideoCard key={v.id} video={v} isNew={v.firstSeen === feed?.runDate} />
          ))}
        </div>
        {list.length > shown && (
          <button type="button" className="btn outlined state watch-more" onClick={() => setShown(shown + PAGE)}>
            Show more ({list.length - shown} left)
          </button>
        )}
      </section>
    </>
  );
}

export function Watch() {
  const { feed, today } = useFeed();
  const [params] = useSearchParams();
  const tabParam = params.get("tab");
  const tab: Tab = tabParam === "trends" || tabParam === "talks" ? tabParam : "lessons";

  return (
    <>
      <header className="page-head">
        <h1 className="display-s">{TAB_TITLE[tab]}</h1>
        {tab === "lessons" && (
          <p className="body-l muted measure">
            {feed?.runDate
              ? `Refreshed every morning. Last run ${longDate(feed.runDate)}, with ${today.length} new that day.`
              : "Refreshed every morning from YouTube: 2026 videos with strong views, likes and comments, sorted by task and tool."}{" "}
            <Link to="/about">How videos are chosen</Link>
          </p>
        )}
      </header>

      {tab === "trends" ? (
        <Trends />
      ) : tab === "talks" ? (
        <Talks />
      ) : (
        <Lessons />
      )}
    </>
  );
}
