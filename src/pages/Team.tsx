import { useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { Board } from "../components/board/Board";
import { Icon } from "../components/Icon";
import { BUCKETS, COURSE_BOARDS, DATABASE, TOOLS_BOARD, boardFor, type BoardDef } from "../data/team";
import { makeStore } from "../lib/board/store";
import "../styles/team.css";

const href = (id: string) => `/team?board=${id}`;
const bucketOf = (id: number) => BUCKETS.find((b) => b.id === id);

/** The retro pop-up for jumping to another board without going back to the list. */
function Switcher({ current }: { current: BoardDef }) {
  const ref = useRef<HTMLDialogElement>(null);
  const bucket = current.bucket ? bucketOf(current.bucket) : undefined;
  return (
    <>
      <button type="button" className="team-switch state" onClick={() => ref.current?.showModal()} aria-haspopup="dialog">
        <span className="team-switch-text">
          <span className="body-s muted">Now viewing</span>
          <span className="title-m">{current.title}</span>
          {bucket && <span className="body-s muted">Bucket {bucket.id}: {bucket.name}</span>}
        </span>
        <span className="btn sm outlined team-switch-cta">
          <Icon name="swap_horiz" size={20} />
          Switch board
        </span>
      </button>
      <dialog ref={ref} className="team-dialog" aria-labelledby="team-dialog-h" onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <div className="team-dialog-body">
          <div className="team-dialog-head">
            <h2 id="team-dialog-h" className="title-l">
              Pick a board
            </h2>
            <button type="button" className="icon-btn state" aria-label="Close" onClick={() => ref.current?.close()}>
              <Icon name="close" />
            </button>
          </div>
          <div className="team-dialog-scroll">
            <ul className="team-picks">
              <li>
                <Link to={href(TOOLS_BOARD.id)} className="team-pick state" aria-current={current.id === TOOLS_BOARD.id ? "true" : undefined} onClick={() => ref.current?.close()}>
                  <span className="label-l">AI tools</span>
                  <span className="body-s muted">General board</span>
                </Link>
              </li>
            </ul>
            {BUCKETS.map((b) => (
              <section key={b.id} aria-labelledby={`pick-b${b.id}`}>
                <h3 id={`pick-b${b.id}`} className="title-s">
                  Bucket {b.id}: {b.name}
                </h3>
                <ul className="team-picks">
                  {COURSE_BOARDS.filter((c) => c.bucket === b.id).map((c) => (
                    <li key={c.id}>
                      <Link to={href(c.id)} className="team-pick state" aria-current={current.id === c.id ? "true" : undefined} onClick={() => ref.current?.close()}>
                        <span className="label-l">{c.title}</span>
                        <span className="body-s muted">{c.provider}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}

function BoardTile({ board }: { board: BoardDef }) {
  return (
    <li className="team-tile">
      <Link to={href(board.id)} className="team-tile-main state">
        <span className="team-tile-text">
          <span className="title-m">{board.title}</span>
          <span className="body-s muted">{board.provider ?? "Share tools, tips and discoveries"}</span>
        </span>
        <Icon name="arrow_forward" size={20} />
      </Link>
    </li>
  );
}

export function Team() {
  const [params, setParams] = useSearchParams();
  const board = boardFor(params.get("board"));
  const topic = board && board.topics.some((t) => t.id === params.get("topic")) ? params.get("topic") : null;
  const store = useMemo(() => makeStore(DATABASE), []);

  if (board) {
    const bucket = board.bucket ? bucketOf(board.bucket) : undefined;
    return (
      <div className="team-page">
        <header className="page-head team-hero">
          <Link to="/team" className="board-back label-l state">
            <Icon name="arrow_back" size={18} /> All boards
          </Link>
          <h1 className="display-m">{board.title}</h1>
          {board.kind === "course" ? (
            <>
              <p className="body-l">
                {board.provider}
                {bucket && ` · Bucket ${bucket.id}: ${bucket.name}`}
              </p>
              <p className="body-l measure">Ask questions, share what you learn and swap resources with other students taking this course.</p>
              {board.url && (
                <a href={board.url} target="_blank" rel="noopener noreferrer" className="btn sm outlined state team-course-link">
                  <Icon name="open_in_new" size={18} />
                  Open the course
                </a>
              )}
              <p className="body-s muted">Course pages can change, so check the link before you begin. Courses are free, but some charge for certificates.</p>
            </>
          ) : (
            <p className="body-l measure">Share what's worked, ask questions and trade tips about any AI tool, from ChatGPT to the newest one you've found.</p>
          )}
        </header>
        <Switcher current={board} />
        <Board
          key={board.id}
          store={store}
          board={board}
          topic={topic}
          onTopic={(id) => {
            const next = new URLSearchParams(params);
            if (id) next.set("topic", id);
            else next.delete("topic");
            setParams(next, { replace: true, preventScrollReset: true });
          }}
        />
        <p className="body-s muted team-foot">
          Posts are public and show the name you type. Use a personal account for AI tools, and don't share confidential or sensitive USC
          information. Anyone can report a post, and three reports hide it until an editor checks. Posts are students' own views, not advice
          from USC.
        </p>
      </div>
    );
  }

  return (
    <div className="team-page">
      <header className="page-head team-hero">
        <h1 className="display-l">AI Team</h1>
        <p className="body-l measure">
          Ask questions and share what you learn. There's a board for each course in the program, grouped by bucket, and one for AI tools in
          general. No account needed: just add a name.
        </p>
      </header>

      <section className="team-section" aria-labelledby="team-tools-h">
        <h2 id="team-tools-h" className="title-l">
          Tools
        </h2>
        <ul className="team-tiles">
          <BoardTile board={TOOLS_BOARD} />
        </ul>
      </section>

      {BUCKETS.map((b) => (
        <section key={b.id} className="team-section" aria-labelledby={`team-b${b.id}-h`}>
          <h2 id={`team-b${b.id}-h`} className="title-l">
            Bucket {b.id}: {b.name}
          </h2>
          <p className="body-m muted measure">
            {b.who}. {b.focus}.
          </p>
          <ul className="team-tiles">
            {COURSE_BOARDS.filter((c) => c.bucket === b.id).map((c) => (
              <BoardTile key={c.id} board={c} />
            ))}
          </ul>
        </section>
      ))}

      <p className="body-s muted team-foot">
        Posts are public and show the name you type. Comments are students' own views, not advice from USC. Use a personal account for AI
        tools, and don't share confidential or sensitive USC information.
      </p>
    </div>
  );
}
