import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { Segmented } from "../components/Segmented";
import { DATABASE } from "../data/team";
import { useFeed } from "../lib/feed";
import { identity } from "../lib/board/identity";
import { ago, clean } from "../lib/board/rules";
import { makeStore, type Post } from "../lib/board/store";
import {
  HEADLINE_MAX,
  REC_BOARD,
  SOURCES,
  VOTE,
  WHY_MAX,
  encodeRec,
  leaders,
  rankRecs,
  recProblem,
  recsFrom,
  thumbUrl,
  watchUrl,
  youtubeId,
  type Rec,
  type RecSort,
  type RecSource,
} from "../lib/board/recs";
import type { Video } from "../data/types";
import "../styles/team.css";
import "../styles/recs.css";

type Filter = "all" | RecSource;

/** A picture and headline for a pick, used both in the list and as the form's preview. */
function Thumb({ videoId, title }: { videoId: string; title: string }) {
  return (
    <span className="rec-thumb">
      <img src={thumbUrl(videoId)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" width={480} height={360} />
      <span className="visually-hidden">{title}</span>
    </span>
  );
}

/** Search the Hub's library by title, so a pick from the library is one tap. */
function LibraryPicker({ videos, onPick }: { videos: Video[]; onPick: (v: Video) => void }) {
  const id = useId();
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const words = q
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1);
    if (!words.length) return [];
    return videos.filter((v) => words.every((w) => `${v.title} ${v.channel}`.toLowerCase().includes(w))).slice(0, 5);
  }, [q, videos]);
  if (!videos.length) return null;
  return (
    <div className="board-field rec-library">
      <label htmlFor={id} className="label-l">
        Or find it in the Hub's library
      </label>
      <input id={id} type="search" value={q} placeholder="Search by title or channel" autoComplete="off" onChange={(e) => setQ(e.target.value)} />
      {q.trim().length > 1 && (
        <ul className="rec-hits" aria-label="Library matches">
          {hits.length === 0 && <li className="body-s muted">No library videos match. Paste a YouTube link above instead.</li>}
          {hits.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className="rec-hit state"
                onClick={() => {
                  onPick(v);
                  setQ("");
                }}
              >
                <img src={thumbUrl(v.id)} alt="" loading="lazy" referrerPolicy="no-referrer" />
                <span>
                  <span className="label-l">{v.title}</span>
                  <span className="body-s muted">{v.channel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecForm({
  videos,
  libraryById,
  existing,
  initialName,
  onPost,
  onShow,
}: {
  videos: Video[];
  libraryById: Map<string, Video>;
  existing: Map<string, Rec>;
  initialName: string;
  onPost: (name: string, source: RecSource, body: string) => Promise<void>;
  /** Shows an existing pick in the list and scrolls to it. */
  onShow: (id: string) => void;
}) {
  const id = useId();
  const [name, setName] = useState(initialName);
  const [link, setLink] = useState("");
  const [headline, setHeadline] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!name && initialName) setName(initialName);
  }, [initialName, name]);

  const videoId = youtubeId(link);
  const fromLibrary = videoId ? libraryById.get(videoId) : undefined;
  const already = videoId ? existing.get(videoId) : undefined;
  const source: RecSource = fromLibrary ? "hub" : "found";

  const submit = async () => {
    const problem = recProblem(name, link, headline, why);
    if (problem) return setError(problem);
    if (already) return setError(`${already.name} already recommended this video. Vote for their pick instead.`);
    setBusy(true);
    setError("");
    try {
      await onPost(clean(name), source, encodeRec({ headline, videoId, why }));
      setLink("");
      setHeadline("");
      setWhy("");
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      id="rec-form"
      className="rec-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="rec-form-fields">
        <div className="board-field">
          <label htmlFor={`${id}-link`} className="label-l">
            YouTube link
          </label>
          <input
            id={`${id}-link`}
            value={link}
            inputMode="url"
            placeholder="https://youtu.be/…"
            autoComplete="off"
            onChange={(e) => {
              setLink(e.target.value);
              setDone(false);
            }}
          />
          {link.trim() && !videoId && <span className="body-s rec-hint-bad">That doesn't look like a YouTube video link yet.</span>}
          {fromLibrary && (
            <span className="body-s rec-hint">
              <Icon name="check_circle" size={16} /> In the Hub's library: {fromLibrary.title}
            </span>
          )}
          {already && (
            <span className="body-s rec-hint-bad">
              Already recommended by {already.name}.{" "}
              <button type="button" className="rec-inline-link" onClick={() => onShow(already.id)}>
                Vote for it instead
              </button>
            </span>
          )}
        </div>
        <LibraryPicker
          videos={videos}
          onPick={(v) => {
            setLink(watchUrl(v.id));
            setDone(false);
          }}
        />
        <div className="board-field">
          <label htmlFor={`${id}-headline`} className="label-l">
            Your headline
          </label>
          <input
            id={`${id}-headline`}
            value={headline}
            placeholder="The clearest 10-minute intro to RAG I've found"
            aria-describedby={`${id}-hcount`}
            onChange={(e) => setHeadline(e.target.value)}
          />
          <span id={`${id}-hcount`} className="body-s muted board-count" data-over={headline.length > HEADLINE_MAX}>
            {headline.length} / {HEADLINE_MAX}
          </span>
        </div>
        <div className="board-field">
          <label htmlFor={`${id}-why`} className="label-l">
            Why watch it? <span className="muted">(optional)</span>
          </label>
          <textarea
            id={`${id}-why`}
            rows={2}
            value={why}
            placeholder="Who it's for, or the part worth skipping to"
            aria-describedby={`${id}-wcount`}
            onChange={(e) => setWhy(e.target.value)}
          />
          <span id={`${id}-wcount`} className="body-s muted board-count" data-over={why.length > WHY_MAX}>
            {why.length} / {WHY_MAX}
          </span>
        </div>
        <div className="board-field">
          <label htmlFor={`${id}-name`} className="label-l">
            Your name
          </label>
          <input id={`${id}-name`} value={name} maxLength={40} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="board-error body-m">
            <Icon name="error" size={18} /> {error}
          </p>
        )}
        {done && !error && (
          <p role="status" className="rec-done body-m">
            <Icon name="check_circle" size={18} /> Posted. Thanks for the pick.
          </p>
        )}
        <div className="board-actions">
          <button type="submit" className="btn filled state" disabled={busy}>
            <Icon name="send" size={20} />
            {busy ? "Posting…" : "Post my pick"}
          </button>
        </div>
      </div>

      <div className="rec-preview" aria-label="Preview">
        <span className="label-m muted">Preview</span>
        <div className="rec-card is-preview">
          {videoId ? (
            <Thumb videoId={videoId} title={fromLibrary?.title ?? "Video thumbnail"} />
          ) : (
            <span className="rec-thumb rec-thumb-empty">
              <Icon name="smart_display" size={40} />
            </span>
          )}
          <div className="rec-body">
            <p className="title-m rec-headline">{clean(headline) || "Your headline goes here"}</p>
            <p className="body-s muted">by {clean(name) || "your name"}</p>
          </div>
        </div>
      </div>
    </form>
  );
}

function RecCard({
  rec,
  rank,
  video,
  mine,
  voted,
  reported,
  onVote,
  onEdit,
  onRemove,
  onReport,
}: {
  rec: Rec;
  rank: number | null;
  video?: Video;
  mine: boolean;
  voted: boolean;
  reported: boolean;
  onVote: () => Promise<void>;
  onEdit: (headline: string, why: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onReport: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"" | "edit" | "delete" | "report">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [headline, setHeadline] = useState(rec.headline);
  const [why, setWhy] = useState(rec.why);
  const run = async (f: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await f();
      setMode("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const source = SOURCES.find((s) => s.id === rec.source);

  return (
    <article className="rec-card" id={`rec-${rec.id}`} aria-labelledby={`rec-h-${rec.id}`}>
      <a
        href={watchUrl(rec.videoId)}
        target="_blank"
        rel="noreferrer noopener"
        className="rec-watch"
        aria-label={`Watch on YouTube: ${video?.title ?? rec.headline}`}
      >
        <Thumb videoId={rec.videoId} title={video?.title ?? rec.headline} />
        {rank !== null && rank <= 3 && rec.votes > 0 && <span className={`rec-rank rank-${rank}`}>#{rank}</span>}
        <span className="rec-play" aria-hidden="true">
          <Icon name="play_arrow" size={28} />
        </span>
      </a>
      <div className="rec-body">
        {mode === "edit" ? (
          <form
            className="rec-edit"
            onSubmit={(e) => {
              e.preventDefault();
              const problem = recProblem(rec.name, watchUrl(rec.videoId), headline, why);
              if (problem) return setError(problem);
              void run(() => onEdit(headline, why));
            }}
          >
            <label className="label-l">
              Headline
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} autoFocus />
            </label>
            <label className="label-l">
              Why watch it?
              <textarea rows={2} value={why} onChange={(e) => setWhy(e.target.value)} />
            </label>
            <div className="board-actions">
              <button type="submit" className="btn filled sm state" disabled={busy}>
                Save
              </button>
              <button type="button" className="btn text sm state" onClick={() => setMode("")}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <h3 id={`rec-h-${rec.id}`} className="title-m rec-headline">
              {rec.headline}
            </h3>
            <p className="body-s rec-by">
              <span className="label-l">{rec.name}</span>
              {mine && <span className="board-you label-m">You</span>}
              <span className="muted">
                · <time dateTime={rec.createdAt}>{ago(rec.createdAt)}</time>
                {rec.editedAt && " · edited"}
              </span>
              {source && <span className={`rec-source label-m src-${rec.source}`}>{source.label}</span>}
            </p>
            {rec.why && <p className="body-m rec-why">{rec.why}</p>}
            {video && (
              <p className="body-s muted rec-video">
                <Icon name="smart_display" size={16} /> {video.title} · {video.channel}
              </p>
            )}
          </>
        )}

        <div className="rec-bar">
          {mine ? (
            <span className="rec-vote is-own label-l" title="You can't vote for your own pick">
              <Icon name="thumb_up" size={18} /> {rec.votes} {rec.votes === 1 ? "vote" : "votes"}
            </span>
          ) : (
            <button
              type="button"
              className="rec-vote state label-l"
              aria-pressed={voted}
              aria-label={`${voted ? "Remove your vote" : "Vote for this pick"}, ${rec.votes} ${rec.votes === 1 ? "vote" : "votes"}`}
              disabled={busy}
              onClick={() => void run(onVote)}
            >
              <Icon name="thumb_up" size={18} filled={voted} /> {rec.votes}
            </button>
          )}
          <span className="rec-actions">
            {mine ? (
              <>
                <button type="button" className="board-link label-l state" onClick={() => setMode("edit")}>
                  <Icon name="edit" size={18} /> Edit
                </button>
                <button type="button" className="board-link label-l state" onClick={() => setMode("delete")}>
                  <Icon name="delete" size={18} /> Delete
                </button>
              </>
            ) : reported ? (
              <span className="body-s muted">Reported</span>
            ) : (
              <button type="button" className="board-link label-l state" aria-label="Report this pick" onClick={() => setMode("report")}>
                <Icon name="flag" size={18} />
              </button>
            )}
          </span>
        </div>

        {mode === "delete" && (
          <p className="board-confirm body-m" role="alert">
            Delete this pick? Its votes go too.
            <button type="button" className="btn sm filled state" onClick={() => void run(onRemove)}>
              Delete
            </button>
            <button type="button" className="btn sm text state" onClick={() => setMode("")}>
              Keep it
            </button>
          </p>
        )}
        {mode === "report" && (
          <p className="board-confirm body-m" role="alert">
            Report this pick to the editors? Three reports hide it until someone checks.
            <button type="button" className="btn sm filled state" onClick={() => void run(onReport)}>
              Report
            </button>
            <button type="button" className="btn sm text state" onClick={() => setMode("")}>
              Cancel
            </button>
          </p>
        )}
        {error && (
          <p role="alert" className="board-error body-m">
            <Icon name="error" size={18} /> {error}
          </p>
        )}
      </div>
    </article>
  );
}

/** Video picks: students recommend a video in one line and vote on each other's picks. Being tried at /team/test. */
export function TeamTest() {
  const store = useMemo(() => makeStore(DATABASE), []);
  const me = useMemo(() => identity(), []);
  const { feed } = useFeed();
  const videos = useMemo(() => feed?.videos ?? [], [feed]);
  const libraryById = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState<RecSort>("top");
  const [filter, setFilter] = useState<Filter>("all");
  const [reacted, setReacted] = useState(() => me.reacted());
  const [reported, setReported] = useState(() => me.reported());
  const [name, setName] = useState(() => me.name());
  const [now, setNow] = useState(() => Date.now());
  const [formOpen, setFormOpen] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      setPosts(await store.list(REC_BOARD));
      setLoadError("");
      setNow(Date.now());
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [store]);

  useEffect(() => {
    void load();
    if (!store.shared) return;
    const t = setInterval(() => {
      if (!document.hidden) void load();
    }, 30_000);
    return () => clearInterval(t);
  }, [load, store.shared]);

  const recs = useMemo(() => recsFrom(posts ?? []), [posts]);
  const byVideo = useMemo(() => new Map(recs.map((r) => [r.videoId, r])), [recs]);
  // Ranks come from all-time votes, so a pick keeps its number whatever the filter.
  const rankOf = useMemo(() => new Map(rankRecs(recs, "top", now).map((r, i) => [r.id, i + 1])), [recs, now]);
  const shown = useMemo(() => rankRecs(recs, sort, now).filter((r) => filter === "all" || r.source === filter), [recs, sort, filter, now]);
  const top = useMemo(() => leaders(recs), [recs]);
  // Open by default only while there's nothing to look at yet.
  const showForm = formOpen ?? (posts !== null && recs.length === 0);

  const vote = async (r: Rec) => {
    const on = await store.react(r.id, VOTE);
    const next = new Set(reacted);
    const key = `${r.id}:${VOTE}`;
    if (on) next.add(key);
    else next.delete(key);
    setReacted(next);
    me.setReacted(next);
    await load();
  };

  return (
    <div className="recs-page">
      <header className="page-head">
        <Link to="/team" className="board-back label-l">
          <Icon name="arrow_back" size={18} /> AI Team
        </Link>
        <h1 className="display-m">Video picks</h1>
        <p className="body-l muted measure">
          Watched something that taught you something? Recommend it in one line. Vote for the picks that helped you, and the best ones rise to the top.
        </p>
      </header>

      {!store.shared && (
        <p className="board-note body-m">
          <Icon name="info" size={20} /> Picks aren't connected to the shared database here, so they stay on this device and nobody else sees them.
        </p>
      )}

      <section className="rec-new" aria-labelledby="rec-new-h" data-open={showForm}>
        <div className="rec-new-head">
          <h2 id="rec-new-h" className="title-l">
            {showForm ? "Recommend a video" : "Seen a video worth sharing?"}
          </h2>
          <button
            type="button"
            className={`btn ${showForm ? "text" : "filled"} state`}
            aria-expanded={showForm}
            aria-controls="rec-form"
            onClick={() => setFormOpen(!showForm)}
          >
            <Icon name={showForm ? "close" : "add"} size={20} />
            {showForm ? "Close" : "Recommend a video"}
          </button>
        </div>
        {showForm && (
          <RecForm
            videos={videos}
            libraryById={libraryById}
            existing={byVideo}
            onShow={(id) => {
              setFilter("all");
              setSort("top");
              setFormOpen(false);
              requestAnimationFrame(() => {
                const el = document.getElementById(`rec-${id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                el?.querySelector<HTMLElement>(".rec-vote")?.focus({ preventScroll: true });
              });
            }}
            initialName={name}
            onPost={async (n, source, body) => {
              await store.post({
                board: REC_BOARD,
                topic: source,
                parentId: null,
                name: n,
                body,
              });
              me.setName(n);
              setName(n);
              setSort("new");
              setFilter("all");
              setFormOpen(false);
              await load();
            }}
          />
        )}
      </section>

      <div className="recs-layout">
        <section className="recs-list" aria-labelledby="recs-h">
          <div className="recs-head">
            <h2 id="recs-h" className="title-l">
              {posts ? `${shown.length} ${shown.length === 1 ? "pick" : "picks"}` : "Picks"}
            </h2>
            <Segmented<RecSort>
              label="Sort picks"
              value={sort}
              onChange={setSort}
              options={[
                { value: "top", label: "Top" },
                { value: "week", label: "This week" },
                { value: "new", label: "Newest" },
              ]}
            />
          </div>
          <div className="board-topics" role="group" aria-label="Where the video came from">
            {(["all", ...SOURCES.map((s) => s.id)] as Filter[]).map((f) => (
              <button key={f} type="button" className="chip state" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "All picks" : SOURCES.find((s) => s.id === f)?.label}
              </button>
            ))}
          </div>

          {loadError && (
            <p role="alert" className="board-error body-m">
              <Icon name="error" size={18} /> {loadError}{" "}
              <button type="button" className="btn text sm state" onClick={() => void load()}>
                Try again
              </button>
            </p>
          )}
          {!posts && !loadError && <p className="body-m muted">Loading…</p>}
          {posts && shown.length === 0 && !loadError && (
            <p className="body-l board-empty">
              {recs.length === 0 ? "No picks yet. Be the first to recommend a video." : sort === "week" ? "No picks this week yet." : "No picks here yet."}
            </p>
          )}
          <div className="rec-grid">
            {shown.map((r) => (
              <RecCard
                key={`${r.id}:${r.editedAt ?? ""}`}
                rec={r}
                rank={rankOf.get(r.id) ?? null}
                video={libraryById.get(r.videoId)}
                mine={me.keyFor(r.id) !== undefined}
                voted={reacted.has(`${r.id}:${VOTE}`)}
                reported={reported.has(r.id)}
                onVote={() => vote(r)}
                onEdit={async (headline, why) => {
                  await store.edit(r.id, encodeRec({ headline, videoId: r.videoId, why }));
                  await load();
                }}
                onRemove={async () => {
                  await store.remove(r.id);
                  await load();
                }}
                onReport={async () => {
                  await store.report(r.id);
                  const next = new Set(reported).add(r.id);
                  setReported(next);
                  me.setReported(next);
                  await load();
                }}
              />
            ))}
          </div>
        </section>

        <aside className="recs-side" aria-labelledby="leaders-h">
          <h2 id="leaders-h" className="title-m">
            Top recommenders
          </h2>
          {top.length ? (
            <ol className="rec-leaders">
              {top.map((l, i) => (
                <li key={l.name.toLowerCase()}>
                  <span className={`rec-leader-n label-l${i === 0 ? " first" : ""}`} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="label-l">{l.name}</span>
                  <span className="body-s muted">
                    {l.votes} {l.votes === 1 ? "vote" : "votes"} on {l.picks} {l.picks === 1 ? "pick" : "picks"}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="body-s muted">Nobody yet. Votes on your picks put you here.</p>
          )}
          <h2 className="title-s">How it works</h2>
          <ul className="body-s rec-rules">
            <li>One vote per pick from each browser. You can take a vote back.</li>
            <li>Each video can be recommended once, so votes add up in one place.</li>
            <li>Names aren't checked, so keep it friendly. Three reports hide a pick until an editor looks.</li>
            <li>Edit or delete your own picks from the browser you posted them in.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
