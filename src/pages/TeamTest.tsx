import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { Segmented } from "../components/Segmented";
import { DATABASE } from "../data/team";
import { useCatalog } from "../lib/catalogStore";
import { useFeed } from "../lib/feed";
import { identity } from "../lib/board/identity";
import { ago, clean } from "../lib/board/rules";
import { makeStore, type Post } from "../lib/board/store";
import {
  CATEGORIES,
  HEADLINE_MAX,
  REC_BOARD,
  TITLE_MAX,
  TAG_MAX,
  VOTE,
  categoryById,
  categoryFor,
  cleanTitle,
  encodeRec,
  fetchTitle,
  leaders,
  parseTags,
  popularTags,
  rankRecs,
  recProblem,
  recsFrom,
  searchRecs,
  thumbUrl,
  watchUrl,
  youtubeId,
  type Rec,
  type RecSort,
} from "../lib/board/recs";
import type { Video } from "../data/types";
import "../styles/team.css";
import "../styles/recs.css";

/** How many picks show before "Show more". */
const PAGE = 24;

function Thumb({ videoId }: { videoId: string }) {
  return (
    <span className="rec-thumb">
      <img src={thumbUrl(videoId)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" width={480} height={360} />
    </span>
  );
}

/** Search the Hub's library by title, so a pick from the library is one tap. */
function LibraryPicker({ videos, onPick }: { videos: Video[]; onPick: (v: Video) => void }) {
  const id = useId();
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
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

/** Tags typed as a comma-separated list, shown as chips, with one-tap suggestions. */
function TagField({ id, value, onChange, suggestions }: { id: string; value: string; onChange: (v: string) => void; suggestions: string[] }) {
  const tags = parseTags(value);
  const offer = suggestions.filter((s) => !tags.includes(s)).slice(0, 6);
  return (
    <div className="board-field">
      <label htmlFor={id} className="label-l">
        Tags <span className="muted">(up to {TAG_MAX}, separated by commas)</span>
      </label>
      <input id={id} value={value} placeholder="rag, n8n, beginner" autoComplete="off" onChange={(e) => onChange(e.target.value)} />
      {(tags.length > 0 || offer.length > 0) && (
        <div className="rec-tag-line">
          {tags.map((t) => (
            <span key={t} className="rec-tag">
              #{t}
            </span>
          ))}
          {offer.length > 0 && tags.length < TAG_MAX && (
            <>
              <span className="body-s muted">Suggested:</span>
              {offer.map((s) => (
                <button key={s} type="button" className="rec-tag is-offer state" onClick={() => onChange([...tags, s].join(", "))}>
                  + {s}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RecForm({
  videos,
  libraryById,
  existing,
  initialName,
  tagNames,
  onPost,
  onShow,
}: {
  videos: Video[];
  libraryById: Map<string, Video>;
  existing: Map<string, Rec>;
  initialName: string;
  /** A library video's tools and topics, as tag suggestions. */
  tagNames: (v: Video) => string[];
  onPost: (name: string, category: string, body: string) => Promise<void>;
  onShow: (id: string) => void;
}) {
  const id = useId();
  const [name, setName] = useState(initialName);
  const [link, setLink] = useState("");
  const [headline, setHeadline] = useState("");
  const [title, setTitle] = useState("");
  const [looking, setLooking] = useState(false);
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!name && initialName) setName(initialName);
  }, [initialName, name]);

  const videoId = youtubeId(link);
  const fromLibrary = videoId ? libraryById.get(videoId) : undefined;
  const already = videoId ? existing.get(videoId) : undefined;
  const suggested = fromLibrary ? categoryFor(fromLibrary.topics) : "";
  // The video's own title: from the library, else from YouTube; if neither works, the student types it.
  useEffect(() => {
    if (!videoId) return;
    if (fromLibrary) return setTitle(fromLibrary.title);
    let live = true;
    setLooking(true);
    void fetchTitle(videoId).then((t) => {
      if (!live) return;
      setLooking(false);
      if (t) setTitle(t);
    });
    return () => {
      live = false;
    };
  }, [videoId, fromLibrary]);
  // A library video suggests its category until the student picks one.
  useEffect(() => {
    if (suggested && !category) setCategory(suggested);
  }, [suggested, category]);

  const submit = async () => {
    // A video that's already here is the first thing to say: the rest of the form doesn't matter then.
    if (already) return setError(`${already.name} already recommended this video. Vote for their pick instead.`);
    const problem = recProblem(name, link, headline, title, category);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      await onPost(clean(name), category, encodeRec({ headline, videoId, title, why: "", tags: parseTags(tags) }));
      setLink("");
      setHeadline("");
      setTitle("");
      setTags("");
      setCategory("");
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
          <input id={`${id}-link`} value={link} inputMode="url" placeholder="https://youtu.be/…" autoComplete="off" onChange={(e) => {
              setLink(e.target.value);
              setTitle("");
            }} />
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
        <LibraryPicker videos={videos} onPick={(v) => setLink(watchUrl(v.id))} />
        {videoId && (
          <div className="board-field">
            <label htmlFor={`${id}-title`} className="label-l">
              Video title
            </label>
            <input
              id={`${id}-title`}
              value={title}
              maxLength={TITLE_MAX}
              placeholder={looking ? "Looking it up on YouTube…" : "Copy the title from YouTube"}
              readOnly={Boolean(fromLibrary)}
              onChange={(e) => setTitle(e.target.value)}
            />
            {!fromLibrary && !looking && !title && <span className="body-s muted">We couldn't look the title up. Type it as it appears on YouTube.</span>}
          </div>
        )}
        <div className="board-field">
          <label htmlFor={`${id}-headline`} className="label-l">
            Your recommendation, in one line
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
        <div className="rec-form-row">
          <div className="board-field">
            <label htmlFor={`${id}-cat`} className="label-l">
              Category
            </label>
            <select id={`${id}-cat`} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="" disabled>
                Choose one
              </option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <TagField id={`${id}-tags`} value={tags} onChange={setTags} suggestions={fromLibrary ? tagNames(fromLibrary) : []} />
        </div>
        <div className="board-field">
          <label htmlFor={`${id}-name`} className="label-l">
            Your name
          </label>
          <input id={`${id}-name`} value={name} maxLength={40} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
          {initialName && name === initialName && <span className="body-s muted">This browser remembers the name you used last. Change it if it isn't you.</span>}
        </div>
        {error && (
          <p role="alert" className="board-error body-m">
            <Icon name="error" size={18} /> {error}
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
            <Thumb videoId={videoId} />
          ) : (
            <span className="rec-thumb rec-thumb-empty">
              <Icon name="smart_display" size={40} />
            </span>
          )}
          <div className="rec-body">
            {category && <span className="rec-cat label-m">{categoryById.get(category)?.label}</span>}
            <p className="title-m rec-title">{cleanTitle(title) || "The video's title"}</p>
            <p className="body-l rec-quote">“{clean(headline) || "Your recommendation goes here"}”</p>
            <p className="body-s muted">Recommended by {clean(name) || "your name"}</p>
            {parseTags(tags).length > 0 && (
              <div className="rec-tag-line">
                {parseTags(tags).map((t) => (
                  <span key={t} className="rec-tag">
                    #{t}
                  </span>
                ))}
              </div>
            )}
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
  onTag,
}: {
  rec: Rec;
  rank: number | null;
  video?: Video;
  mine: boolean;
  voted: boolean;
  reported: boolean;
  onVote: () => Promise<void>;
  onEdit: (headline: string, title: string, tags: string[]) => Promise<void>;
  onRemove: () => Promise<void>;
  onReport: () => Promise<void>;
  onTag: (tag: string) => void;
}) {
  const [mode, setMode] = useState<"" | "edit" | "delete" | "report">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [headline, setHeadline] = useState(rec.headline);
  const shownTitle = video?.title ?? (rec.title || "A YouTube video");
  const [title, setTitle] = useState(video?.title ?? rec.title);
  const [tags, setTags] = useState(rec.tags.join(", "));
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
  const category = categoryById.get(rec.category);
  const votes = `${rec.votes} ${rec.votes === 1 ? "vote" : "votes"}`;

  return (
    <article className="rec-card" id={`rec-${rec.id}`} aria-labelledby={`rec-h-${rec.id}`}>
      <a href={watchUrl(rec.videoId)} target="_blank" rel="noreferrer noopener" className="rec-watch" aria-label={`Watch on YouTube: ${shownTitle}`}>
        <Thumb videoId={rec.videoId} />
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
              const problem = recProblem(rec.name, watchUrl(rec.videoId), headline, title, rec.category);
              if (problem) return setError(problem);
              void run(() => onEdit(headline, title, parseTags(tags)));
            }}
          >
            {!video && (
              <label className="label-l">
                Video title
                <input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} />
              </label>
            )}
            <label className="label-l">
              Your recommendation
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} autoFocus />
            </label>
            <label className="label-l">
              Tags
              <input value={tags} onChange={(e) => setTags(e.target.value)} />
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
            {category && (
              <span className="rec-cat label-m">
                <Icon name={category.icon} size={14} /> {category.label}
              </span>
            )}
            <h3 id={`rec-h-${rec.id}`} className="title-m rec-title">
              {shownTitle}
            </h3>
            {video && <p className="body-s muted rec-channel">{video.channel}</p>}
            <p className="body-l rec-quote">“{rec.headline}”</p>
            <p className="body-s rec-by">
              <span className="muted">Recommended by</span>
              <span className="label-l">{rec.name}</span>
              {mine && <span className="board-you label-m">You</span>}
              <span className="muted">
                <time dateTime={rec.createdAt}>{ago(rec.createdAt)}</time>
                {rec.editedAt && " · edited"}
              </span>
            </p>
            {rec.tags.length > 0 && (
              <div className="rec-tag-line">
                {rec.tags.map((t) => (
                  <button key={t} type="button" className="rec-tag state" aria-label={`Show picks tagged ${t}`} onClick={() => onTag(t)}>
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="rec-bar">
          {mine ? (
            <span className="rec-vote is-own label-l" title="You can't vote for your own pick">
              <Icon name="thumb_up" size={18} /> {votes}
            </span>
          ) : (
            <button
              type="button"
              className="rec-vote state label-l"
              aria-pressed={voted}
              aria-label={`${voted ? "Remove your vote" : "Vote for this pick"}, ${votes}`}
              disabled={busy}
              onClick={() => void run(onVote)}
            >
              <Icon name="thumb_up" size={18} filled={voted} /> {rec.votes}
            </button>
          )}
          <span className="rec-actions">
            {mine ? (
              <>
                <button type="button" className="icon-btn sm state" aria-label="Edit" title="Edit" onClick={() => setMode("edit")}>
                  <Icon name="edit" size={20} />
                </button>
                <button type="button" className="icon-btn sm state" aria-label="Delete" title="Delete" onClick={() => setMode("delete")}>
                  <Icon name="delete" size={20} />
                </button>
              </>
            ) : reported ? (
              <span className="body-s muted">Reported</span>
            ) : (
              <button type="button" className="icon-btn sm state" aria-label="Report this pick" title="Report" onClick={() => setMode("report")}>
                <Icon name="flag" size={20} />
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
  const { toolById } = useCatalog();
  const videos = useMemo(() => feed?.videos ?? [], [feed]);
  const libraryById = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState<RecSort>("top");
  const [category, setCategory] = useState("all");
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
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
    }, store.refreshMs ?? 30_000);
    return () => clearInterval(t);
  }, [load, store]);

  const recs = useMemo(() => recsFrom(posts ?? []), [posts]);
  const byVideo = useMemo(() => new Map(recs.map((r) => [r.videoId, r])), [recs]);
  // Ranks come from all-time votes, so a pick keeps its number whatever the filter.
  const rankOf = useMemo(() => new Map(rankRecs(recs, "top", now).map((r, i) => [r.id, i + 1])), [recs, now]);
  const videoText = useCallback((id: string) => {
    const v = libraryById.get(id);
    return v ? `${v.title} ${v.channel}` : "";
  }, [libraryById]);
  const matching = useMemo(() => searchRecs(recs, q, videoText).filter((r) => !tag || r.tags.includes(tag)), [recs, q, tag, videoText]);
  const counts = useMemo(() => {
    const n = new Map<string, number>();
    for (const r of matching) n.set(r.category, (n.get(r.category) ?? 0) + 1);
    return n;
  }, [matching]);
  const list = useMemo(() => rankRecs(matching, sort, now).filter((r) => category === "all" || r.category === category), [matching, sort, category, now]);
  const top = useMemo(() => leaders(recs), [recs]);
  const tagsUsed = useMemo(() => popularTags(recs), [recs]);
  const filtered = q.trim() !== "" || tag !== "" || category !== "all";
  // Open by default only while there's nothing to look at yet.
  const showForm = formOpen ?? (posts !== null && recs.length === 0);
  useEffect(() => setShown(PAGE), [q, tag, category, sort]);

  const tagNames = useCallback((v: Video) => parseTags([...v.tools.map((t) => toolById.get(t)?.name ?? t), ...v.topics].join(",")), [toolById]);

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
  const pickTag = (t: string) => {
    setTag(t);
    document.getElementById("recs-h")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const clearFilters = () => {
    setQ("");
    setTag("");
    setCategory("all");
  };

  return (
    <div className="recs-page">
      <header className="page-head">
        <Link to="/team" className="board-back label-l">
          <Icon name="arrow_back" size={18} /> AI Team
        </Link>
        <h1 className="display-m">Video picks</h1>
        <p className="body-l muted measure">
          Recommend a video that helped you learn, in one line. Vote for the picks you found useful, and the best rise to the top.
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
          <button type="button" className={`btn ${showForm ? "text" : "filled"} state`} aria-expanded={showForm} aria-controls="rec-form" onClick={() => setFormOpen(!showForm)}>
            <Icon name={showForm ? "close" : "add"} size={20} />
            {showForm ? "Close" : "Recommend a video"}
          </button>
        </div>
        {showForm && (
          <RecForm
            videos={videos}
            libraryById={libraryById}
            existing={byVideo}
            initialName={name}
            tagNames={tagNames}
            onShow={(id) => {
              clearFilters();
              setSort("top");
              setFormOpen(false);
              setShown(Number.MAX_SAFE_INTEGER);
              requestAnimationFrame(() => {
                const el = document.getElementById(`rec-${id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                el?.querySelector<HTMLElement>(".rec-vote")?.focus({ preventScroll: true });
              });
            }}
            onPost={async (n, cat, body) => {
              await store.post({ board: REC_BOARD, topic: cat, parentId: null, name: n, body });
              me.setName(n);
              setName(n);
              clearFilters();
              setSort("new");
              setFormOpen(false);
              await load();
            }}
          />
        )}
      </section>

      <div className="recs-layout">
        <section className="recs-list" aria-labelledby="recs-h">
          <div className="recs-tools">
            <div className="recs-search">
              <Icon name="search" size={20} />
              <input type="search" value={q} placeholder="Search picks, tags, names and videos" aria-label="Search picks" onChange={(e) => setQ(e.target.value)} />
            </div>
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
          <div className="recs-cats" role="group" aria-label="Filter by category">
            <button type="button" className="chip state" aria-pressed={category === "all"} onClick={() => setCategory("all")}>
              All <span className="rec-count">{matching.length}</span>
            </button>
            {CATEGORIES.filter((c) => counts.get(c.id) || category === c.id).map((c) => (
              <button key={c.id} type="button" className="chip state" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                <Icon name={c.icon} size={18} />
                {c.label} <span className="rec-count">{counts.get(c.id) ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="recs-head">
            <h2 id="recs-h" className="title-l">
              {posts ? `${list.length} ${list.length === 1 ? "pick" : "picks"}` : "Picks"}
            </h2>
            {tag && (
              <button type="button" className="chip state rec-active-tag" aria-pressed="true" onClick={() => setTag("")} aria-label={`Remove tag filter ${tag}`}>
                #{tag} <Icon name="close" size={16} />
              </button>
            )}
            {filtered && (
              <button type="button" className="btn text sm state" onClick={clearFilters}>
                Clear filters
              </button>
            )}
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
          {posts && list.length === 0 && !loadError && (
            <p className="body-l board-empty">
              {recs.length === 0 ? "No picks yet. Be the first to recommend a video." : filtered ? "No picks match. Try other words or clear the filters." : sort === "week" ? "No picks this week yet." : "No picks here yet."}
            </p>
          )}
          <div className="rec-grid">
            {list.slice(0, shown).map((r) => (
              <RecCard
                key={`${r.id}:${r.editedAt ?? ""}`}
                rec={r}
                rank={rankOf.get(r.id) ?? null}
                video={libraryById.get(r.videoId)}
                mine={r.mine ?? me.keyFor(r.id) !== undefined}
                voted={reacted.has(`${r.id}:${VOTE}`)}
                reported={reported.has(r.id)}
                onVote={() => vote(r)}
                onTag={pickTag}
                onEdit={async (headline, title, tags) => {
                  await store.edit(r.id, encodeRec({ headline, videoId: r.videoId, title, why: r.why, tags }));
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
          {list.length > shown && (
            <button type="button" className="btn outlined state recs-more" onClick={() => setShown(shown + PAGE)}>
              Show more ({list.length - shown} left)
            </button>
          )}
        </section>

        <aside className="recs-side" aria-label="About the picks">
          <section aria-labelledby="leaders-h">
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
          </section>
          {tagsUsed.length > 0 && (
            <section aria-labelledby="tags-h">
              <h2 id="tags-h" className="title-m">
                Popular tags
              </h2>
              <div className="rec-tag-line">
                {tagsUsed.map((t) => (
                  <button key={t.tag} type="button" className="rec-tag state" aria-pressed={tag === t.tag} onClick={() => pickTag(t.tag === tag ? "" : t.tag)}>
                    #{t.tag} <span className="rec-count">{t.count}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <section aria-labelledby="how-h">
            <h2 id="how-h" className="title-s">
              How it works
            </h2>
            <ul className="body-s rec-rules">
              <li>One vote per pick from each browser. You can take a vote back.</li>
              <li>Each video can be recommended once, so votes add up in one place.</li>
              <li>Names aren't checked, so keep it friendly. Three reports hide a pick until an editor looks.</li>
              <li>Edit or delete your own picks from the browser you posted them in.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
