import { useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { Board } from "../components/board/Board";
import { Icon } from "../components/Icon";
import { ToolMark } from "../components/ToolMark";
import { BOARD, TEAM_TOOLS, TOPICS, teamTool, topicById } from "../data/team";
import { toolById } from "../data/tools";
import { makeStore } from "../lib/board/store";
import "../styles/team.css";

/** The retro pop-up for jumping to another tool's board without leaving the page. */
function Switcher({ current, topic }: { current: string; topic: string | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const tool = toolById.get(current);
  const href = (id: string) => `/team?tool=${id}${topic ? `&topic=${topic}` : ""}`;
  return (
    <>
      <button type="button" className="team-switch state" onClick={() => ref.current?.showModal()} aria-haspopup="dialog">
        {tool && <ToolMark tool={tool} size={32} />}
        <span className="team-switch-text">
          <span className="body-s muted">Now viewing</span>
          <span className="title-m">{tool?.name}</span>
        </span>
        <span className="btn sm outlined team-switch-cta">
          <Icon name="swap_horiz" size={20} />
          Switch tool
        </span>
      </button>
      <dialog ref={ref} className="team-dialog" aria-labelledby="team-dialog-h" onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <div className="team-dialog-body">
          <div className="team-dialog-head">
            <h2 id="team-dialog-h" className="title-l">
              Pick a tool's board
            </h2>
            <button type="button" className="icon-btn state" aria-label="Close" onClick={() => ref.current?.close()}>
              <Icon name="close" />
            </button>
          </div>
          <ul className="team-grid">
            {TEAM_TOOLS.map((id) => {
              const t = toolById.get(id);
              if (!t) return null;
              return (
                <li key={id}>
                  <Link to={href(id)} className="team-pick state" aria-current={id === current ? "true" : undefined} onClick={() => ref.current?.close()}>
                    <ToolMark tool={t} size={48} />
                    <span className="label-l">{t.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>
  );
}

export function Team() {
  const [params, setParams] = useSearchParams();
  const toolId = teamTool(params.get("tool"));
  const topic = topicById.has(params.get("topic") ?? "") ? params.get("topic") : null;
  const store = useMemo(() => makeStore(BOARD), []);
  const tool = toolId ? toolById.get(toolId) : undefined;

  if (toolId && tool) {
    return (
      <div className="team-page">
        <header className="page-head team-hero">
          <Link to="/team" className="board-back label-l state">
            <Icon name="arrow_back" size={18} /> All tools
          </Link>
          <h1 className="display-m">{tool.name} board</h1>
          <p className="body-l measure">Share what's worked, ask questions and trade tips with other students.</p>
        </header>
        <Switcher current={toolId} topic={topic} />
        <Board
          key={toolId}
          store={store}
          tool={toolId}
          topic={topic}
          onTopic={(id) => {
            const next = new URLSearchParams(params);
            if (id) next.set("topic", id);
            else next.delete("topic");
            setParams(next, { replace: true, preventScrollReset: true });
          }}
        />
        <p className="body-s muted team-foot">
          Posts are public and show the name you type, so keep private details out. Anyone can report a post, and three reports hide it until
          an editor checks. Posts are students' own views, not advice from USC or the tool's maker.
        </p>
      </div>
    );
  }

  return (
    <div className="team-page">
      <header className="page-head team-hero">
        <h1 className="display-l">AI Team</h1>
        <p className="body-l measure">
          One discussion board for each of eight tools. Share prompts, compare notes and ask what worked for other students. No account needed:
          just add a name.
        </p>
      </header>

      <ul className="team-tiles">
        {TEAM_TOOLS.map((id) => {
          const t = toolById.get(id);
          if (!t) return null;
          return (
            <li key={id} className="team-tile">
              <Link to={`/team?tool=${id}`} className="team-tile-main state">
                <ToolMark tool={t} size={48} />
                <span className="team-tile-text">
                  <span className="title-m">{t.name}</span>
                  <span className="body-s muted">Open the board</span>
                </span>
                <Icon name="arrow_forward" size={20} />
              </Link>
              <ul className="team-topics" aria-label={`${t.name} topics`}>
                {TOPICS.map((tp) => (
                  <li key={tp.id}>
                    <Link to={`/team?tool=${id}&topic=${tp.id}`} className="team-topic label-m state">
                      <Icon name={tp.icon} size={16} />
                      {tp.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      <p className="body-s muted team-foot">
        Posts are public and show the name you type, so keep private details out. Comments are students' own views, not advice from USC or the
        tool's maker.
      </p>
    </div>
  );
}
