import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { ToolMark } from "../components/ToolMark";
import { VideoCard } from "../components/VideoCard";
import { modules } from "../data/learn";
import { tools } from "../data/tools";
import { useFeed } from "../lib/feed";

const has = (hay: string, words: string[]) => {
  const h = hay.toLowerCase();
  return words.every((w) => h.includes(w));
};

export function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const input = useRef<HTMLInputElement>(null);
  const { feed } = useFeed();

  useEffect(() => setDraft(q), [q]);
  useEffect(() => {
    if (!q) input.current?.focus();
  }, [q]);

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const toolHits = words.length ? tools.filter((t) => has(`${t.name} ${t.maker} ${t.bestFor} ${t.tasks.join(" ")}`, words)) : [];
  const moduleHits = words.length ? modules.filter((m) => has(`${m.title} ${m.summary} ${m.what} ${m.keyIdeas.join(" ")}`, words)) : [];
  const videoHits = words.length
    ? (feed?.videos ?? []).filter((v) => has(`${v.title} ${v.channel} ${v.summary ?? ""}`, words)).sort((a, b) => b.score - a.score).slice(0, 12)
    : [];
  const nothing = words.length && !toolHits.length && !moduleHits.length && !videoHits.length;

  return (
    <>
      <header className="page-head">
        <form
          role="search"
          className="search big-search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/search?q=${encodeURIComponent(draft.trim())}`, { replace: true });
          }}
        >
          <Icon name="search" />
          <label htmlFor="page-search" className="visually-hidden">
            Search
          </label>
          <input ref={input} id="page-search" type="search" placeholder="Search tools, lessons and videos" value={draft} onChange={(e) => setDraft(e.target.value)} />
        </form>
        {q && (
          <p className="body-m muted" style={{ marginTop: 16 }} aria-live="polite">
            {nothing ? `Nothing matched “${q}”. Try a tool name or a task like “slides”.` : `Results for “${q}”`}
          </p>
        )}
      </header>

      {toolHits.length > 0 && (
        <section className="section" style={{ marginTop: 32 }}>
          <h2 className="title-l section-head">Tools</h2>
          <div className="chip-row">
            {toolHits.map((t) => (
              <Link key={t.id} to={`/tools/${t.id}`} className="chip state tool-chip big">
                <ToolMark tool={t} size={24} />
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {moduleHits.length > 0 && (
        <section className="section" style={{ marginTop: 40 }}>
          <h2 className="title-l section-head">Lessons</h2>
          <div className="grid cols-auto">
            {moduleHits.map((m) => (
              <Link key={m.id} to={`/learn/${m.id}`} className="module-tile card state">
                <Level level={m.difficulty} />
                <h3 className="title-l">{m.title}</h3>
                <p className="body-m muted">{m.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {videoHits.length > 0 && (
        <section className="section" style={{ marginTop: 40 }}>
          <h2 className="title-l section-head">Videos</h2>
          <div className="grid cols-videos">
            {videoHits.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
