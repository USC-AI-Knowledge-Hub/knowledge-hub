import { Link } from "react-router";
import type { DiscoveredTool } from "../data/types";
import { longDate } from "../lib/format";
import { useCatalog } from "../lib/catalogStore";
import { Icon } from "./Icon";

/** Marks a tool the daily run found and editors haven't tested. Shown wherever one appears. */
export function NotReviewed() {
  return (
    <span className="not-reviewed label-m">
      <Icon name="pending" size={16} />
      Not reviewed yet
    </span>
  );
}

/** What the page says about a tool nobody on the team has tested: where it came from, and what we don't claim. */
export function DiscoveredNotes({ tool }: { tool: DiscoveredTool }) {
  const { categoriesOf } = useCatalog();
  const cats = categoriesOf(tool);
  return (
    <section className="section" aria-labelledby="found-h">
      <h2 id="found-h" className="headline-m">
        How we found it
      </h2>
      <p className="body-m measure">
        {tool.origin === "editor"
          ? "An editor added this tool to the list."
          : "It was named in announcements from sources we follow, and the daily update listed it."}{" "}
        Nobody on the team has tested it, so this page doesn't say what it costs, how hard it is to start, or whether USC provides it. Check the
        maker's page before you rely on it.
      </p>
      {cats.length > 0 && (
        <div className="chip-row" aria-label="Categories">
          {cats.map((c) => (
            <Link key={c.id} to={`/tools?view=list&task=${c.id}`} className="chip state">
              <Icon name={c.icon} />
              {c.label}
            </Link>
          ))}
        </div>
      )}
      {tool.evidence.length > 0 && (
        <ul className="found-list">
          {tool.evidence.map((e) => (
            <li key={e.url}>
              <a href={e.url} target="_blank" rel="noreferrer" className="body-m">
                {e.title}
              </a>
              <span className="body-s muted">
                {" "}
                {e.source}, {longDate(e.date)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
