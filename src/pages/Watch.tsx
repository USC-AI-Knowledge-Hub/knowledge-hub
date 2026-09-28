import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { Icon } from "../components/Icon";
import { Bars } from "../components/Level";
import { Segmented } from "../components/Segmented";
import { TALK_FILTER_LABEL, TALK_ICON, TalkCard } from "../components/TalkCard";
import { ToolMark } from "../components/ToolMark";
import { TREND_ICON, TREND_LABEL, TrendCard } from "../components/TrendCard";
import { VideoCard } from "../components/VideoCard";
import { TALK_KINDS, talks } from "../data/talks";
import { toolById, tools } from "../data/tools";
import {
  DIFFICULTIES,
  DIFFICULTY_BLURB,
  DIFFICULTY_LABEL,
  type Difficulty,
  type TalkKind,
  type Trend,
  type TrendKind,
  type Video,
} from "../data/types";
import { liveTalk, useCourseStatus } from "../lib/courses";
import { useFeed } from "../lib/feed";
import { longDate } from "../lib/format";

type Sort = "new" | "top";
type LevelFilter = "all" | Difficulty;

function groupByAge(videos: Video[], runDate: string | null) {
  const groups: { label: string; items: Video[] }[] = [
    { label: "New today", items: [] },
    { label: "This week", items: [] },
    { label: "This month", items: [] },
    { label: "Earlier", items: [] },
  ];
  const ref = runDate ? Date.parse(runDate + "T23:59:59Z") : Date.now();
  for (const v of videos) {
    if (v.firstSeen === runDate) groups[0].items.push(v);
    else {
      const days = (ref - Date.parse(v.publishedAt)) / 86_400_000;
      groups[days <= 7 ? 1 : days <= 31 ? 2 : 3].items.push(v);
    }
  }
  return groups.filter((g) => g.items.length);
}

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

