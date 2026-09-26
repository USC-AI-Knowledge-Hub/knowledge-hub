import { Link } from "react-router";
import { Icon } from "../components/Icon";

export function NotFound() {
  return (
    <div className="empty" style={{ marginTop: 48 }}>
      <Icon name="explore_off" size={32} />
      <h1 className="headline-m">This page doesn't exist</h1>
      <p className="body-m muted">The link may be old, or the page may have moved.</p>
      <Link to="/" className="btn tonal sm state">
        Go to the home page
      </Link>
    </div>
  );
}
