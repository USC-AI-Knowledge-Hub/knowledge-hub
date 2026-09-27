import { Link, useParams } from "react-router";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { ToolMark } from "../components/ToolMark";
import { COST_LABEL, ToolReview, ToolVideos, UscBadge } from "../components/ToolProfile";
import { TASK_LABEL, toolById } from "../data/tools";
import { NotFound } from "./NotFound";

/** The full page for one tool. The tool map's pop-up shows the same review and videos. */
export function ToolPage() {
  const { id = "" } = useParams();
  const tool = toolById.get(id);
  if (!tool) return <NotFound />;

  return (
    <>
      <header className="page-head tool-head">
        <Link to="/tools" className="crumb">
          <Icon name="arrow_back" />
          All tools
        </Link>
        <div className="tool-hero">
          <ToolMark tool={tool} size={96} />
          <div>
            <h1 className="display-s">{tool.name}</h1>
            <p className="body-m muted">by {tool.maker}</p>
          </div>
        </div>
        <p className="headline-s measure tool-bestfor">{tool.bestFor}</p>
        <div className="tool-card-meta">
          <Level level={tool.difficulty} />
          <span className="label-m muted">{COST_LABEL[tool.cost]}</span>
          <UscBadge usc={tool.usc} />
          <span className="label-m muted">{tool.tasks.map((t) => TASK_LABEL[t]).join(", ")}</span>
        </div>
        {tool.uscNote && (
          <p className="usc-note body-m measure">
            <Icon name="school" size={20} />
            {tool.uscNote}
          </p>
        )}
        <div className="hero-actions">
          <a href={tool.url} target="_blank" rel="noreferrer" className="btn filled state">
            <Icon name="open_in_new" />
            Open {tool.name}
          </a>
          <a href="#quickstart" className="btn outlined state">
            5-minute quick start
          </a>
        </div>
      </header>

      <ToolVideos tool={tool} variant="page" />
      <ToolReview tool={tool} variant="page" />
    </>
  );
}