/** Hand-picked talks, debates, keynotes and podcasts: the long view, kept apart from lessons and trends. */
function Talks() {
  const status = useCourseStatus();
  const [params, setParams] = useSearchParams();
  const raw = params.get("kind") as TalkKind | null;
  const kind = raw && TALK_KINDS.includes(raw) ? raw : null;
  const set = (value: TalkKind | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set("kind", value);
    else next.delete("kind");
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const available = useMemo(() => talks.map((t) => liveTalk(t, status)).filter((t) => t.available), [status]);
  const shown = available.filter((t) => !kind || t.kind === kind);
  return (
    <>
      <div className="chip-row talk-filters" aria-label="Kind of talk">
        <button type="button" className="chip state" aria-pressed={!kind} onClick={() => set(null)}>
          {!kind && <Icon name="check" />}
          All
          <span className="chip-count">{available.length}</span>
        </button>
        {TALK_KINDS.map((k) => (
          <button key={k} type="button" className="chip state" aria-pressed={kind === k} onClick={() => set(kind === k ? null : k)}>
            <Icon name={kind === k ? "check" : TALK_ICON[k]} />
            {TALK_FILTER_LABEL[k]}
            <span className="chip-count">{available.filter((t) => t.kind === k).length}</span>
          </button>
        ))}
      </div>
      <p className="body-m muted measure trend-note">
        Picked by editors for lasting value, not recency. Optimists, critics and practitioners, each on the original publisher's channel.
      </p>
      {!shown.length && (
        <div className="empty">
          <Icon name="podcasts" size={32} />
          <p className="title-m">Nothing of this kind right now</p>
          <button type="button" className="btn tonal sm state" onClick={() => set(null)}>
            Show everything
          </button>
        </div>
      )}
      <div className="grid cols-videos">
        {shown.map((t) => (
          <TalkCard key={t.id} talk={t} />
        ))}
      </div>
    </>
  );
}

export function Watch() {
  const { feed, error } = useFeed();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab: Tab = tabParam === "trends" || tabParam === "talks" ? tabParam : "lessons";
  const tool = params.get("tool") ?? "";
  const level = (params.get("level") as LevelFilter) || "all";
  const sort = (params.get("sort") as Sort) || "new";
  const onlyNew = params.get("new") === "1";
  const q = params.get("q") ?? "";

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const all = feed?.videos ?? [];
  const toolCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of all) for (const t of v.tools) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  }, [all]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = all.filter(
      (v) =>
        (!tool || v.tools.includes(tool)) &&
        (level === "all" || v.difficulty === level) &&
        (!onlyNew || v.firstSeen === feed?.runDate) &&
        (!needle || `${v.title} ${v.channel} ${v.summary ?? ""}`.toLowerCase().includes(needle)),
    );
    return sort === "top"
      ? [...list].sort((a, b) => b.score - a.score)
      : [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }, [all, tool, level, onlyNew, q, sort, feed?.runDate]);

  const activeTool = tool ? toolById.get(tool) : undefined;
  const groups = sort === "new" ? groupByAge(filtered, feed?.runDate ?? null) : [{ label: "", items: filtered }];

  return (
    <>
      <header className="page-head">
        <h1 className="display-s">{TAB_TITLE[tab]}</h1>
        <div className="watch-tabs">
          <Segmented<Tab>
            label="Library"
            value={tab}
            onChange={(v) => setParams(v === "lessons" ? {} : { tab: v }, { replace: true, preventScrollReset: true })}
            options={[
              { value: "lessons", label: "Lessons" },
              { value: "trends", label: "AI trends" },
              { value: "talks", label: "Talks and podcasts" },
            ]}
          />
        </div>
        {tab === "lessons" && (
          <p className="body-l muted measure">
            {feed?.runDate
              ? `Refreshed every morning. Last run ${longDate(feed.runDate)}, with ${feed.stats.added} new videos out of ${feed.stats.candidates} checked.`
              : "Refreshed every morning from YouTube, filtered for teaching value and sorted by tool and difficulty."}{" "}
            <Link to="/about">How videos are chosen</Link>
          </p>
        )}
      </header>

      {tab === "trends" ? (
        <Trends />
      ) : tab === "talks" ? (
        <Talks />
      ) : (
        <>
          <div className="filters" role="region" aria-label="Filters">
            <div className="filters-row">
              <Segmented<LevelFilter>
                label="Difficulty"
                value={level}
                onChange={(v) => set("level", v === "all" ? null : v)}
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
                  <input type="checkbox" checked={onlyNew} onChange={(e) => set("new", e.target.checked ? "1" : null)} />
                  <span className="track" />
                  New today
                </label>
                <Segmented<Sort>
                  label="Sort"
                  value={sort}
                  onChange={(v) => set("sort", v === "new" ? null : v)}
                  options={[
                    { value: "new", label: "Newest" },
                    { value: "top", label: "Top rated" },
                  ]}
                />
              </div>
            </div>

            <div className="chip-row scroll" aria-label="Tool">
              <button type="button" className="chip state" aria-pressed={!tool} onClick={() => set("tool", null)}>
                {!tool && <Icon name="check" />}
                All tools
              </button>
              {tools
                .filter((t) => toolCounts.get(t.id) || t.id === tool)
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="chip state tool-chip"
                    aria-pressed={tool === t.id}
                    onClick={() => set("tool", tool === t.id ? null : t.id)}
                  >
                    <ToolMark tool={t} size={22} />
                    {t.name}
                    <span className="chip-count">{toolCounts.get(t.id) ?? 0}</span>
                  </button>
                ))}
            </div>

            <div className="search slim">
              <Icon name="filter_list" />
              <label htmlFor="watch-q" className="visually-hidden">
                Filter videos by keyword
              </label>
              <input
                id="watch-q"
                type="search"
                placeholder="Filter by keyword, e.g. spreadsheets"
                value={q}
                onChange={(e) => set("q", e.target.value || null)}
              />
            </div>
          </div>

          {(activeTool || level !== "all") && (
            <div className="context-note">
              {level !== "all" && <Bars level={level} />}
              <p className="body-m">
                {activeTool && (
                  <>
                    <strong>{activeTool.name}</strong>: {activeTool.bestFor}{" "}
                  </>
                )}
                {level !== "all" && DIFFICULTY_BLURB[level]}
              </p>
              {activeTool && (
                <Link to={`/tools/${activeTool.id}`} className="btn text sm state">
                  Tool guide
                </Link>
              )}
            </div>
          )}

          {error && (
            <div className="empty" role="alert">
              <p className="title-m">{error}</p>
              <p className="body-m muted">Reload the page to try again.</p>
            </div>
          )}

          {!error && feed && !filtered.length && (
            <div className="empty">
              <Icon name={all.length ? "filter_alt_off" : "schedule"} size={32} />
              <p className="title-m">{all.length ? "No videos match these filters" : "The library fills up after the first daily run"}</p>
              <p className="body-m muted measure">
                {all.length
                  ? "Try another difficulty or tool, or turn off New today."
                  : "Every lesson in Learn has hand-picked videos you can watch now."}
              </p>
              {all.length ? (
                <button type="button" className="btn tonal sm state" onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </button>
              ) : (
                <Link to="/learn" className="btn tonal sm state">
                  Go to lessons
                </Link>
              )}
            </div>
          )}

          {groups.map((g) => (
            <section key={g.label || "all"} className="video-group">
              {g.label && (
                <h2 className="title-l group-h">
                  {g.label}
                  <span className="label-m muted">{g.items.length}</span>
                </h2>
              )}
              <div className="grid cols-videos">
                {g.items.map((v) => (
                  <VideoCard key={v.id} video={v} isNew={v.firstSeen === feed?.runDate} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
