import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { useThemeMode } from "../lib/theme";
import { Icon } from "./Icon";
import { PlayerProvider } from "./Player";
import { Tutor } from "./tutor/Tutor";

const NAV = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/learn", label: "Learn", icon: "school" },
  { to: "/tools", label: "Tools", icon: "handyman" },
  { to: "/watch", label: "Watch", icon: "smart_display" },
];

function Brand({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path
        fill="var(--md-sys-color-primary-container)"
        d="M50 4c7 0 10 7 16 9s13-1 17 5 0 12 2 18 9 10 9 16-7 10-9 16 2 12-2 18-11 3-17 5-9 9-16 9-10-7-16-9-13 1-17-5 0-12-2-18-9-10-9-16 7-10 9-16-2-12 2-18 11-3 17-5 9-9 16-9z"
      />
      <path fill="#FFCC00" d="M30 62h40v8H30zM38 50h24v8H38zM46 38h8v8h-8z" />
    </svg>
  );
}

function NavItems() {
  return (
    <>
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} className="nav-item">
          <span className="pill">
            <Icon name={n.icon} />
          </span>
          {n.label}
        </NavLink>
      ))}
    </>
  );
}

function SearchBox() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const [q, setQ] = useState(pathname === "/search" ? params.get("q") ?? "" : "");

  useEffect(() => {
    if (pathname !== "/search") setQ("");
  }, [pathname]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form role="search" className="search" onSubmit={submit}>
      <Icon name="search" />
      <label htmlFor="global-search" className="visually-hidden">
        Search tools, lessons and videos
      </label>
      <input id="global-search" type="search" placeholder="Search tools, lessons and videos" value={q} onChange={(e) => setQ(e.target.value)} />
    </form>
  );
}

export function Layout() {
  const { isDark, toggle } = useThemeMode();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <PlayerProvider>
    <div className="shell">
      <a href="#main" className="skip">
        Skip to content
      </a>
      <nav className="rail" aria-label="Primary">
        <Link to="/" className="brand" aria-label="USC AI Knowledge Hub home">
          <Brand size={48} />
        </Link>
        <NavItems />
      </nav>

      <header className="topbar">
        <Link to="/" className="wordmark" aria-label="USC AI Knowledge Hub home">
          <Brand size={36} />
          <span className="title-m">AI Knowledge Hub</span>
        </Link>
        <SearchBox />
        <span className="spacer" />
        <Link to="/search" className="icon-btn state mobile-only" aria-label="Search">
          <Icon name="search" />
        </Link>
        <button type="button" className="icon-btn state" onClick={toggle} aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}>
          <Icon name={isDark ? "light_mode" : "dark_mode"} />
        </button>
      </header>

      <main id="main" className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div>
          <p className="title-s">USC AI Knowledge Hub</p>
          <p className="body-s muted">Learn AI. Use AI. Understand what's next. Built and reviewed by USC AI Knowledge Hub Fellows.</p>
        </div>
        <nav className="footer-links body-s" aria-label="Footer">
          <Link to="/about">How the video library works</Link>
          <a href="https://sites.usc.edu/ai-knowledge-hub/" target="_blank" rel="noreferrer">
            Main Hub site
          </a>
        </nav>
      </footer>

      <nav className="bottom-nav" aria-label="Primary">
        <NavItems />
      </nav>
      <Tutor />
    </div>
    </PlayerProvider>
  );
}
