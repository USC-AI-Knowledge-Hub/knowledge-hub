import { useCallback, useEffect, useMemo, useState } from "react";
import { Segmented } from "../Segmented";
import { Icon } from "../Icon";
import { Composer } from "./Composer";
import { PostItem, type PostActions } from "./PostItem";
import { identity } from "../../lib/board/identity";
import type { BoardStore, Post } from "../../lib/board/store";
import type { BoardDef } from "../../data/team";

type Sort = "new" | "old" | "top";

const score = (p: Post) => Object.values(p.reactions).reduce((a, b) => a + b, 0);

/** One tool's board: a box to post, the topic filter, and the conversation. */
export function Board({ store, board, topic, onTopic }: { store: BoardStore; board: BoardDef; topic: string | null; onTopic: (id: string | null) => void }) {
  const TOPICS = board.topics;
  const me = useMemo(() => identity(), []);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [composeTopic, setComposeTopic] = useState<string>(topic ?? TOPICS[0].id);
  const [reacted, setReacted] = useState(() => me.reacted());
  const [reported, setReported] = useState(() => me.reported());
  const [name, setName] = useState(() => me.name());

  const load = useCallback(async () => {
    try {
      setPosts(await store.list(board.id, topic ?? undefined));
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [store, board.id, topic]);

  useEffect(() => {
    setPosts(null);
    void load();
    if (!store.shared) return;
    const t = setInterval(() => {
      if (!document.hidden) void load();
    }, 30_000);
    return () => clearInterval(t);
  }, [load, store.shared]);
  useEffect(() => {
    if (topic) setComposeTopic(topic);
  }, [topic]);

  const actions: PostActions = {
    mine: (id) => me.keyFor(id) !== undefined,
    reacted,
    reported,
    name,
    react: async (id, emoji) => {
      const on = await store.react(id, emoji);
      const next = new Set(reacted);
      if (on) next.add(`${id}:${emoji}`);
      else next.delete(`${id}:${emoji}`);
      setReacted(next);
      me.setReacted(next);
      await load();
    },
    report: async (id) => {
      await store.report(id);
      const next = new Set(reported).add(id);
      setReported(next);
      me.setReported(next);
      await load();
    },
    edit: async (id, body) => {
      await store.edit(id, body);
      await load();
    },
    remove: async (id) => {
      await store.remove(id);
      await load();
    },
    reply: async (parent, n, body) => {
      await store.post({ board: board.id, topic: parent.topic, parentId: parent.id, name: n, body });
      me.setName(n.trim());
      setName(n.trim());
      await load();
    },
  };

  const { topLevel, repliesOf } = useMemo(() => {
    const all = posts ?? [];
    const byParent = new Map<string, Post[]>();
    for (const p of all) if (p.parentId) byParent.set(p.parentId, [...(byParent.get(p.parentId) ?? []), p]);
    // A deleted post only shows as a stub while replies still hang from it; a deleted reply never shows.
    const live = new Set(all.filter((p) => p.parentId && !p.deleted).map((p) => p.parentId));
    for (const [id, list] of byParent) byParent.set(id, list.filter((r) => !r.deleted));
    const tops = all.filter((p) => !p.parentId && (!p.deleted || live.has(p.id)));
    const dir = sort === "old" ? 1 : -1;
    tops.sort((a, b) => (sort === "top" ? score(b) - score(a) || b.createdAt.localeCompare(a.createdAt) : dir * a.createdAt.localeCompare(b.createdAt)));
    return { topLevel: tops, repliesOf: (id: string) => byParent.get(id) ?? [] };
  }, [posts, sort]);

  return (
    <div className="board">
      <div className="board-topics" role="group" aria-label="Topic">
        <button type="button" className="chip state" aria-pressed={topic === null} onClick={() => onTopic(null)}>
          All topics
        </button>
        {TOPICS.map((t) => (
          <button key={t.id} type="button" className="chip state" aria-pressed={topic === t.id} onClick={() => onTopic(t.id)}>
            <Icon name={t.icon} size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {!store.shared && (
        <p className="board-note body-m">
          <Icon name="info" size={20} /> This board isn't connected to the shared database yet, so posts stay on this device and nobody else sees them.
        </p>
      )}

      <section className="board-new" aria-labelledby="board-new-h">
        <h2 id="board-new-h" className="title-l">
          Start a topic
        </h2>
        {topic === null && (
          <div className="board-field">
            <label htmlFor="board-topic" className="label-l">
              Topic
            </label>
            <select id="board-topic" value={composeTopic} onChange={(e) => setComposeTopic(e.target.value)}>
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <Composer
          initialName={name}
          label={TOPICS.find((t) => t.id === composeTopic)?.hint ?? "Your post"}
          submitLabel="Post"
          onSubmit={async (n, body) => {
            await store.post({ board: board.id, topic: topic ?? composeTopic, parentId: null, name: n, body });
            me.setName(n.trim());
            setName(n.trim());
            await load();
          }}
        />
      </section>

      <section className="board-list" aria-labelledby="board-list-h">
        <div className="board-list-head">
          <h2 id="board-list-h" className="title-l">
            {posts ? `${topLevel.length} ${topLevel.length === 1 ? "topic" : "topics"}` : "Topics"}
          </h2>
          <Segmented<Sort>
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { value: "new", label: "Newest" },
              { value: "old", label: "Oldest" },
              { value: "top", label: "Top" },
            ]}
          />
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
        {posts && topLevel.length === 0 && !loadError && <p className="body-l board-empty">No topics here yet. Start the first one above.</p>}
        {topLevel.map((p) => (
          <PostItem key={p.id} post={p} replies={repliesOf(p.id)} actions={actions} showTopic={topic === null} />
        ))}
      </section>
    </div>
  );
}
