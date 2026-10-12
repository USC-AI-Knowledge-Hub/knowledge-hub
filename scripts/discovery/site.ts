/**
 * Looking at a tool's own website, carefully: only public https pages, a short wait, a size limit and
 * no scripts run. The addresses come from other people's feeds, so nothing here trusts them.
 */

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface PageInfo {
  ok: boolean;
  status: number;
  finalUrl: string;
  title: string;
  description: string;
}

/** An https address on a public-looking host: not an IP, localhost or an internal name. */
export function isPublicHttps(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".") || /^\d+(\.\d+){3}$/.test(host) || host.includes(":") || host.startsWith("[")) return false;
  if (/(^|\.)(localhost|local|internal|lan|home|corp|intranet|test|invalid|example)$/.test(host)) return false;
  return true;
}

const meta = (html: string, attr: "name" | "property", key: string): string => {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const a = new RegExp(`${attr}\\s*=\\s*["']${key}["']`, "i").test(tag);
    const c = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag);
    if (a && c) return (c[1] ?? c[2] ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
  }
  return "";
};

export function readHead(html: string): { title: string; description: string } {
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? meta(html, "property", "og:title");
  return {
    title: t.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().slice(0, 200),
    description: (meta(html, "name", "description") || meta(html, "property", "og:description")).slice(0, 300),
  };
}

async function readLimited(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.length;
  }
  void reader.cancel().catch(() => undefined);
  return new TextDecoder().decode(Buffer.concat(chunks)).slice(0, maxBytes);
}

/**
 * Fetches a page and reads its title and description. Follows a few redirects, each checked the same
 * way. Returns null for an address that isn't safe to fetch; `ok: false` when the page didn't load.
 */
export async function fetchPage(url: string, opts: { fetchImpl?: Fetcher; timeoutMs?: number; maxBytes?: number; hops?: number } = {}): Promise<PageInfo | null> {
  const { fetchImpl = fetch, timeoutMs = 8000, maxBytes = 300_000, hops = 3 } = opts;
  let current = url;
  for (let hop = 0; hop <= hops; hop++) {
    if (!isPublicHttps(current)) return null;
    let res: Response;
    try {
      res = await fetchImpl(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "user-agent": "Mozilla/5.0 (compatible; USC-AI-Knowledge-Hub/1.0; +https://sites.usc.edu/ai-knowledge-hub/)", accept: "text/html" },
      });
    } catch {
      return { ok: false, status: 0, finalUrl: current, title: "", description: "" };
    }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) return { ok: false, status: res.status, finalUrl: current, title: "", description: "" };
      try {
        current = new URL(next, current).toString();
      } catch {
        return { ok: false, status: res.status, finalUrl: current, title: "", description: "" };
      }
      continue;
    }
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/html|xml/i.test(type)) return { ok: res.ok, status: res.status, finalUrl: current, title: "", description: "" };
    const html = await readLimited(res, maxBytes);
    return { ok: true, status: res.status, finalUrl: current, ...readHead(html) };
  }
  return { ok: false, status: 0, finalUrl: current, title: "", description: "" };
}

/** Hosts that mention a product without being its home. */
const NOT_HOMES = /(^|\.)(twitter\.com|x\.com|linkedin\.com|facebook\.com|instagram\.com|youtube\.com|youtu\.be|reddit\.com|medium\.com|substack\.com|producthunt\.com|ycombinator\.com|wikipedia\.org|techcrunch\.com|theverge\.com|venturebeat\.com|bit\.ly|t\.co|google\.com\/search)$/i;

/**
 * The product's own address among the links a post made: the one whose host or path is the product's
 * name ("higgsfield.ai", "labs.google/flow"). Returns it without tracking parameters, or null.
 */
export function pickSiteUrl(key: string, links: string[]): string | null {
  const slug = key.replace(/[^a-z0-9]/g, "");
  if (slug.length < 3) return null;
  for (const raw of links) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (!isPublicHttps(raw) || NOT_HOMES.test(host)) continue;
    const labels = host.split(".").slice(0, -1).map((l) => l.replace(/-/g, ""));
    const hostMatch = labels.some((l) => l === slug || (slug.length >= 4 && l.startsWith(slug)) || (slug.length >= 5 && l.includes(slug)));
    const firstPath = u.pathname.split("/").filter(Boolean)[0]?.toLowerCase().replace(/-/g, "") ?? "";
    const pathMatch = firstPath === slug || (slug.length >= 4 && firstPath.startsWith(slug));
    if (hostMatch || pathMatch) {
      const path = hostMatch ? "/" : `/${u.pathname.split("/").filter(Boolean)[0]}`;
      return `https://${u.hostname}${path}`;
    }
  }
  return null;
}
