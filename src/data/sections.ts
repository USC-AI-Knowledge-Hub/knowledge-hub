/**
 * The site's structure in one place: the main sections in the navigation rail, and the pages inside each.
 * The rail, the tabs at the top of a section's pages (SectionNav) and the footer are all built from this, so a
 * new page added here can be found from its section, and a page that's in no section can't hide.
 */

export interface SectionPage {
  to: string;
  label: string;
  /** Deeper addresses that count as this page ("/tools/compare/chatgpt-vs-claude"). */
  prefix?: boolean;
  /** A view of the page picked by `?tab=` (the Watch page's trends and talks). */
  tab?: string;
}

export interface Section {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  /** The section's own pages, shown as tabs on each of them. The first is the section's home. */
  pages: SectionPage[];
  /** Other addresses that belong to the section but aren't tabs (a tool's page, a lesson). */
  also?: string[];
}

export const SECTIONS: Section[] = [
  { to: "/", label: "Home", icon: "home", end: true, pages: [] },
  {
    to: "/learn",
    label: "Learn",
    icon: "school",
    pages: [
      { to: "/learn", label: "Paths and lessons" },
      { to: "/learn/courses", label: "Full courses" },
      { to: "/start", label: "Where to start" },
      { to: "/prompts", label: "Prompts that work" },
      { to: "/ai-use", label: "Using AI in coursework" },
    ],
    also: ["/learn/"],
  },
  {
    to: "/tools",
    label: "Tools",
    icon: "handyman",
    pages: [
      { to: "/tools", label: "Tool map" },
      { to: "/tools/compare", label: "Compare tools", prefix: true },
      { to: "/new", label: "What's new" },
    ],
    also: ["/tools/"],
  },
  {
    to: "/watch",
    label: "Watch",
    icon: "smart_display",
    pages: [
      { to: "/watch", label: "Lessons" },
      { to: "/watch", tab: "trends", label: "AI trends" },
      { to: "/watch", tab: "talks", label: "Talks and podcasts" },
      { to: "/about", label: "How videos are chosen" },
    ],
  },
  {
    to: "/team",
    label: "AI Team",
    icon: "forum",
    pages: [
      { to: "/team", label: "Discussion boards" },
      { to: "/team/picks", label: "Video picks" },
    ],
  },
  {
    to: "/green",
    label: "Green AI",
    icon: "eco",
    pages: [
      { to: "/green", label: "Use AI lightly" },
      { to: "/offline", label: "Use AI offline" },
      { to: "/offline/assistant", label: "Offline assistant" },
    ],
  },
];

/**
 * Addresses that moved. The app redirects them, and the build writes a page at each old address so a
 * saved link still opens on GitHub Pages, which has no fallback for unknown addresses.
 */
export const MOVED: Record<string, string> = {
  "/team/test": "/team/picks",
  "/green/team": "/team",
};

const clean = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

/** Where a section page lives, with its `?tab=` if it has one. */
export const hrefOf = (page: SectionPage) => (page.tab ? `${page.to}?tab=${page.tab}` : page.to);

/** Whether an address is a section page (exactly, or under it for `prefix` pages). */
export const isPage = (page: SectionPage, path: string) => {
  const p = clean(path);
  return p === page.to || (!!page.prefix && p.startsWith(`${page.to}/`));
};

/** The section an address belongs to, if any. */
export function sectionOf(path: string): Section | undefined {
  const p = clean(path);
  if (p === "/") return SECTIONS[0];
  return (
    SECTIONS.find((s) => s.pages.some((pg) => isPage(pg, p))) ??
    SECTIONS.find((s) => s !== SECTIONS[0] && (p === s.to || s.also?.some((a) => p.startsWith(a))))
  );
}

/** The section and tab to show at the top of a page: only on the section's own pages, not on a lesson or a tool. */
export function tabsFor(path: string, search = ""): { section: Section; current: SectionPage } | undefined {
  const section = sectionOf(path);
  if (!section || section.pages.length < 2) return undefined;
  const tab = new URLSearchParams(search).get("tab") ?? undefined;
  // The most specific page wins ("/offline/assistant" over "/offline"), then the view its ?tab= names.
  const here = [...section.pages].sort((a, b) => b.to.length - a.to.length).filter((pg) => isPage(pg, path));
  const current = here.find((pg) => pg.tab === tab) ?? here.find((pg) => !pg.tab);
  return current ? { section, current } : undefined;
}
