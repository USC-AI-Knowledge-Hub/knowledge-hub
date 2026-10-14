import { NavLink } from "react-router";
import { Icon } from "./Icon";

/** The two parts of Green AI. Shared by both pages so they read as one section. */
export function GreenTabs() {
  return (
    <nav className="green-tabs" aria-label="Green AI sections">
      <NavLink to="/green" end className="green-tab state">
        <Icon name="eco" size={20} />
        Use AI lightly
      </NavLink>
      <NavLink to="/green/team" className="green-tab state">
        <Icon name="forum" size={20} />
        AI Team
      </NavLink>
    </nav>
  );
}
