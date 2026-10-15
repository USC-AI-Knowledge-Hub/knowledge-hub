import { Icon } from "../components/Icon";
import { ToolMark } from "../components/ToolMark";
import { TEAM_TOOLS, TOPICS, boardUrl, newTopicUrl } from "../data/team";
import { toolById } from "../data/tools";
import "../styles/team.css";

export function Team() {
  return (
    <div className="team-page">
      <header className="page-head team-hero">
        <h1 className="display-l">AI Team</h1>
        <p className="body-l measure">
          One discussion board for each of eight tools. Share prompts, compare notes and ask what worked for other students. The boards live
          on GitHub, so you'll need a free GitHub account to post.
        </p>
      </header>

      <ul className="team-tiles">
        {TEAM_TOOLS.map((id) => {
          const tool = toolById.get(id);
          if (!tool) return null;
          return (
            <li key={id} className="team-tile">
              <a href={boardUrl(tool.name)} target="_blank" rel="noreferrer" className="team-tile-main state">
                <ToolMark tool={tool} size={48} />
                <span className="team-tile-text">
                  <span className="title-m">{tool.name}</span>
                  <span className="body-s muted">Open the board</span>
                </span>
                <Icon name="arrow_outward" size={20} />
              </a>
              <ul className="team-topics" aria-label={`${tool.name} topics`}>
                {TOPICS.map((t) => (
                  <li key={t.id}>
                    <a href={boardUrl(tool.name, t)} target="_blank" rel="noreferrer" className="team-topic label-m state">
                      <Icon name={t.icon} size={16} />
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
              <details className="team-new">
                <summary className="label-l state">
                  <Icon name="add" size={18} />
                  Start a topic
                </summary>
                <ul>
                  {TOPICS.map((t) => (
                    <li key={t.id}>
                      <a href={newTopicUrl(tool.name, t)} target="_blank" rel="noreferrer" className="state">
                        <span className="label-l">{t.label}</span>
                        <span className="body-s muted">{t.hint}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>

      <p className="body-s muted team-foot">
        Posts are public and show your GitHub username. Use the menu on a comment to report it. Comments are students' own views, not advice
        from USC or the tool's maker.
      </p>
    </div>
  );
}
