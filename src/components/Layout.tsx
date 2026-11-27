import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import { SECTIONS, hrefOf, sectionOf, tabsFor } from "../data/sections";
import { useSeo } from "../lib/useSeo";
import { useThemeMode } from "../lib/theme";
import { Icon } from "./Icon";
import { PlayerProvider } from "./Player";
import { Tutor } from "./tutor/Tutor";

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

/** The main sections. A section stays lit on all its pages: "Where to start" lights Learn, "Use AI offline" Green AI. */
function NavItems() {
  const { pathname } = useLocation();
  const here = sectionOf(pathname);
  return (
    <>
      {SECTIONS.map((n) => (
        <Link key={n.to} to={n.to} className="nav-item" aria-current={here === n ? "page" : undefined}>
          <span className="pill">
            <Icon name={n.icon} />
          </span>
          {n.label}
        </Link>
      ))}
    </>
  );
}

/** Tabs for the pages inside the current section, on each of those pages. */
function SectionNav() {
  const { pathname, search } = useLocation();
  const tabs = tabsFor(pathname, search);
  const list = useRef<HTMLUListElement>(null);
  // On a phone the row scrolls sideways: bring the current tab into view.
  useEffect(() => {
    const ul = list.current;
    const on = ul?.querySelector<HTMLElement>('[aria-current="page"]');
    if (ul && on) ul.scrollLeft = on.offsetLeft - (ul.clientWidth - on.offsetWidth) / 2;
  }, [pathname, search]);
  if (!tabs) return null;
  return (
    <nav className="section-tabs" aria-label={`${tabs.section.label} pages`}>
      <ul ref={list}>
        {tabs.section.pages.map((pg) => (
          <li key={hrefOf(pg)}>
            <Link to={hrefOf(pg)} className="section-tab state" aria-current={pg === tabs.current ? "page" : undefined}>
              {pg.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
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
  useSeo();

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
        <SectionNav />
        <Outlet />
      </main>

      <footer className="footer">
        <div>
          <p className="title-s">USC AI Knowledge Hub</p>
          <p className="body-s muted">Learn AI. Use AI. Understand what's next. Built and reviewed by USC AI Knowledge Hub Fellows.</p>
        </div>
        <div className="footer-groups">
          {SECTIONS.filter((sec) => sec.pages.length).map((sec) => (
            <nav key={sec.to} className="footer-links body-s" aria-label={sec.label}>
              <p className="label-l">{sec.label}</p>
              {sec.pages.map((pg) => (
                <Link key={hrefOf(pg)} to={hrefOf(pg)}>
                  {pg.label}
                </Link>
              ))}
            </nav>
          ))}
          <nav className="footer-links body-s" aria-label="More">
            <p className="label-l">More</p>
            <a href="/feed.xml">RSS feed</a>
            <a href="https://sites.usc.edu/ai-knowledge-hub/" target="_blank" rel="noreferrer">
              Main Hub site
            </a>
          </nav>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Primary">
        <NavItems />
      </nav>
      <Tutor />
    </div>
    </PlayerProvider>
  );
}
