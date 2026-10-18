import { useState } from "react";
import { Icon } from "../Icon";
import { Linked } from "./Linked";
import { Composer } from "./Composer";
import { ago, REACTIONS } from "../../lib/board/rules";
import type { Post } from "../../lib/board/store";
import { topicById } from "../../data/team";

export interface PostActions {
  mine: (id: string) => boolean;
  reacted: Set<string>;
  reported: Set<string>;
  name: string;
  react: (id: string, emoji: string) => Promise<void>;
  report: (id: string) => Promise<void>;
  edit: (id: string, body: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reply: (parent: Post, name: string, body: string) => Promise<void>;
}

/** One post with its actions and, for a topic, its replies. */
export function PostItem({ post, replies = [], actions, showTopic }: { post: Post; replies?: Post[]; actions: PostActions; showTopic?: boolean }) {
  const [mode, setMode] = useState<"" | "reply" | "edit" | "delete" | "report">("");
  const [error, setError] = useState("");
  const topic = topicById.get(post.topic);
  const mine = actions.mine(post.id);
  const isReply = post.parentId !== null;
  const run = async (f: () => Promise<void>, done = true) => {
    setError("");
    try {
      await f();
      if (done) setMode("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (post.deleted) {
    return (
      <article className="board-post deleted" id={`post-${post.id}`}>
        <p className="body-m muted">This post was deleted.</p>
        {replies.length > 0 && <Replies replies={replies} actions={actions} />}
      </article>
    );
  }

  return (
    <article className={`board-post${isReply ? " reply" : ""}`} id={`post-${post.id}`}>
      <header className="board-post-head">
        <span className="title-m board-author">{post.name}</span>
        {mine && <span className="board-you label-m">You</span>}
        <span className="body-s muted">
          <time dateTime={post.createdAt}>{ago(post.createdAt)}</time>
          {post.editedAt && " · edited"}
        </span>
        {showTopic && topic && !isReply && (
          <span className="board-topic label-m">
            <Icon name={topic.icon} size={14} /> {topic.label}
          </span>
        )}
      </header>

      {mode === "edit" ? (
        <Composer
          initialName={post.name}
          initialBody={post.body}
          label="Edit your post"
          submitLabel="Save"
          askName={false}
          autoFocus
          onSubmit={(_, body) => actions.edit(post.id, body).then(() => setMode(""))}
          onCancel={() => setMode("")}
        />
      ) : (
        <p className="body-l board-body">
          <Linked text={post.body} />
        </p>
      )}

      <div className="board-bar">
        <div className="board-reactions" role="group" aria-label="Reactions">
          {REACTIONS.map((r) => {
            const on = actions.reacted.has(`${post.id}:${r.emoji}`);
            const n = post.reactions[r.emoji] ?? 0;
            return (
              <button
                key={r.emoji}
                type="button"
                className="board-react state"
                aria-pressed={on}
                aria-label={`${r.label}${n ? `, ${n}` : ""}`}
                title={r.label}
                onClick={() => void run(() => actions.react(post.id, r.emoji), false)}
              >
                <span aria-hidden="true">{r.emoji}</span>
                {n > 0 && <span className="label-m">{n}</span>}
              </button>
            );
          })}
        </div>
        <div className="board-links">
          {!isReply && (
            <button type="button" className="board-link label-l state" onClick={() => setMode(mode === "reply" ? "" : "reply")}>
              <Icon name="reply" size={18} /> Reply
            </button>
          )}
          {mine && (
            <>
              <button type="button" className="board-link label-l state" onClick={() => setMode("edit")}>
                <Icon name="edit" size={18} /> Edit
              </button>
              <button type="button" className="board-link label-l state" onClick={() => setMode("delete")}>
                <Icon name="delete" size={18} /> Delete
              </button>
            </>
          )}
          {!mine &&
            (actions.reported.has(post.id) ? (
              <span className="body-s muted">Reported. Thanks.</span>
            ) : (
              <button type="button" className="board-link label-l state" onClick={() => setMode("report")}>
                <Icon name="flag" size={18} /> Report
              </button>
            ))}
        </div>
      </div>

      {mode === "delete" && (
        <p className="board-confirm body-m" role="alert">
          Delete this post? This can't be undone.
          <button type="button" className="btn sm filled state" onClick={() => void run(() => actions.remove(post.id), false)}>
            Delete
          </button>
          <button type="button" className="btn sm text state" onClick={() => setMode("")}>
            Keep it
          </button>
        </p>
      )}
      {mode === "report" && (
        <p className="board-confirm body-m" role="alert">
          Report this post to the editors? Three reports hide it until someone checks.
          <button type="button" className="btn sm filled state" onClick={() => void run(() => actions.report(post.id))}>
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

      {(replies.length > 0 || mode === "reply") && (
        <div className="board-replies">
          <Replies replies={replies} actions={actions} />
          {mode === "reply" && (
            <Composer
              initialName={actions.name}
              label={`Reply to ${post.name}`}
              submitLabel="Reply"
              rows={3}
              autoFocus
              onSubmit={async (name, body) => {
                await actions.reply(post, name, body);
                setMode("");
              }}
              onCancel={() => setMode("")}
            />
          )}
        </div>
      )}
    </article>
  );
}

function Replies({ replies, actions }: { replies: Post[]; actions: PostActions }) {
  return (
    <>
      {replies.map((r) => (
        <PostItem key={r.id} post={r} actions={actions} />
      ))}
    </>
  );
}
